begin;
create table public.lyads_credit_subscriptions (
 workspace_id uuid primary key references public.lyads_workspaces(id) on delete restrict,
 plan_key text not null,
 monthly_quota numeric(18,4) not null check(monthly_quota>0),
 next_period_at timestamptz not null,
 enabled boolean not null default true
);
alter table public.lyads_credit_subscriptions enable row level security;
revoke all on public.lyads_credit_subscriptions from public,anon,authenticated,service_role;
grant select on public.lyads_credit_subscriptions to authenticated;
grant select,insert,update,delete on public.lyads_credit_subscriptions to service_role;
create policy subscription_read on public.lyads_credit_subscriptions for select to authenticated using(lyads_private.workspace_role(workspace_id) is not null);
create index lyads_credit_period_due_idx on public.lyads_credit_subscriptions(next_period_at) where enabled;
create function public.lyads_renew_credit_periods()
returns integer language plpgsql security invoker set search_path='' as $$
declare subscription record; period_start timestamptz; period_end timestamptz; renewed integer:=0; begin
 for subscription in select * from public.lyads_credit_subscriptions where enabled and next_period_at<=now() order by next_period_at for update skip locked limit 100 loop
 period_start:=subscription.next_period_at;period_end:=period_start+interval '1 month';
 -- Never mint accumulated expired quotas after downtime: only the active period.
 while period_end<=now() loop period_start:=period_end;period_end:=period_start+interval '1 month';end loop;
 perform public.lyads_grant_credits(subscription.workspace_id,'monthly:'||period_start::text,'monthly',subscription.monthly_quota,period_end);
 update public.lyads_credit_subscriptions set next_period_at=period_end where workspace_id=subscription.workspace_id;
 renewed:=renewed+1;
 end loop;
 return renewed;
end $$;
create function public.lyads_expire_credits()
returns integer language plpgsql security invoker set search_path='' as $$
declare organization record; lot record; expired integer:=0; begin
 for organization in select distinct workspace_id from public.lyads_credit_lots where expires_at<=now() and remaining>reserved limit 100 loop
 perform 1 from public.lyads_workspaces where id=organization.workspace_id for update;
 for lot in select * from public.lyads_credit_lots where workspace_id=organization.workspace_id and expires_at<=now() and remaining>reserved for update loop
 insert into public.lyads_credit_transactions(workspace_id,lot_id,kind,amount,event_key)
 values(lot.workspace_id,lot.id,'expiration',lot.remaining-lot.reserved,'expiration:'||gen_random_uuid());
 -- Reservations belong to operations started while valid. Only their successful
 -- portion will be debited; any release is expired on the next scheduler tick.
 update public.lyads_credit_lots set remaining=reserved where id=lot.id;
 expired:=expired+1;
 end loop;
 end loop;
 return expired;
end $$;
revoke all on function public.lyads_renew_credit_periods(),public.lyads_expire_credits() from public,anon,authenticated;
grant execute on function public.lyads_renew_credit_periods(),public.lyads_expire_credits() to service_role;
commit;
