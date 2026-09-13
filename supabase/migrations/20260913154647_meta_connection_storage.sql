begin;
alter table public.lyads_meta_connections add column data_access_expires_at timestamptz;
alter table public.lyads_meta_connections add column checked_at timestamptz;
alter table public.lyads_meta_connections add column permission_status jsonb not null default '{}' check(jsonb_typeof(permission_status)='object');
alter table public.lyads_meta_connections add column connection_status text not null default 'connected' check(connection_status in ('connected','partial','expired','revoked','error'));
create table public.lyads_meta_credentials (
 connection_id uuid primary key references public.lyads_meta_connections(id) on delete cascade,
 ciphertext text not null,
 key_version text not null,
 updated_at timestamptz not null default now()
);
create table public.lyads_meta_oauth_states (
 state_hash text primary key check(length(state_hash)=64),
 workspace_id uuid not null references public.lyads_workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
create index lyads_meta_states_workspace_idx on public.lyads_meta_oauth_states(workspace_id);
create index lyads_meta_states_user_idx on public.lyads_meta_oauth_states(user_id);
create index lyads_meta_states_expiry_idx on public.lyads_meta_oauth_states(expires_at);
create table public.lyads_meta_quota (
 bucket text primary key,
 next_request_at timestamptz not null default now(),
 blocked_until timestamptz,
 consumption jsonb,
 updated_at timestamptz not null default now()
);
create table public.lyads_meta_sync_settings (
 workspace_id uuid not null,
 ad_account_id uuid primary key,
 history_days integer not null default 90 check(history_days between 1 and 730),
 revision_days integer not null default 7 check(revision_days between 1 and 90),
 interval_minutes integer not null default 360 check(interval_minutes between 60 and 10080),
 next_sync_at timestamptz not null default now(),
 last_manual_at timestamptz,
 enabled boolean not null default true,
 foreign key(workspace_id,ad_account_id) references public.lyads_ad_accounts(workspace_id,id) on delete cascade
);
create index lyads_meta_sync_due_idx on public.lyads_meta_sync_settings(next_sync_at) where enabled;
create index lyads_meta_sync_workspace_idx on public.lyads_meta_sync_settings(workspace_id,ad_account_id);
do $$ declare t text; begin
 foreach t in array array['credentials','oauth_states','quota','sync_settings'] loop
 execute format('alter table public.%I enable row level security','lyads_meta_'||t);
 execute format('revoke all on public.%I from public,anon,authenticated,service_role','lyads_meta_'||t);
 execute format('grant select,insert,update,delete on public.%I to service_role','lyads_meta_'||t);
 end loop;
end $$;
grant select on public.lyads_meta_sync_settings to authenticated;
create policy sync_settings_read on public.lyads_meta_sync_settings for select to authenticated using(ad_account_id in(select lyads_private.accessible_accounts()));
create function public.lyads_take_meta_slot(bucket_key text,interval_ms integer default 1000)
returns integer language plpgsql security invoker set search_path='' as $$
declare q record; wait_ms integer; begin
 if interval_ms not between 100 and 60000 then raise exception 'Invalid throttle' using errcode='22023'; end if;
 insert into public.lyads_meta_quota(bucket) values(bucket_key) on conflict do nothing;
 select * into q from public.lyads_meta_quota where bucket=bucket_key for update;
 wait_ms:=greatest(0,ceil(extract(epoch from(greatest(q.next_request_at,coalesce(q.blocked_until,now()))-now()))*1000))::integer;
 if wait_ms=0 then update public.lyads_meta_quota set next_request_at=now()+make_interval(secs=>interval_ms/1000.0),updated_at=now() where bucket=bucket_key; end if;
 return wait_ms;
end $$;
create function public.lyads_consume_meta_state(hash text)
returns setof public.lyads_meta_oauth_states language sql security invoker set search_path='' as $$
 delete from public.lyads_meta_oauth_states where state_hash=hash and expires_at>now() returning *;
$$;
revoke all on function public.lyads_take_meta_slot(text,integer),public.lyads_consume_meta_state(text) from public,anon,authenticated;
grant execute on function public.lyads_take_meta_slot(text,integer),public.lyads_consume_meta_state(text) to service_role;
commit;

begin;
create function public.lyads_save_meta_connection(target_workspace uuid,meta_user text,scopes text[],permissions jsonb,token_expiry timestamptz,encrypted_token text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare connection uuid; begin
 insert into public.lyads_meta_connections(workspace_id,meta_user_id,granted_scopes,permission_status,expires_at,checked_at,connection_status)
 values(target_workspace,meta_user,scopes,permissions,token_expiry,now(),case when 'ads_read'=any(scopes) or 'ads_management'=any(scopes) then 'connected' else 'partial' end)
 on conflict(workspace_id,meta_user_id) do update set granted_scopes=excluded.granted_scopes,permission_status=excluded.permission_status,expires_at=excluded.expires_at,checked_at=now(),connection_status=excluded.connection_status,revoked_at=null
 returning id into connection;
 insert into public.lyads_meta_credentials(connection_id,ciphertext,key_version) values(connection,encrypted_token,'v1')
 on conflict(connection_id) do update set ciphertext=excluded.ciphertext,key_version=excluded.key_version,updated_at=now();
 return connection;
end $$;
revoke all on function public.lyads_save_meta_connection(uuid,text,text[],jsonb,timestamptz,text) from public,anon,authenticated;
grant execute on function public.lyads_save_meta_connection(uuid,text,text[],jsonb,timestamptz,text) to service_role;
commit;
