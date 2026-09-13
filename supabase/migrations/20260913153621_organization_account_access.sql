begin;
-- Existing workspaces are organizations; preserve their ids and their owner's data.
create schema if not exists lyads_private;
revoke all on schema lyads_private from public, anon;
grant usage on schema lyads_private to authenticated, service_role;

create table public.lyads_memberships (
  workspace_id uuid not null references public.lyads_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key(workspace_id,user_id)
);
comment on table public.lyads_memberships is 'Owner role is derived exclusively from workspaces.owner_id; never duplicated or assignable here.';
create index lyads_memberships_user_idx on public.lyads_memberships(user_id,workspace_id);
create table public.lyads_account_access (
  workspace_id uuid not null,
  user_id uuid not null,
  ad_account_id uuid not null,
  can_edit boolean not null default false,
  created_at timestamptz not null default now(),
  primary key(workspace_id,user_id,ad_account_id),
  foreign key(workspace_id,user_id) references public.lyads_memberships(workspace_id,user_id) on delete cascade,
  foreign key(workspace_id,ad_account_id) references public.lyads_ad_accounts(workspace_id,id) on delete cascade
);
create index lyads_account_access_account_idx on public.lyads_account_access(workspace_id,ad_account_id);
create index lyads_account_access_user_idx on public.lyads_account_access(user_id,ad_account_id);

-- Narrow private lookup helpers break recursive membership policies. They never
-- accept a caller identity and return only this authenticated caller's access.
create function lyads_private.workspace_role(target uuid) returns text
language sql stable security definer set search_path='' as $$
 select case when w.owner_id = (select auth.uid()) then 'owner' else m.role end
 from public.lyads_workspaces w left join public.lyads_memberships m
 on m.workspace_id=w.id and m.user_id=(select auth.uid())
 where w.id=target and (select auth.uid()) is not null;
$$;
create function lyads_private.accessible_accounts() returns setof uuid
language sql stable security definer set search_path='' as $$
 select a.id from public.lyads_ad_accounts a join public.lyads_workspaces w on w.id=a.workspace_id
 where (select auth.uid()) is not null and
 (w.owner_id=(select auth.uid()) or exists(select 1 from public.lyads_account_access g
 join public.lyads_memberships m on m.workspace_id=g.workspace_id and m.user_id=g.user_id
 where g.ad_account_id=a.id and g.workspace_id=a.workspace_id and g.user_id=(select auth.uid())));
