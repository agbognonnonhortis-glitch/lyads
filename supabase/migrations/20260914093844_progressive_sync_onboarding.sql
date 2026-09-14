begin;
-- Preserve the lease boundary. Expose safe progress only, never the job payload.
create or replace function public.lyads_checkpoint_job(target_job uuid,worker_lease uuid,checkpoint jsonb,done integer,total integer default null)
returns boolean language plpgsql security invoker set search_path='' as $$
declare affected integer; begin
 update public.lyads_jobs set payload=checkpoint,progress_done=done,progress_total=total,status='queued',attempts=0,available_at=now(),lease_token=null,lease_until=null,updated_at=now(),
 result=case when kind='meta.sync' then jsonb_build_object('sync_progress',jsonb_build_object(
 'phase',case coalesce((checkpoint->>'stage')::integer,0) when 0 then 'campaigns' when 1 then 'adsets' when 2 then 'ads' else 'metrics' end,
 'completed_slices',coalesce((checkpoint->>'completed_slices')::integer,0),
 'total_slices',case when jsonb_typeof(checkpoint->'windows')='array' then jsonb_array_length(checkpoint->'windows')*12 else null end,
 'published_at',checkpoint->>'published_at')) else result end
 where id=target_job and status='running' and lease_token=worker_lease and lease_until>now() and done>=progress_done;
 get diagnostics affected=row_count; return affected=1;
end $$;

-- Publish only a complete level/breakdown/week, after its last pagination page.
-- Keep staging for the final atomic replacement of the full 90-day import.
create function public.lyads_stage_insights_page(target_job uuid,worker_lease uuid,source_rows jsonb,checkpoint jsonb,done integer,completed_slice jsonb default null)
returns boolean language plpgsql security invoker set search_path='' as $$
declare j public.lyads_jobs; lo date; hi date; slice_level text; split text; begin
 select * into j from public.lyads_jobs where id=target_job for update;
 if j.id is null or j.kind<>'meta.sync' or j.status<>'running' or j.lease_token is distinct from worker_lease or j.lease_until<=now() then return false; end if;
 if completed_slice is not null then
  lo:=(completed_slice->>'since')::date; hi:=(completed_slice->>'until')::date;
  slice_level:=completed_slice->>'level'; split:=completed_slice->>'breakdowns';
  if lo is null or hi is null or hi<lo or hi-lo>6 or slice_level is null or slice_level not in ('account','campaign','ad_set','ad') or split is null or split not in ('','publisher_platform,platform_position','age,gender') or nullif(checkpoint->>'after','') is not null then raise exception 'Invalid completed slice'; end if;
  if exists(select 1 from jsonb_array_elements(source_rows) r where r->>'level' is distinct from slice_level or coalesce(r->'query_context'->>'breakdowns','')<>split or (r->>'date_start')::date<lo or (r->>'date_stop')::date>hi) then raise exception 'Invalid slice rows'; end if;
  checkpoint:=checkpoint||jsonb_build_object('published_at',now());
 end if;
 if not public.lyads_stage_insights(target_job,worker_lease,source_rows,checkpoint,done) then return false; end if;
 if completed_slice is not null then
  delete from public.lyads_insight_snapshots where workspace_id=j.workspace_id and ad_account_id=j.ad_account_id and level=slice_level and coalesce(query_context->>'breakdowns','')=split and date_start>=lo and date_stop<=hi;
  insert into public.lyads_insight_snapshots(id,workspace_id,ad_account_id,sync_run_id,campaign_id,ad_set_id,ad_id,level,date_start,date_stop,query_context,deduplication_key,currency,metrics,fetched_at)
  select id,workspace_id,ad_account_id,sync_run_id,campaign_id,ad_set_id,ad_id,level,date_start,date_stop,query_context,deduplication_key,currency,metrics,fetched_at from public.lyads_insight_staging where job_id=j.id and level=slice_level and coalesce(query_context->>'breakdowns','')=split and date_start>=lo and date_stop<=hi;
 end if;
 return true;
end $$;
revoke all on function public.lyads_stage_insights_page(uuid,uuid,jsonb,jsonb,integer,jsonb) from public,anon,authenticated;
grant execute on function public.lyads_stage_insights_page(uuid,uuid,jsonb,jsonb,integer,jsonb) to service_role;

-- Selection is already validated by save_onboarding. Queue atomically with it,
-- independent of the browser, page/pixel choices, website analysis or plan.
create function lyads_private.start_selected_account_sync() returns trigger language plpgsql security definer set search_path='' as $$
declare acct public.lyads_ad_accounts; cfg public.lyads_meta_sync_settings; begin
 if new.current_step<3 or new.business_meta_id is null or cardinality(new.ad_account_ids)=0 then return new; end if;
 if old.current_step>=3 and old.ad_account_ids=new.ad_account_ids and old.connection_id is not distinct from new.connection_id and old.business_meta_id is not distinct from new.business_meta_id then return new; end if;
 if (select auth.uid()) is null or new.updated_by is distinct from (select auth.uid()) or not exists(select 1 from public.lyads_workspaces where id=new.workspace_id and owner_id=(select auth.uid())) then raise exception 'Access denied' using errcode='42501'; end if;
 for acct in select a.* from public.lyads_ad_accounts a join public.lyads_business_accounts b on b.workspace_id=a.workspace_id and b.ad_account_id=a.id and b.connection_id=a.connection_id where a.workspace_id=new.workspace_id and a.id=any(new.ad_account_ids) and a.connection_id=new.connection_id and b.business_meta_id=new.business_meta_id for update of a loop
  insert into public.lyads_meta_sync_settings(workspace_id,ad_account_id) values(acct.workspace_id,acct.id) on conflict do nothing;
  select * into cfg from public.lyads_meta_sync_settings where ad_account_id=acct.id;
  if not exists(select 1 from public.lyads_jobs where ad_account_id=acct.id and kind='meta.sync' and status in ('queued','running')) then
   insert into public.lyads_jobs(workspace_id,ad_account_id,requested_by,kind,idempotency_key,priority,payload)
   values(acct.workspace_id,acct.id,new.updated_by,'meta.sync','onboarding:'||new.workspace_id||':'||new.revision||':'||acct.id,100,jsonb_build_object('connection_id',acct.connection_id,'history_days',cfg.history_days,'revision_days',cfg.revision_days,'sync_plan',2)) on conflict do nothing;
  end if;
  update public.lyads_meta_sync_settings set enabled=true,next_sync_at=now()+make_interval(mins=>interval_minutes) where ad_account_id=acct.id;
 end loop;
 return new;
end $$;
revoke all on function lyads_private.start_selected_account_sync() from public,anon,authenticated;
create trigger lyads_onboarding_start_sync after update on public.lyads_onboarding for each row execute function lyads_private.start_selected_account_sync();
-- Same worker/concurrency/quota bounds; reduce the idle delay between pages.
do $$ begin
 if exists(select 1 from pg_extension where extname='pg_cron') and exists(select 1 from pg_extension where extname='pg_net') then
  perform cron.schedule('lyads-dispatch','2 seconds','select public.lyads_dispatch_jobs()');
 end if;
end $$;
commit;
