begin;
create table public.lyads_meta_resources (
 workspace_id uuid not null references public.lyads_workspaces(id) on delete restrict,
 connection_id uuid not null,
 kind text not null check(kind in ('business','page','instagram','pixel','conversion_event','audience','catalog')),
 meta_id text not null,
 ad_account_id uuid,
 source_data jsonb not null check(jsonb_typeof(source_data)='object'),
 fetched_at timestamptz not null default now(),
 primary key(workspace_id,connection_id,kind,meta_id),
 foreign key(workspace_id,connection_id) references public.lyads_meta_connections(workspace_id,id) on delete cascade,
 foreign key(workspace_id,ad_account_id) references public.lyads_ad_accounts(workspace_id,id) on delete restrict
);
create index lyads_meta_resources_account_idx on public.lyads_meta_resources(workspace_id,ad_account_id);
alter table public.lyads_meta_resources enable row level security;
revoke all on public.lyads_meta_resources from public,anon,authenticated,service_role;
grant select on public.lyads_meta_resources to authenticated;
grant select,insert,update,delete on public.lyads_meta_resources to service_role;
create policy resources_read on public.lyads_meta_resources for select to authenticated using(
 (ad_account_id is not null and ad_account_id in(select lyads_private.accessible_accounts())) or
 (ad_account_id is null and lyads_private.workspace_role(workspace_id)='owner'));
create function public.lyads_checkpoint_job(target_job uuid,worker_lease uuid,checkpoint jsonb,done integer,total integer default null)
returns boolean language plpgsql security invoker set search_path='' as $$
declare affected integer; begin
 update public.lyads_jobs set payload=checkpoint,progress_done=done,progress_total=total,status='queued',attempts=0,available_at=now(),lease_token=null,lease_until=null,updated_at=now()
 where id=target_job and status='running' and lease_token=worker_lease and lease_until>now() and done>=progress_done;
 get diagnostics affected=row_count; return affected=1;
end $$;
-- Enqueue and frequency limiting are atomic; caller authorization remains in RLS
-- through a narrowly scoped private wrapper. The worker rechecks current access.
create function lyads_private.request_sync(target_account uuid,request_key text)
returns uuid language plpgsql security definer set search_path='' as $$
declare account record; job uuid; settings record; begin
 if (select auth.uid()) is null or target_account not in(select lyads_private.accessible_accounts()) then raise exception 'Access denied' using errcode='42501'; end if;
 select * into account from public.lyads_ad_accounts where id=target_account for update;
 select id into job from public.lyads_jobs where workspace_id=account.workspace_id and kind='meta.sync' and idempotency_key=request_key;
 if job is not null then return job; end if;
 if request_key is null or length(request_key) not between 1 and 200 then raise exception 'Invalid request key' using errcode='22023'; end if;
 insert into public.lyads_meta_sync_settings(workspace_id,ad_account_id) values(account.workspace_id,account.id) on conflict do nothing;
 select * into settings from public.lyads_meta_sync_settings where ad_account_id=account.id for update;
 if settings.last_manual_at>now()-interval '5 minutes' then raise exception 'Sync cooldown' using errcode='P0001'; end if;
 if exists(select 1 from public.lyads_jobs where ad_account_id=account.id and kind='meta.sync' and status in ('queued','running')) then raise exception 'Sync already pending' using errcode='P0001'; end if;
 insert into public.lyads_jobs(workspace_id,ad_account_id,requested_by,kind,idempotency_key,priority,payload)
 values(account.workspace_id,account.id,(select auth.uid()),'meta.sync',request_key,100,jsonb_build_object('connection_id',account.connection_id,'history_days',settings.history_days,'revision_days',settings.revision_days)) returning id into job;
 update public.lyads_meta_sync_settings set last_manual_at=now(),next_sync_at=now()+make_interval(mins=>interval_minutes) where ad_account_id=account.id;
 return job;
end $$;
revoke all on function lyads_private.request_sync(uuid,text) from public,anon;
grant execute on function lyads_private.request_sync(uuid,text) to authenticated;
create function public.lyads_request_sync(target_account uuid,request_key text) returns uuid language sql security invoker set search_path='' as $$ select lyads_private.request_sync(target_account,request_key); $$;
revoke all on function public.lyads_request_sync(uuid,text) from public,anon;
grant execute on function public.lyads_request_sync(uuid,text) to authenticated;
revoke all on function public.lyads_checkpoint_job(uuid,uuid,jsonb,integer,integer) from public,anon,authenticated;
grant execute on function public.lyads_checkpoint_job(uuid,uuid,jsonb,integer,integer) to service_role;
commit;

begin;
create function public.lyads_start_leased_job(target_job uuid,worker_lease uuid)
returns setof public.lyads_jobs language sql security invoker set search_path='' as $$
 update public.lyads_jobs set worker_started_at=now() where id=target_job and lease_token=worker_lease and lease_until>now() and status='running' and worker_started_at is null returning *;
$$;
revoke all on function public.lyads_start_leased_job(uuid,uuid) from public,anon,authenticated;
grant execute on function public.lyads_start_leased_job(uuid,uuid) to service_role;
commit;
