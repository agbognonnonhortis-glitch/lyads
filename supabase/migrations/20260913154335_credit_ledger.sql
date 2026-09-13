begin;
create table public.lyads_credit_prices (
 action text primary key,
 module text not null,
 unit_cost numeric(18,4) not null check(unit_cost>=0),
 enabled boolean not null default false,
 provisional boolean not null default true,
 source_reference text not null,
 updated_at timestamptz not null default now()
);
create table public.lyads_credit_lots (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.lyads_workspaces(id) on delete restrict,
 grant_key text not null,
 kind text not null check(kind in ('monthly','purchase','adjustment')),
 amount numeric(18,4) not null check(amount>0),
 remaining numeric(18,4) not null check(remaining>=0 and remaining<=amount),
 reserved numeric(18,4) not null default 0 check(reserved>=0 and reserved<=remaining),
 expires_at timestamptz not null,
 created_at timestamptz not null default now(),
 unique(workspace_id,grant_key), unique(workspace_id,id)
);
create index lyads_credit_lots_expiry_idx on public.lyads_credit_lots(workspace_id,expires_at);
create table public.lyads_credit_operations (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.lyads_workspaces(id) on delete restrict,
 action text not null references public.lyads_credit_prices(action),
 request_key text not null,
 unit_cost numeric(18,4) not null check(unit_cost>=0),
 requested_units integer not null check(requested_units between 1 and 1000),
 successful_units integer check(successful_units>=0 and successful_units<=requested_units),
 status text not null default 'reserved' check(status in ('reserved','succeeded','failed','refunded')),
 created_at timestamptz not null default now(),
 completed_at timestamptz,
 unique(workspace_id,request_key), unique(workspace_id,id)
);
create index lyads_credit_operations_action_idx on public.lyads_credit_operations(action);
create table public.lyads_credit_allocations (
 workspace_id uuid not null,
 operation_id uuid not null,
 lot_id uuid not null,
 reserved numeric(18,4) not null check(reserved>0),
 charged numeric(18,4) not null default 0 check(charged>=0 and charged<=reserved),
 primary key(operation_id,lot_id),
 foreign key(workspace_id,operation_id) references public.lyads_credit_operations(workspace_id,id) on delete restrict,
 foreign key(workspace_id,lot_id) references public.lyads_credit_lots(workspace_id,id) on delete restrict
);
create index lyads_credit_allocations_lot_idx on public.lyads_credit_allocations(workspace_id,lot_id);
create table public.lyads_credit_transactions (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.lyads_workspaces(id) on delete restrict,
 operation_id uuid,
 lot_id uuid not null,
 kind text not null check(kind in ('grant','debit','refund','expiration','release')),
 amount numeric(18,4) not null check(amount>=0),
 event_key text not null,
 created_at timestamptz not null default now(),
 unique(workspace_id,event_key),
 foreign key(workspace_id,operation_id) references public.lyads_credit_operations(workspace_id,id) on delete restrict,
 foreign key(workspace_id,lot_id) references public.lyads_credit_lots(workspace_id,id) on delete restrict
);
create index lyads_credit_transactions_date_idx on public.lyads_credit_transactions(workspace_id,created_at desc);
create index lyads_credit_transactions_operation_idx on public.lyads_credit_transactions(workspace_id,operation_id);
create index lyads_credit_transactions_lot_idx on public.lyads_credit_transactions(workspace_id,lot_id);
do $$ declare t text; begin
 foreach t in array array['prices','lots','operations','allocations','transactions'] loop
 execute format('alter table public.%I enable row level security','lyads_credit_'||t);
 execute format('revoke all on public.%I from public,anon,authenticated,service_role','lyads_credit_'||t);
 execute format('grant select on public.%I to authenticated','lyads_credit_'||t);
 if t='transactions' then execute 'grant select,insert on public.lyads_credit_transactions to service_role';
 else execute format('grant select,insert,update,delete on public.%I to service_role','lyads_credit_'||t); end if;
 if t='prices' then execute 'create policy prices_read on public.lyads_credit_prices for select to authenticated using(true)';
 else execute format('create policy credits_member_read on public.%I for select to authenticated using(lyads_private.workspace_role(workspace_id) is not null)','lyads_credit_'||t); end if;
 end loop;
