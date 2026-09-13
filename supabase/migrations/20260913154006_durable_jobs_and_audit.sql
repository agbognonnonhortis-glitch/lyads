begin;
create table public.lyads_jobs (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.lyads_workspaces(id) on delete restrict,
 ad_account_id uuid,
 requested_by uuid references auth.users(id) on delete set null,
 kind text not null check(kind in ('meta.discover','meta.sync','meta.refresh_permissions')),
 idempotency_key text not null check(length(idempotency_key) between 1 and 200),
 priority smallint not null default 0 check(priority between 0 and 100),
 status text not null default 'queued' check(status in ('queued','running','succeeded','failed','cancelled')),
 payload jsonb not null default '{}' check(jsonb_typeof(payload)='object'),
 result jsonb,
 progress_done integer not null default 0 check(progress_done>=0),
 progress_total integer check(progress_total>=progress_done),
 attempts integer not null default 0 check(attempts>=0),
 max_attempts integer not null default 5 check(max_attempts between 1 and 10),
 available_at timestamptz not null default now(),
 lease_token uuid,
 worker_started_at timestamptz,
 lease_until timestamptz,
 error_code text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(workspace_id,kind,idempotency_key),
 foreign key(workspace_id,ad_account_id) references public.lyads_ad_accounts(workspace_id,id) on delete restrict
);
create index lyads_jobs_claim_idx on public.lyads_jobs(priority desc,available_at,created_at) where status in ('queued','running');
create index lyads_jobs_account_idx on public.lyads_jobs(workspace_id,ad_account_id,created_at desc);
create index lyads_jobs_actor_idx on public.lyads_jobs(requested_by);
alter table public.lyads_jobs enable row level security;
revoke all on public.lyads_jobs from public,anon,authenticated,service_role;
grant select(id,workspace_id,ad_account_id,requested_by,kind,priority,status,result,progress_done,progress_total,attempts,error_code,created_at,updated_at) on public.lyads_jobs to authenticated;
grant select,insert,update,delete on public.lyads_jobs to service_role;
create policy job_read on public.lyads_jobs for select to authenticated using(
 (ad_account_id is not null and ad_account_id in(select lyads_private.accessible_accounts())) or
 (ad_account_id is null and lyads_private.workspace_role(workspace_id) is not null and requested_by=(select auth.uid())));

create table public.lyads_audit_events (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.lyads_workspaces(id) on delete restrict,
 ad_account_id uuid,
 actor_id uuid references auth.users(id) on delete set null,
 origin text not null check(origin in ('user','agent','rule','meta_sync')),
 operation_id uuid not null,
 entity_type text not null,
 entity_id text not null,
 field text,
 before_value jsonb,
 after_value jsonb,
 stage text not null check(stage in ('intent','result','observed')),
 result text not null check(result in ('pending','succeeded','failed','unknown')),
 error_code text,
 created_at timestamptz not null default now(),
 foreign key(workspace_id,ad_account_id) references public.lyads_ad_accounts(workspace_id,id) on delete restrict,
 unique(operation_id,entity_type,entity_id,field,stage)
);
create index lyads_audit_account_time_idx on public.lyads_audit_events(workspace_id,ad_account_id,created_at desc);
create index lyads_audit_actor_idx on public.lyads_audit_events(actor_id);
alter table public.lyads_audit_events enable row level security;
revoke all on public.lyads_audit_events from public,anon,authenticated,service_role;
grant select on public.lyads_audit_events to authenticated;
grant select,insert on public.lyads_audit_events to service_role;
create policy audit_read on public.lyads_audit_events for select to authenticated using(
 (ad_account_id is not null and ad_account_id in(select lyads_private.accessible_accounts())) or
 (ad_account_id is null and lyads_private.workspace_role(workspace_id) in ('owner','admin')));

