begin;
create function public.lyads_ingest_structure(target_workspace uuid,target_account uuid,entity_level text,entities jsonb,operation uuid)
returns integer language plpgsql security invoker set search_path='' as $$
declare item jsonb; old_data jsonb; parent_id uuid; local_id uuid; entity_table text; external_column text; key text; processed integer:=0; begin
 if not exists(select 1 from public.lyads_ad_accounts where id=target_account and workspace_id=target_workspace) then raise exception 'Unknown account' using errcode='23503'; end if;
 if entity_level not in ('campaign','adset','ad') or jsonb_typeof(entities)<>'array' then raise exception 'Invalid entities' using errcode='22023'; end if;
 for item in select * from jsonb_array_elements(entities) loop
 if coalesce(item->>'id','')!~'^[0-9]+$' or jsonb_typeof(item->'name')<>'string' then raise exception 'Invalid Meta entity' using errcode='22023'; end if;
 if entity_level='campaign' then
 select source_data into old_data from public.lyads_campaigns where workspace_id=target_workspace and ad_account_id=target_account and meta_campaign_id=item->>'id' for update;
 insert into public.lyads_campaigns(workspace_id,ad_account_id,meta_campaign_id,name,effective_status,source_data,synchronized_at)
 values(target_workspace,target_account,item->>'id',item->>'name',item->>'effective_status',item,now()) on conflict(workspace_id,ad_account_id,meta_campaign_id) do update set name=excluded.name,effective_status=excluded.effective_status,source_data=excluded.source_data,synchronized_at=now() returning id into local_id;
 elsif entity_level='adset' then
 select id into parent_id from public.lyads_campaigns where workspace_id=target_workspace and ad_account_id=target_account and meta_campaign_id=item->>'campaign_id';
 if parent_id is null then raise exception 'Missing campaign' using errcode='23503'; end if;
 select source_data into old_data from public.lyads_ad_sets where workspace_id=target_workspace and ad_account_id=target_account and meta_ad_set_id=item->>'id' for update;
 insert into public.lyads_ad_sets(workspace_id,ad_account_id,campaign_id,meta_ad_set_id,name,effective_status,source_data,synchronized_at)
 values(target_workspace,target_account,parent_id,item->>'id',item->>'name',item->>'effective_status',item,now()) on conflict(workspace_id,ad_account_id,meta_ad_set_id) do update set campaign_id=excluded.campaign_id,name=excluded.name,effective_status=excluded.effective_status,source_data=excluded.source_data,synchronized_at=now() returning id into local_id;
 else
 select id into parent_id from public.lyads_ad_sets where workspace_id=target_workspace and ad_account_id=target_account and meta_ad_set_id=item->>'adset_id';
 if parent_id is null then raise exception 'Missing ad set' using errcode='23503'; end if;
 select source_data into old_data from public.lyads_ads where workspace_id=target_workspace and ad_account_id=target_account and meta_ad_id=item->>'id' for update;
 insert into public.lyads_ads(workspace_id,ad_account_id,ad_set_id,meta_ad_id,name,effective_status,source_data,synchronized_at)
 values(target_workspace,target_account,parent_id,item->>'id',item->>'name',item->>'effective_status',item,now()) on conflict(workspace_id,ad_account_id,meta_ad_id) do update set ad_set_id=excluded.ad_set_id,name=excluded.name,effective_status=excluded.effective_status,source_data=excluded.source_data,synchronized_at=now() returning id into local_id;
 end if;
 for key in select distinct x from (select jsonb_object_keys(item) x union all select jsonb_object_keys(coalesce(old_data,'{}'))) keys loop
 if old_data->key is distinct from item->key then
 insert into public.lyads_audit_events(workspace_id,ad_account_id,origin,operation_id,entity_type,entity_id,field,before_value,after_value,stage,result)
 values(target_workspace,target_account,'meta_sync',operation,entity_level,item->>'id',key,old_data->key,item->key,'observed','succeeded') on conflict do nothing;
 end if;
 end loop;
 processed:=processed+1;
 end loop;
 return processed;
end $$;
revoke all on function public.lyads_ingest_structure(uuid,uuid,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.lyads_ingest_structure(uuid,uuid,text,jsonb,uuid) to service_role;
commit;
