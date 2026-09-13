begin;

-- Atomic, retryable onboarding under the caller's RLS. No elevated privileges.
create function public.lyads_initialize_account(display_name text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  workspace_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if display_name is null or length(trim(display_name)) not between 1 and 200 then
    raise exception 'Invalid display name' using errcode = '22023';
  end if;
  -- Serialize simultaneous first-login requests for the same user.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller_id::text, 0));
  insert into public.lyads_profiles(user_id, display_name)
    values(caller_id, trim(display_name)) on conflict(user_id) do nothing;
  select id into workspace_id from public.lyads_workspaces
    where owner_id = caller_id order by created_at, id limit 1;
  if workspace_id is null then
    insert into public.lyads_workspaces(owner_id, name)
      values(caller_id, trim(display_name)) returning id into workspace_id;
  end if;
  return workspace_id;
end;
$$;
revoke all on function public.lyads_initialize_account(text) from public, anon, service_role;
grant execute on function public.lyads_initialize_account(text) to authenticated;
commit;
