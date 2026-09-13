begin;
create table lyads_private.runtime_settings (
 singleton boolean primary key default true check(singleton),
 worker_url text check(worker_url ~ '^https://[a-z]+[.]supabase[.]co/functions/v1/lyads-worker$'),
 enabled boolean not null default false
);
alter table lyads_private.runtime_settings enable row level security;
revoke all on lyads_private.runtime_settings from public,anon,authenticated;
grant select,update,insert on lyads_private.runtime_settings to service_role;
insert into lyads_private.runtime_settings(singleton) values(true);
create function public.lyads_schedule_due_jobs() returns void language plpgsql security invoker set search_path='' as $$
declare setting record; begin
 delete from public.lyads_meta_oauth_states where expires_at<now();
 for setting in select s.*,a.connection_id,w.owner_id from public.lyads_meta_sync_settings s join public.lyads_ad_accounts a on a.id=s.ad_account_id join public.lyads_workspaces w on w.id=s.workspace_id join public.lyads_meta_connections c on c.id=a.connection_id where s.enabled and s.next_sync_at<=now() and c.revoked_at is null and c.connection_status in ('connected','partial') and (c.expires_at is null or c.expires_at>now()) and (c.data_access_expires_at is null or c.data_access_expires_at>now()) order by s.next_sync_at for update of s skip locked limit 50 loop
  if not exists(select 1 from public.lyads_jobs where ad_account_id=setting.ad_account_id and kind='meta.sync' and status in ('queued','running')) then
   insert into public.lyads_jobs(workspace_id,ad_account_id,requested_by,kind,idempotency_key,priority,payload) values(setting.workspace_id,setting.ad_account_id,setting.owner_id,'meta.sync','scheduled:'||setting.ad_account_id||':'||setting.next_sync_at,10,jsonb_build_object('connection_id',setting.connection_id,'history_days',setting.history_days,'revision_days',setting.revision_days)) on conflict do nothing;
  end if;
  update public.lyads_meta_sync_settings set next_sync_at=now()+make_interval(mins=>interval_minutes) where ad_account_id=setting.ad_account_id;
 end loop;
 -- Permissions may be withdrawn before the nominal token expiry.
 insert into public.lyads_jobs(workspace_id,requested_by,kind,idempotency_key,priority,payload)
 select c.workspace_id,w.owner_id,'meta.refresh_permissions','permissions:'||c.id||':'||to_char(now() at time zone 'UTC','YYYY-MM-DD'),5,jsonb_build_object('connection_id',c.id)
 from public.lyads_meta_connections c join public.lyads_workspaces w on w.id=c.workspace_id where c.revoked_at is null and c.connection_status in ('connected','partial') and (c.checked_at is null or c.checked_at<now()-interval '1 day') on conflict do nothing;
 update public.lyads_meta_connections set connection_status='expired' where revoked_at is null and ((expires_at is not null and expires_at<=now()) or (data_access_expires_at is not null and data_access_expires_at<=now()));
 insert into public.lyads_notifications(workspace_id,user_id,event_key,kind,message)
 select c.workspace_id,w.owner_id,'expiry:'||c.id||':'||coalesce(c.expires_at::text,c.data_access_expires_at::text,c.checked_at::text),'meta.reconnect','La connexion Meta a expiré. Reconnectez votre compte pour reprendre la synchronisation.'
 from public.lyads_meta_connections c join public.lyads_workspaces w on w.id=c.workspace_id where c.connection_status='expired' on conflict(user_id,event_key) do nothing;
 delete from public.lyads_insight_staging s using public.lyads_jobs j where s.job_id=j.id and j.status in ('failed','cancelled') and j.updated_at<now()-interval '1 day';
end $$;
create function public.lyads_dispatch_jobs() returns integer language plpgsql security invoker set search_path='' as $$
declare endpoint text; active_count integer; dispatched integer:=0; j record; begin
 select worker_url into endpoint from lyads_private.runtime_settings where singleton and enabled;
 if endpoint is null then return 0; end if;
 select count(*) into active_count from public.lyads_jobs where status='running' and lease_until>now();
 if active_count>=4 then return 0; end if;
 for i in 1..least(2,4-active_count) loop
  select * into j from public.lyads_claim_job(60);
  if j.id is null then exit; end if;
  perform net.http_post(url:=endpoint,headers:='{"Content-Type":"application/json"}'::jsonb,body:=jsonb_build_object('jobId',j.id,'leaseToken',j.lease_token),timeout_milliseconds:=45000);
  dispatched:=dispatched+1;
 end loop; return dispatched;
end $$;
revoke all on function public.lyads_schedule_due_jobs(),public.lyads_dispatch_jobs() from public,anon,authenticated;
grant execute on function public.lyads_schedule_due_jobs(),public.lyads_dispatch_jobs() to service_role;
-- Hosted Supabase supports both extensions. Local PGlite tests the queue logic
-- independently; extension transport is verified on the remote deployment.
do $$ begin
 if exists(select 1 from pg_available_extensions where name='pg_cron') and exists(select 1 from pg_available_extensions where name='pg_net') then
  create extension if not exists pg_cron;
  create extension if not exists pg_net with schema extensions;
  revoke all on net.http_request_queue,net._http_response from public,anon,authenticated;
  perform cron.schedule('lyads-dispatch','5 seconds','select public.lyads_dispatch_jobs()');
  perform cron.schedule('lyads-schedule','* * * * *','select public.lyads_schedule_due_jobs()');
  perform cron.schedule('lyads-credit-periods','0 * * * *','select public.lyads_renew_credit_periods(); select public.lyads_expire_credits()');
 end if;
end $$;
commit;
