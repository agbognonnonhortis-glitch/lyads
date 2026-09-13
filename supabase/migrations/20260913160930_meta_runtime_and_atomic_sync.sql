begin;
create unique index lyads_one_active_sync_idx on public.lyads_jobs(ad_account_id) where kind='meta.sync' and status in ('queued','running');
alter table public.lyads_ad_accounts add column business_meta_id text, add column account_status integer;

-- The encryption key is generated inside Supabase, never sent through a shell,
-- migration literal, browser or log. Local PGlite does not provide Vault.
do $$ begin
 if exists(select 1 from pg_extension where extname='supabase_vault') then
  if not exists(select 1 from vault.secrets where name='LYADS_META_TOKEN_KEY_V1') then
   perform vault.create_secret(encode(extensions.gen_random_bytes(32),'base64'),'LYADS_META_TOKEN_KEY_V1','Lyads AES-GCM token encryption v1');
  end if;
 end if;
end $$;
create function public.lyads_meta_encryption_key() returns text language plpgsql security invoker set search_path='' as $$
declare result text; begin
 select decrypted_secret into result from vault.decrypted_secrets where name='LYADS_META_TOKEN_KEY_V1';
 if result is null then raise exception 'Encryption unavailable'; end if; return result;
end $$;
revoke all on function public.lyads_meta_encryption_key() from public,anon,authenticated;
grant execute on function public.lyads_meta_encryption_key() to service_role;

-- Pages are invisible until the whole import succeeds. A revised empty result
-- replaces old data too; interrupted imports never expose mixed generations.
create table public.lyads_insight_staging (like public.lyads_insight_snapshots including defaults including constraints);
alter table public.lyads_insight_staging add column job_id uuid not null references public.lyads_jobs(id) on delete cascade;
alter table public.lyads_insight_staging add primary key(job_id,deduplication_key);
alter table public.lyads_insight_staging enable row level security;
revoke all on public.lyads_insight_staging from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.lyads_insight_staging to service_role;

create function public.lyads_stage_insights(target_job uuid,worker_lease uuid,source_rows jsonb,checkpoint jsonb,done integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare j public.lyads_jobs; item public.lyads_insight_staging; begin
 select * into j from public.lyads_jobs where id=target_job for update;
 if j.id is null or j.status<>'running' or j.lease_token is distinct from worker_lease or j.lease_until<=now() then return false; end if;
 if jsonb_typeof(source_rows)<>'array' then raise exception 'Invalid rows'; end if;
 for item in select * from jsonb_populate_recordset(null::public.lyads_insight_staging,source_rows) loop
  if item.workspace_id is distinct from j.workspace_id or item.ad_account_id is distinct from j.ad_account_id then raise exception 'Scope mismatch' using errcode='42501'; end if;
  item.id:=gen_random_uuid(); item.job_id:=j.id;
  insert into public.lyads_insight_staging select item.* on conflict(job_id,deduplication_key) do update set metrics=excluded.metrics,fetched_at=excluded.fetched_at;
 end loop;
 if not public.lyads_checkpoint_job(target_job,worker_lease,checkpoint,done) then raise exception 'Lease expired'; end if;
 return true;
end $$;
create function public.lyads_complete_sync(target_job uuid,worker_lease uuid,period_start date,period_end date)
returns boolean language plpgsql security invoker set search_path='' as $$
declare j public.lyads_jobs; begin
 select * into j from public.lyads_jobs where id=target_job for update;
 if j.id is null or j.kind<>'meta.sync' or j.status<>'running' or j.lease_token is distinct from worker_lease or j.lease_until<=now() then return false; end if;
 if period_start is null or period_end is null or period_end<period_start or period_end-period_start>89 then raise exception 'Invalid period'; end if;
 if exists(select 1 from public.lyads_insight_staging where job_id=j.id and (date_start<period_start or date_stop>period_end)) then raise exception 'Invalid staged period'; end if;
 delete from public.lyads_insight_snapshots where workspace_id=j.workspace_id and ad_account_id=j.ad_account_id and date_start>=period_start and date_stop<=period_end;
 insert into public.lyads_insight_snapshots(id,workspace_id,ad_account_id,sync_run_id,campaign_id,ad_set_id,ad_id,level,date_start,date_stop,query_context,deduplication_key,currency,metrics,fetched_at)
 select id,workspace_id,ad_account_id,sync_run_id,campaign_id,ad_set_id,ad_id,level,date_start,date_stop,query_context,deduplication_key,currency,metrics,fetched_at from public.lyads_insight_staging where job_id=j.id;
 delete from public.lyads_insight_staging where job_id=j.id;
 update public.lyads_sync_runs set status='succeeded',completed_at=now(),error_code=null where workspace_id=j.workspace_id and ad_account_id=j.ad_account_id and request_key=j.id::text;
 update public.lyads_ad_accounts set synchronized_at=now() where id=j.ad_account_id and workspace_id=j.workspace_id;
 return public.lyads_finish_job(j.id,worker_lease,true,jsonb_build_object('date_start',period_start,'date_stop',period_end,'synchronized_at',now(),'rows_processed',j.progress_done));
end $$;
revoke all on function public.lyads_stage_insights(uuid,uuid,jsonb,jsonb,integer),public.lyads_complete_sync(uuid,uuid,date,date) from public,anon,authenticated;
grant execute on function public.lyads_stage_insights(uuid,uuid,jsonb,jsonb,integer),public.lyads_complete_sync(uuid,uuid,date,date) to service_role;
commit;
