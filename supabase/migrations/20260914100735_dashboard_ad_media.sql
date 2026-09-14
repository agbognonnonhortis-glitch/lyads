begin;
alter table public.lyads_jobs drop constraint lyads_jobs_kind_check;
alter table public.lyads_jobs add constraint lyads_jobs_kind_check check(kind in ('meta.discover','meta.sync','meta.refresh_permissions','meta.inventory','website.analyze','alerts.scan','meta.media'));

create function lyads_private.request_ad_media(target_ad uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare ad public.lyads_ads; account public.lyads_ad_accounts; existing uuid; begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into ad from public.lyads_ads where id=target_ad;
 if not found or ad.ad_account_id not in (select lyads_private.accessible_accounts()) then
  raise exception 'Account access denied' using errcode='42501';
 end if;
 select * into account from public.lyads_ad_accounts where id=ad.ad_account_id for update;
 select id into existing from public.lyads_jobs where workspace_id=ad.workspace_id and ad_account_id=ad.ad_account_id and kind='meta.media'
 and payload->>'ad_id'=ad.id::text and (status in ('queued','running') or (status='succeeded' and updated_at>now()-interval '15 minutes') or (status='failed' and updated_at>now()-interval '1 minute'))
 order by created_at desc limit 1;
 if existing is not null then return existing; end if;
 if (select count(*) from public.lyads_jobs where requested_by=auth.uid() and kind='meta.media' and created_at>now()-interval '1 minute')>=30 then
  raise exception 'Media rate limit' using errcode='P0001';
 end if;
 insert into public.lyads_jobs(workspace_id,ad_account_id,requested_by,kind,idempotency_key,priority,payload)
 values(ad.workspace_id,ad.ad_account_id,auth.uid(),'meta.media',gen_random_uuid()::text,90,jsonb_build_object('connection_id',account.connection_id,'ad_id',ad.id)) returning id into existing;
 return existing;
end $$;
revoke all on function lyads_private.request_ad_media(uuid) from public,anon;
grant execute on function lyads_private.request_ad_media(uuid) to authenticated;
create function public.lyads_request_ad_media(target_ad uuid) returns uuid language sql security invoker set search_path='' as $$ select lyads_private.request_ad_media(target_ad) $$;
revoke all on function public.lyads_request_ad_media(uuid) from public,anon;
grant execute on function public.lyads_request_ad_media(uuid) to authenticated;
commit;
