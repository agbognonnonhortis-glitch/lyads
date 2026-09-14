begin;
create function lyads_private.connect_ad_accounts(target_workspace uuid,expected_revision integer,account_ids uuid[]) returns uuid[]
language plpgsql security definer set search_path='' as $$
declare saved public.lyads_onboarding; selected uuid[]; begin
 if auth.uid() is null or not exists(select 1 from public.lyads_workspaces where id=target_workspace and owner_id=auth.uid()) then raise exception 'Owner required' using errcode='42501'; end if;
 if account_ids is null or cardinality(account_ids) not between 1 and 100 or array_position(account_ids,null) is not null then raise exception 'Invalid accounts' using errcode='22023';end if;
 select * into saved from public.lyads_onboarding where workspace_id=target_workspace for update;
 if not found or saved.completed_at is null then raise exception 'Finish onboarding' using errcode='22023';end if;
 if expected_revision is distinct from saved.revision then raise exception 'Revision conflict' using errcode='40001';end if;
 if exists(select 1 from unnest(account_ids) requested(id) where not exists(
 select 1 from public.lyads_business_accounts b join public.lyads_ad_accounts a on a.id=b.ad_account_id and a.workspace_id=b.workspace_id
 where b.workspace_id=target_workspace and b.connection_id=saved.connection_id and b.business_meta_id=saved.business_meta_id and b.ad_account_id=requested.id and a.connection_id=saved.connection_id)) then raise exception 'Account outside business' using errcode='42501';end if;
 select array_agg(distinct id order by id) into selected from unnest(saved.ad_account_ids||account_ids) x(id);
 if cardinality(selected)>100 then raise exception 'Too many accounts' using errcode='22023';end if;
 if selected is distinct from saved.ad_account_ids then
  update public.lyads_onboarding set ad_account_ids=selected,revision=revision+1,updated_at=now(),updated_by=auth.uid() where workspace_id=target_workspace;
 end if;
 return selected;
end $$;
revoke all on function lyads_private.connect_ad_accounts(uuid,integer,uuid[]) from public,anon;
grant execute on function lyads_private.connect_ad_accounts(uuid,integer,uuid[]) to authenticated;
create function public.lyads_connect_ad_accounts(target_workspace uuid,expected_revision integer,account_ids uuid[]) returns uuid[] language sql security invoker set search_path='' as $$select lyads_private.connect_ad_accounts(target_workspace,expected_revision,account_ids)$$;
revoke all on function public.lyads_connect_ad_accounts(uuid,integer,uuid[]) from public,anon;
grant execute on function public.lyads_connect_ad_accounts(uuid,integer,uuid[]) to authenticated;
commit;
