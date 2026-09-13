begin;
-- Preserve answers and selections, but reopen the page step for drafts that
-- previously skipped it. Credits already granted are left untouched.
update public.lyads_onboarding
set pages_skipped=false,
    current_step=case when current_step>=4 and cardinality(page_ids)=0 then 3 else current_step end,
    completed_at=case when cardinality(page_ids)=0 then null else completed_at end,
    reviewed_at=case when cardinality(page_ids)=0 then null else reviewed_at end,
    revision=revision+1, updated_at=now()
where pages_skipped or (current_step>=4 and cardinality(page_ids)=0);
alter table public.lyads_onboarding
  add constraint lyads_onboarding_pages_required
  check(not pages_skipped and (current_step<4 or cardinality(page_ids)>0));

create or replace function lyads_private.save_onboarding(target_workspace uuid,expected_revision integer,changes jsonb)
returns public.lyads_onboarding language plpgsql security definer set search_path='' as $$
declare d public.lyads_onboarding; old public.lyads_onboarding; v jsonb; a uuid; p text; k text; section text; field text; content jsonb; product jsonb; allowed text[]; begin
 if (select auth.uid()) is null or lyads_private.workspace_role(target_workspace) is distinct from 'owner' then raise exception 'Access denied' using errcode='42501'; end if;
 perform 1 from public.lyads_workspaces where id=target_workspace for update;
 insert into public.lyads_onboarding(workspace_id) values(target_workspace) on conflict do nothing;
 select * into d from public.lyads_onboarding where workspace_id=target_workspace for update; old:=d;
 if expected_revision is distinct from d.revision then raise exception 'Onboarding changed' using errcode='40001'; end if;
 if changes is null or jsonb_typeof(changes)<>'object' or pg_column_size(changes)>65536 then raise exception 'Invalid changes' using errcode='22023'; end if;
 for k in select jsonb_object_keys(changes) loop
 if k not in ('business_meta_id','ad_account_ids','page_ids','pages_skipped','pixels','pixels_skipped','brain','current_step','review','plan_key','complete') then raise exception 'Unknown field' using errcode='22023'; end if; end loop;
 select id into d.connection_id from public.lyads_meta_connections where workspace_id=target_workspace and revoked_at is null and connection_status in ('connected','partial') order by checked_at desc nulls last limit 1;
 if d.connection_id is distinct from old.connection_id and old.connection_id is not null then
  d.business_meta_id:=null;d.ad_account_ids:='{}';d.page_ids:='{}';d.pixels:='[]';d.pages_skipped:=false;d.pixels_skipped:=false;d.current_step:=1;d.reviewed_at:=null;d.completed_at:=null;
 end if;
 if changes?'business_meta_id' then
  p:=changes->>'business_meta_id';
  if p is null or not exists(select 1 from public.lyads_meta_resources where workspace_id=target_workspace and connection_id=d.connection_id and kind='business' and meta_id=p) then raise exception 'Select an accessible business' using errcode='22023'; end if;
  if p is distinct from d.business_meta_id then d.business_meta_id:=p;d.ad_account_ids:='{}';d.page_ids:='{}';d.pixels:='[]';d.pages_skipped:=false;d.pixels_skipped:=false;end if;
 end if;
 if changes?'ad_account_ids' then
  if jsonb_typeof(changes->'ad_account_ids')<>'array' or jsonb_array_length(changes->'ad_account_ids')>100 then raise exception 'Invalid accounts' using errcode='22023'; end if;
  select coalesce(array_agg(distinct value::uuid),'{}') into d.ad_account_ids from jsonb_array_elements_text(changes->'ad_account_ids');
  foreach a in array d.ad_account_ids loop
   if not exists(select 1 from public.lyads_business_accounts b join public.lyads_ad_accounts x on x.id=b.ad_account_id and x.workspace_id=b.workspace_id where b.workspace_id=target_workspace and b.business_meta_id=d.business_meta_id and b.connection_id=d.connection_id and b.ad_account_id=a) then raise exception 'Account outside business' using errcode='42501';end if;
  end loop;
  if d.ad_account_ids is distinct from old.ad_account_ids then d.pixels:='[]';d.pixels_skipped:=false; end if;
 end if;
 if changes?'page_ids' then
  if jsonb_typeof(changes->'page_ids')<>'array' then raise exception 'Invalid pages' using errcode='22023'; end if;
  select coalesce(array_agg(distinct value),'{}') into d.page_ids from jsonb_array_elements_text(changes->'page_ids');
  foreach p in array d.page_ids loop
   if not exists(select 1 from public.lyads_resource_links where workspace_id=target_workspace and connection_id=d.connection_id and kind='page' and meta_id=p and scope_type='business' and scope_id=d.business_meta_id) then raise exception 'Page outside business' using errcode='42501'; end if;
  end loop;
 end if;
 if changes?'pages_skipped' and changes->'pages_skipped' is distinct from 'false'::jsonb then raise exception 'Select a Facebook page' using errcode='22023';end if;
 d.pages_skipped:=false;
 if changes?'pixels_skipped' then d.pixels_skipped:=(changes->>'pixels_skipped')::boolean;end if;
 if changes?'pixels' then
  if jsonb_typeof(changes->'pixels')<>'array' then raise exception 'Invalid pixels' using errcode='22023';end if;
  for v in select * from jsonb_array_elements(changes->'pixels') loop
   if not coalesce((v->>'account_id')::uuid=any(d.ad_account_ids),false) or not exists(select 1 from public.lyads_resource_links where workspace_id=target_workspace and connection_id=d.connection_id and kind='pixel' and meta_id=v->>'pixel_id' and scope_type='account' and scope_id=v->>'account_id') then raise exception 'Pixel outside account' using errcode='42501';end if;
   if nullif(v->>'event','') is not null and not exists(select 1 from public.lyads_meta_resources r join public.lyads_resource_links l using(workspace_id,connection_id,kind,meta_id) where r.workspace_id=target_workspace and r.connection_id=d.connection_id and r.kind='conversion_event' and l.scope_type='pixel' and l.scope_id=v->>'pixel_id' and r.source_data->>'event_name'=v->>'event') then raise exception 'Event not observed' using errcode='22023'; end if;
  end loop;d.pixels:=changes->'pixels';
 end if;
 if changes?'brain' then
  if jsonb_typeof(changes->'brain')<>'object' then raise exception 'Invalid business profile' using errcode='22023';end if;
  for section,v in select * from jsonb_each(changes->'brain') loop
   if section not in ('activity','offer','market','audience','funnel','history') or jsonb_typeof(v)<>'object' then raise exception 'Invalid business section' using errcode='22023';end if;
   allowed:=case section when 'activity' then array['name','sector','type','website','social'] when 'offer' then array['products'] when 'market' then array['countries','language','seasonality'] when 'audience' then array['customer','age','problem','trigger'] when 'funnel' then array['journey','basket','conversion','delay'] else array['advertised','budget','currency','cpa','roas'] end;
   for field,content in select * from jsonb_each(v) loop
    if not field=any(allowed) then raise exception 'Unknown profile field' using errcode='22023';end if;
    if section='offer' then
     if jsonb_typeof(content)<>'array' or jsonb_array_length(content)>20 then raise exception 'Invalid products' using errcode='22023';end if;
     for product in select * from jsonb_array_elements(content) loop
      if jsonb_typeof(product)<>'object' then raise exception 'Invalid product' using errcode='22023';end if;
      if exists(select 1 from jsonb_each(product) f where f.key not in ('name','argument','objections','price','currency','url') or jsonb_typeof(f.value)<>'string' or length(f.value#>>'{}')>4000) then raise exception 'Invalid product field' using errcode='22023';end if;
     end loop;
    elsif jsonb_typeof(content)<>'string' or length(content#>>'{}')>4000 then raise exception 'Invalid profile value' using errcode='22023';end if;
   end loop;
   d.brain:=jsonb_set(d.brain,array[section],coalesce(d.brain->section,'{}')||v,true);
   d.provenance:=jsonb_set(d.provenance,array[section],jsonb_build_object('source','user','updated_at',now(),'user_id',(select auth.uid())),true);
  end loop;
 end if;
 if d.brain is distinct from old.brain or d.business_meta_id is distinct from old.business_meta_id or d.ad_account_ids is distinct from old.ad_account_ids or d.page_ids is distinct from old.page_ids or d.pixels is distinct from old.pixels or d.pages_skipped is distinct from old.pages_skipped or d.pixels_skipped is distinct from old.pixels_skipped then d.reviewed_at:=null;d.completed_at:=null;end if;
 if d.completed_at is null and d.current_step=10 then d.current_step:=8;end if;
 if changes?'current_step' then d.current_step:=(changes->>'current_step')::integer;end if;
 if d.current_step>=3 and (d.connection_id is null or d.business_meta_id is null) then raise exception 'Select a Business Manager' using errcode='22023';end if;
 if d.current_step>=3 and cardinality(d.ad_account_ids)=0 then raise exception 'Select an advertising account' using errcode='22023';end if;
 if d.current_step>=4 and cardinality(d.page_ids)=0 then raise exception 'Select a Facebook page' using errcode='22023';end if;
 if d.current_step>=5 and jsonb_array_length(d.pixels)=0 and not d.pixels_skipped then raise exception 'Choose pixels or explicitly skip' using errcode='22023';end if;
 if changes->>'review'='true' then d.reviewed_at:=now();end if;
 if changes?'plan_key' then d.plan_key:=changes->>'plan_key';end if;
 if changes->>'complete'='true' then
  if d.connection_id is null or d.business_meta_id is null or cardinality(d.ad_account_ids)=0 or cardinality(d.page_ids)=0 or (jsonb_array_length(d.pixels)=0 and not d.pixels_skipped) then raise exception 'Finish resource selections' using errcode='22023';end if;
  if d.reviewed_at is null or nullif(trim(d.brain#>>'{activity,name}'),'') is null or d.plan_key is distinct from 'free' then raise exception 'Complete the profile and choose the free plan; payments are unavailable' using errcode='22023';end if;
  if cardinality(d.ad_account_ids)>1 then raise exception 'Free plan supports one account' using errcode='22023';end if;
  if exists(select 1 from public.lyads_credit_subscriptions where workspace_id=target_workspace and plan_key<>'free') then raise exception 'Existing paid subscription' using errcode='22023';end if;
  insert into public.lyads_credit_subscriptions(workspace_id,plan_key,monthly_quota,next_period_at,enabled) values(target_workspace,'free',60,now()+interval '1 month',true) on conflict(workspace_id) do nothing;
  perform public.lyads_grant_credits(target_workspace,'onboarding:free','monthly',60,now()+interval '1 month');
  d.completed_at:=coalesce(old.completed_at,now());d.current_step:=10;
 end if;
 d.updated_by:=(select auth.uid());d.updated_at:=now();d.revision:=d.revision+1;
 update public.lyads_onboarding set connection_id=d.connection_id,business_meta_id=d.business_meta_id,ad_account_ids=d.ad_account_ids,page_ids=d.page_ids,pixels=d.pixels,pages_skipped=d.pages_skipped,pixels_skipped=d.pixels_skipped,brain=d.brain,provenance=d.provenance,current_step=d.current_step,revision=d.revision,reviewed_at=d.reviewed_at,plan_key=d.plan_key,completed_at=d.completed_at,updated_at=d.updated_at,updated_by=d.updated_by where workspace_id=target_workspace returning * into d;
 return d;
end $$;

commit;