create table public.lyads_notifications (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.lyads_workspaces(id) on delete restrict,
 ad_account_id uuid,
 user_id uuid not null references auth.users(id) on delete cascade,
 event_key text not null,
 kind text not null,
 message text not null,
 read_at timestamptz,
 created_at timestamptz not null default now(),
 unique(user_id,event_key),
 foreign key(workspace_id,ad_account_id) references public.lyads_ad_accounts(workspace_id,id) on delete restrict
);
create index lyads_notifications_user_idx on public.lyads_notifications(user_id,created_at desc);
create index lyads_notifications_account_idx on public.lyads_notifications(workspace_id,ad_account_id);
alter table public.lyads_notifications enable row level security;
revoke all on public.lyads_notifications from public,anon,authenticated,service_role;
grant select,update(read_at) on public.lyads_notifications to authenticated;
grant select,insert,update,delete on public.lyads_notifications to service_role;
create policy notification_read on public.lyads_notifications for select to authenticated using(user_id=(select auth.uid()) and lyads_private.workspace_role(workspace_id) is not null and (ad_account_id is null or ad_account_id in(select lyads_private.accessible_accounts())));
create policy notification_mark_read on public.lyads_notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create function public.lyads_claim_job(lease_seconds integer default 60)
returns setof public.lyads_jobs language plpgsql security invoker set search_path='' as $$
begin
 if lease_seconds not between 10 and 300 then raise exception 'Invalid lease' using errcode='22023'; end if;
 update public.lyads_jobs set status='failed',error_code='RETRY_EXHAUSTED',updated_at=now(),lease_token=null,lease_until=null
 where status='running' and lease_until<now() and attempts>=max_attempts;
 return query with candidate as (
 select id from public.lyads_jobs where available_at<=now() and attempts<max_attempts
 and (status='queued' or (status='running' and lease_until<now()))
 order by priority desc,available_at,created_at for update skip locked limit 1
 ) update public.lyads_jobs j set status='running',worker_started_at=null,attempts=j.attempts+1,lease_token=gen_random_uuid(),lease_until=now()+make_interval(secs=>lease_seconds),updated_at=now()
 from candidate c where j.id=c.id returning j.*;
end $$;
create function public.lyads_finish_job(target_job uuid,worker_lease uuid,success boolean,job_result jsonb default null,failure_code text default null,retry_seconds integer default null)
returns boolean language plpgsql security invoker set search_path='' as $$
declare affected integer; begin
 if retry_seconds is not null and retry_seconds not between 1 and 86400 then raise exception 'Invalid retry delay' using errcode='22023'; end if;
 update public.lyads_jobs set status=case when success then 'succeeded' when retry_seconds is not null and attempts<max_attempts then 'queued' else 'failed' end,
 result=job_result,error_code=case when success then null else failure_code end,
 available_at=case when retry_seconds is not null then now()+make_interval(secs=>retry_seconds) else available_at end,
 lease_token=null,lease_until=null,updated_at=now()
 where id=target_job and status='running' and lease_token=worker_lease and lease_until>now();
 get diagnostics affected=row_count; return affected=1;
end $$;
create function public.lyads_job_progress(target_job uuid,worker_lease uuid,done integer,total integer default null)
returns boolean language plpgsql security invoker set search_path='' as $$
declare affected integer; begin
 update public.lyads_jobs set progress_done=done,progress_total=total,updated_at=now(),lease_until=now()+interval '60 seconds'
 where id=target_job and status='running' and lease_token=worker_lease and lease_until>now() and done>=progress_done;
 get diagnostics affected=row_count; return affected=1;
end $$;
revoke all on function public.lyads_claim_job(integer),public.lyads_finish_job(uuid,uuid,boolean,jsonb,text,integer),public.lyads_job_progress(uuid,uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.lyads_claim_job(integer),public.lyads_finish_job(uuid,uuid,boolean,jsonb,text,integer),public.lyads_job_progress(uuid,uuid,integer,integer) to service_role;
commit;