end $$;

create function public.lyads_grant_credits(target_workspace uuid,event_key text,grant_kind text,credits numeric,expiry timestamptz)
returns uuid language plpgsql security invoker set search_path='' as $$
declare lot uuid; begin
 if expiry<=now() then raise exception 'Invalid expiry' using errcode='22023'; end if;
 perform 1 from public.lyads_workspaces where id=target_workspace for update;
 select id into lot from public.lyads_credit_lots where workspace_id=target_workspace and grant_key=event_key;
 if lot is not null then return lot; end if;
 insert into public.lyads_credit_lots(workspace_id,grant_key,kind,amount,remaining,expires_at)
 values(target_workspace,event_key,grant_kind,credits,credits,expiry) returning id into lot;
 insert into public.lyads_credit_transactions(workspace_id,lot_id,kind,amount,event_key)
 values(target_workspace,lot,'grant',credits,'grant:'||event_key);
 return lot;
end $$;
create function public.lyads_reserve_credits(target_workspace uuid,action_key text,operation_key text,units integer,quoted_unit_cost numeric)
returns uuid language plpgsql security invoker set search_path='' as $$
declare op uuid; price numeric; needed numeric; amount_to_hold numeric; lot record; begin
 perform 1 from public.lyads_workspaces where id=target_workspace for update;
 select id into op from public.lyads_credit_operations where workspace_id=target_workspace and request_key=operation_key;
 if op is not null then
 if not exists(select 1 from public.lyads_credit_operations where id=op and action=action_key and requested_units=units and unit_cost=quoted_unit_cost) then
 raise exception 'Idempotency conflict' using errcode='22023'; end if; return op; end if;
 select unit_cost into price from public.lyads_credit_prices where action=action_key and enabled;
 if price is null or quoted_unit_cost is null or price<>quoted_unit_cost then raise exception 'Price unavailable or changed' using errcode='22023'; end if;
 if units is null or units not between 1 and 1000 then raise exception 'Invalid units' using errcode='22023'; end if;
 needed:=price*units;
 if coalesce((select sum(remaining-reserved) from public.lyads_credit_lots where workspace_id=target_workspace and expires_at>now()),0)<needed then
 raise exception 'Insufficient credits' using errcode='P0001'; end if;
 insert into public.lyads_credit_operations(workspace_id,action,request_key,unit_cost,requested_units)
 values(target_workspace,action_key,operation_key,price,units) returning id into op;
 for lot in select * from public.lyads_credit_lots where workspace_id=target_workspace and expires_at>now() and remaining>reserved order by expires_at,id for update loop
 exit when needed=0;
 amount_to_hold:=least(needed,lot.remaining-lot.reserved);
 update public.lyads_credit_lots set reserved=reserved+amount_to_hold where id=lot.id;
 insert into public.lyads_credit_allocations(workspace_id,operation_id,lot_id,reserved) values(target_workspace,op,lot.id,amount_to_hold);
 needed:=needed-amount_to_hold;
 end loop;
 return op;
end $$;
create function public.lyads_settle_credits(target_operation uuid,succeeded_units integer)
returns numeric language plpgsql security invoker set search_path='' as $$
declare op record; allocation record; charge numeric; piece numeric; total numeric; begin
 select workspace_id into op from public.lyads_credit_operations where id=target_operation;
 perform 1 from public.lyads_workspaces where id=op.workspace_id for update;
 select * into op from public.lyads_credit_operations where id=target_operation for update;
 if op.id is null or succeeded_units is null or succeeded_units<0 or succeeded_units>op.requested_units then raise exception 'Invalid result' using errcode='22023'; end if;
 if op.status<>'reserved' then
 if op.successful_units<>succeeded_units then raise exception 'Conflicting result' using errcode='22023'; end if;
 return op.unit_cost*op.successful_units; end if;
 charge:=op.unit_cost*succeeded_units; total:=charge;
 for allocation in select a.* from public.lyads_credit_allocations a join public.lyads_credit_lots l on l.id=a.lot_id where a.operation_id=op.id order by l.expires_at,l.id for update of a,l loop
 piece:=least(charge,allocation.reserved);
 update public.lyads_credit_lots set reserved=reserved-allocation.reserved,remaining=remaining-piece where id=allocation.lot_id;
 update public.lyads_credit_allocations set charged=piece where operation_id=op.id and lot_id=allocation.lot_id;
 if piece>0 then insert into public.lyads_credit_transactions(workspace_id,operation_id,lot_id,kind,amount,event_key)
 values(op.workspace_id,op.id,allocation.lot_id,'debit',piece,'debit:'||op.id||':'||allocation.lot_id); end if;
 if allocation.reserved>piece then insert into public.lyads_credit_transactions(workspace_id,operation_id,lot_id,kind,amount,event_key)
 values(op.workspace_id,op.id,allocation.lot_id,'release',allocation.reserved-piece,'release:'||op.id||':'||allocation.lot_id); end if;
 charge:=charge-piece;
 end loop;
 update public.lyads_credit_operations set status=case when succeeded_units=0 then 'failed' else 'succeeded' end,successful_units=succeeded_units,completed_at=now() where id=op.id;
 return total;