$$;
create function lyads_private.can_edit_account(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and exists(
 select 1 from public.lyads_ad_accounts a join public.lyads_workspaces w on w.id=a.workspace_id
 where a.id=target and (w.owner_id=(select auth.uid()) or exists(
 select 1 from public.lyads_account_access g join public.lyads_memberships m
 on m.workspace_id=g.workspace_id and m.user_id=g.user_id
 where g.ad_account_id=a.id and g.workspace_id=a.workspace_id and g.user_id=(select auth.uid())
 and g.can_edit and m.role in ('admin','editor'))));
$$;
revoke all on function lyads_private.workspace_role(uuid), lyads_private.accessible_accounts(), lyads_private.can_edit_account(uuid) from public,anon;
grant execute on function lyads_private.workspace_role(uuid), lyads_private.accessible_accounts(), lyads_private.can_edit_account(uuid) to authenticated;

alter table public.lyads_memberships enable row level security;
alter table public.lyads_account_access enable row level security;
revoke all on public.lyads_memberships, public.lyads_account_access from public,anon,authenticated,service_role;
grant select on public.lyads_memberships, public.lyads_account_access to authenticated;
grant select,insert,update,delete on public.lyads_memberships, public.lyads_account_access to service_role;
create policy membership_read on public.lyads_memberships for select to authenticated
 using(user_id=(select auth.uid()) or lyads_private.workspace_role(workspace_id) in ('owner','admin'));
create policy account_access_read on public.lyads_account_access for select to authenticated
 using(user_id=(select auth.uid()) or lyads_private.workspace_role(workspace_id) in ('owner','admin'));

-- Replace every owner-only account policy together: no forgotten permissive
-- policy may let a member read another account through a dependent table.
drop policy lyads_workspaces_owner_read on public.lyads_workspaces;
create policy workspace_member_read on public.lyads_workspaces for select to authenticated
 using(owner_id=(select auth.uid()) or lyads_private.workspace_role(id) is not null);
drop policy lyads_meta_connections_owner_read on public.lyads_meta_connections;
create policy connection_member_read on public.lyads_meta_connections for select to authenticated
 using(lyads_private.workspace_role(workspace_id)='owner' or id in
 (select connection_id from public.lyads_ad_accounts where id in(select lyads_private.accessible_accounts())));
drop policy lyads_ad_accounts_owner_read on public.lyads_ad_accounts;
create policy account_member_read on public.lyads_ad_accounts for select to authenticated
 using(id in(select lyads_private.accessible_accounts()));
do $$ declare t text; begin
 foreach t in array array['campaigns','ad_sets','ads','sync_runs','insight_snapshots','analyses','recommendations','action_events'] loop
 execute format('drop policy %I on public.%I','lyads_'||t||'_owner_read','lyads_'||t);
 execute format('create policy account_member_read on public.%I for select to authenticated using(ad_account_id in(select lyads_private.accessible_accounts()))','lyads_'||t);
 end loop;
end $$;

-- Atomic member management: admins manage editor/viewer accounts within their
-- own grants. Only the owner can appoint or modify an admin. Ownership transfer
-- is deliberately not offered by this RPC.
create function lyads_private.set_member(target_workspace uuid,target_user uuid,target_role text,accounts jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare caller_role text; old_role text; account record; begin
 if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
 -- Shared by every membership mutation: prevents concurrent role/grant escalation.
 perform 1 from public.lyads_workspaces where id=target_workspace for update;
 caller_role:=lyads_private.workspace_role(target_workspace);
 select role into old_role from public.lyads_memberships where workspace_id=target_workspace and user_id=target_user;
 if caller_role is null or caller_role not in ('owner','admin') or target_user=(select auth.uid()) or exists(
 select 1 from public.lyads_workspaces where id=target_workspace and owner_id=target_user) then
 raise exception 'Access denied' using errcode='42501'; end if;
 if caller_role='admin' and (old_role='admin' or target_role='admin') then raise exception 'Access denied' using errcode='42501'; end if;
 if target_role is not null and target_role not in ('admin','editor','viewer') then raise exception 'Invalid role' using errcode='22023'; end if;
 if accounts is null or jsonb_typeof(accounts)<>'array' or jsonb_array_length(accounts)>500 then raise exception 'Invalid grants' using errcode='22023'; end if;
 for account in select * from jsonb_to_recordset(accounts) as x(ad_account_id uuid,can_edit boolean) loop
 if account.ad_account_id is null or account.can_edit is null or not exists(
 select 1 from public.lyads_ad_accounts where id=account.ad_account_id and workspace_id=target_workspace) then
 raise exception 'Invalid account grant' using errcode='22023'; end if;
 if caller_role='admin' and (not exists(select 1 from public.lyads_account_access g
 where g.workspace_id=target_workspace and g.user_id=(select auth.uid()) and g.ad_account_id=account.ad_account_id)
 or (account.can_edit and not lyads_private.can_edit_account(account.ad_account_id))) then
 raise exception 'Access denied' using errcode='42501'; end if;
 if target_role='viewer' and account.can_edit then raise exception 'Viewer cannot edit' using errcode='22023'; end if;
 end loop;
 if target_role is null then
 delete from public.lyads_memberships where workspace_id=target_workspace and user_id=target_user;
 return;
 end if;
 insert into public.lyads_memberships(workspace_id,user_id,role) values(target_workspace,target_user,target_role)
 on conflict(workspace_id,user_id) do update set role=excluded.role;
 delete from public.lyads_account_access where workspace_id=target_workspace and user_id=target_user;
 insert into public.lyads_account_access(workspace_id,user_id,ad_account_id,can_edit)
 select target_workspace,target_user,x.ad_account_id,x.can_edit from jsonb_to_recordset(accounts) as x(ad_account_id uuid,can_edit boolean);
end $$;
revoke all on function lyads_private.set_member(uuid,uuid,text,jsonb) from public,anon;
grant execute on function lyads_private.set_member(uuid,uuid,text,jsonb) to authenticated;
create function public.lyads_set_member(target_workspace uuid,target_user uuid,target_role text,accounts jsonb)
returns void language sql security invoker set search_path='' as $$
 select lyads_private.set_member(target_workspace,target_user,target_role,accounts);
$$;
create function public.lyads_account_permission(target_account uuid)
returns table(workspace_id uuid,role text,can_edit boolean)
language sql stable security invoker set search_path='' as $$
 select a.workspace_id,lyads_private.workspace_role(a.workspace_id),lyads_private.can_edit_account(a.id)
 from public.lyads_ad_accounts a where a.id=target_account;
$$;
create function public.lyads_organization_role(target_workspace uuid) returns text
language sql stable security invoker set search_path='' as $$ select lyads_private.workspace_role(target_workspace); $$;
revoke all on function public.lyads_set_member(uuid,uuid,text,jsonb), public.lyads_account_permission(uuid),public.lyads_organization_role(uuid) from public,anon;
grant execute on function public.lyads_set_member(uuid,uuid,text,jsonb), public.lyads_account_permission(uuid),public.lyads_organization_role(uuid) to authenticated;
-- The preexisting automatic RLS event trigger is not an API operation.
do $$ begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
 revoke all on function public.rls_auto_enable() from public,anon,authenticated;
 end if;
end $$;
commit;