end $$;
create function public.lyads_refund_credits(target_operation uuid)
returns numeric language plpgsql security invoker set search_path='' as $$
declare op record; allocation record; total numeric:=0; begin
 select workspace_id into op from public.lyads_credit_operations where id=target_operation;
 perform 1 from public.lyads_workspaces where id=op.workspace_id for update;
 select * into op from public.lyads_credit_operations where id=target_operation for update;
 if op.id is null then raise exception 'Unknown operation' using errcode='22023'; end if;
 if op.status='reserved' then perform public.lyads_settle_credits(op.id,0); return 0; end if;
 if op.status in ('failed','refunded') then return 0; end if;
 for allocation in select * from public.lyads_credit_allocations where operation_id=op.id and charged>0 loop
 update public.lyads_credit_lots set remaining=remaining+allocation.charged where id=allocation.lot_id;
 insert into public.lyads_credit_transactions(workspace_id,operation_id,lot_id,kind,amount,event_key)
 values(op.workspace_id,op.id,allocation.lot_id,'refund',allocation.charged,'refund:'||op.id||':'||allocation.lot_id);
 total:=total+allocation.charged;
 end loop;
 update public.lyads_credit_operations set status='refunded' where id=op.id;
 return total;
end $$;
create function public.lyads_credit_balance(target_workspace uuid)
returns table(available text,reserved text,next_expiry timestamptz)
language sql stable security invoker set search_path='' as $$
 select coalesce(sum(case when expires_at>now() then remaining-reserved else 0 end),0)::text,coalesce(sum(reserved),0)::text,min(expires_at) filter(where expires_at>now() and remaining>reserved)
 from public.lyads_credit_lots where workspace_id=target_workspace;
$$;
revoke all on function public.lyads_grant_credits(uuid,text,text,numeric,timestamptz),public.lyads_reserve_credits(uuid,text,text,integer,numeric),public.lyads_settle_credits(uuid,integer),public.lyads_refund_credits(uuid),public.lyads_credit_balance(uuid) from public,anon,authenticated;
grant execute on function public.lyads_grant_credits(uuid,text,text,numeric,timestamptz),public.lyads_reserve_credits(uuid,text,text,integer,numeric),public.lyads_settle_credits(uuid,integer),public.lyads_refund_credits(uuid) to service_role;
grant execute on function public.lyads_credit_balance(uuid) to authenticated,service_role;
-- Approved provisional prices from the exact, named source maquettes. No paid
-- provider can run until its implementation and confirmation flow are ready.
insert into public.lyads_credit_prices(action,module,unit_cost,enabled,source_reference) values
 ('campaign.structure','builder',12,true,'Lot 3 - Etape 1 Mode et brief'),
 ('campaign.advice','builder',2,true,'Lot 3 - Etape 3 Construction manuelle'),
 ('campaign.publish','builder',6,true,'Lot 3 - Etape 4 Apercu et publication'),
 ('studio.text','studio',2,true,'Lot 4 - Studio et Analyse creative'),
 ('studio.image','studio',6,true,'Lot 4 - Studio et Analyse creative: 3 formats x 2 variantes x 6 credits'),
 ('studio.video','studio',45,true,'Lot 4 - Studio et Analyse creative');
commit;
