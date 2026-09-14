begin;
alter table public.lyads_jobs drop constraint lyads_jobs_kind_check;
alter table public.lyads_jobs add constraint lyads_jobs_kind_check check(kind in ('meta.discover','meta.sync','meta.refresh_permissions','meta.inventory','website.analyze','alerts.scan'));
create table public.lyads_alert_settings (
 ad_account_id uuid primary key,
 workspace_id uuid not null,
 target_cpa numeric check(target_cpa>0 and target_cpa<1e12),
 target_roas numeric check(target_roas>0 and target_roas<1e6),
 min_spend numeric not null default 0 check(min_spend>=0 and min_spend<1e12),
 min_days integer not null default 3 check(min_days between 3 and 90),
 min_impressions integer not null default 1000 check(min_impressions between 1000 and 1000000000),
 min_clicks integer not null default 30 check(min_clicks between 30 and 1000000000),
 min_purchases integer not null default 10 check(min_purchases between 10 and 1000000000),
 cpa_excess numeric not null default 0.2 check(cpa_excess between 0.05 and 5),
 roas_shortfall numeric not null default 0.2 check(roas_shortfall between 0.05 and 0.9),
 fatigue_frequency numeric not null default 3 check(fatigue_frequency between 1 and 100),
 fatigue_ctr_drop numeric not null default 0.2 check(fatigue_ctr_drop between 0.05 and 0.9),
 fatigue_cpa_rise numeric not null default 0.2 check(fatigue_cpa_rise between 0.05 and 5),
 imbalance_share numeric not null default 0.6 check(imbalance_share between 0.5 and 0.95),
 imbalance_cpa_ratio numeric not null default 1.5 check(imbalance_cpa_ratio between 1.1 and 10),
 foreign key(workspace_id,ad_account_id) references public.lyads_ad_accounts(workspace_id,id) on delete cascade
);
alter table public.lyads_alert_settings enable row level security;
revoke all on public.lyads_alert_settings from public,anon,authenticated;
grant select,insert,update on public.lyads_alert_settings to authenticated;
grant all on public.lyads_alert_settings to service_role;
create policy alert_settings_read on public.lyads_alert_settings for select to authenticated using(ad_account_id in(select lyads_private.accessible_accounts()));
create policy alert_settings_insert on public.lyads_alert_settings for insert to authenticated with check(lyads_private.can_edit_account(ad_account_id));
create policy alert_settings_update on public.lyads_alert_settings for update to authenticated using(lyads_private.can_edit_account(ad_account_id)) with check(lyads_private.can_edit_account(ad_account_id));
-- Pure numeric detection over daily, unbroken-down insights. No Meta writes.
create function public.lyads_compute_alerts(target_account uuid, since_date date, until_date date)
returns jsonb language plpgsql stable security invoker set search_path='' set statement_timeout='20s' as $$
declare cfg public.lyads_alert_settings; acct public.lyads_ad_accounts; output jsonb;
begin
 if since_date is null or until_date is null or until_date<since_date or until_date-since_date>89 then raise exception 'Invalid period' using errcode='22023'; end if;
 select * into acct from public.lyads_ad_accounts where id=target_account;
 if acct.id is null then raise exception 'Account denied' using errcode='42501'; end if;
 -- Identical defaults for unconfigured accounts; monetary targets deliberately stay null.
 select * into cfg from public.lyads_alert_settings where ad_account_id=target_account;
 if cfg.ad_account_id is null then
  cfg:=jsonb_populate_record(null::public.lyads_alert_settings,'{"min_spend":0,"min_days":3,"min_impressions":1000,"min_clicks":30,"min_purchases":10,"cpa_excess":0.2,"roas_shortfall":0.2,"fatigue_frequency":3,"fatigue_ctr_drop":0.2,"fatigue_cpa_rise":0.2,"imbalance_share":0.6,"imbalance_cpa_ratio":1.5}'::jsonb);
 end if;
 with daily as (
 select s.level,coalesce(s.ad_id,s.ad_set_id,s.campaign_id) entity_id,s.date_start,
 s.date_start>=since_date current_period,
 public.lyads_metric_number(s.metrics->>'spend') spend,
 public.lyads_metric_number(s.metrics->>'impressions') impressions,
 public.lyads_metric_number(s.metrics->>'clicks') clicks,
 public.lyads_metric_number(s.metrics->>'frequency') frequency,
 (select public.lyads_metric_number(x->>'value') from jsonb_array_elements(case when jsonb_typeof(s.metrics->'actions')='array' then s.metrics->'actions' else '[]'::jsonb end) x where x->>'action_type'='purchase' limit 1) purchases,
 (select public.lyads_metric_number(x->>'value') from jsonb_array_elements(case when jsonb_typeof(s.metrics->'action_values')='array' then s.metrics->'action_values' else '[]'::jsonb end) x where x->>'action_type'='purchase' limit 1) revenue
 from public.lyads_insight_snapshots s
 where s.ad_account_id=target_account and s.workspace_id=acct.workspace_id and s.currency=acct.currency
 and s.level in ('campaign','ad_set','ad') and s.date_start=s.date_stop
 and s.date_start between since_date-(until_date-since_date+1) and until_date
 and s.date_start < (now() at time zone acct.timezone_name)::date
 and coalesce(s.query_context->>'breakdowns','')=''
 ), totals as (
 select level,entity_id,current_period,count(*) source_rows,count(distinct date_start) days,
 case when count(spend)=count(*) then sum(spend) end spend,
 case when count(impressions)=count(*) then sum(impressions) end impressions,
 case when count(clicks)=count(*) then sum(clicks) end clicks,
 case when count(purchases)=count(*) then sum(purchases) end purchases,
 case when count(revenue)=count(*) then sum(revenue) end revenue,
 case when count(frequency)=count(*) then avg(frequency) end daily_frequency
 from daily group by level,entity_id,current_period
 ), measured as (
 select t.*,spend/nullif(purchases,0) cpa,revenue/nullif(spend,0) roas,clicks/nullif(impressions,0) ctr,
 coalesce(source_rows=days and days>=cfg.min_days and spend>0 and spend>=cfg.min_spend and impressions>=cfg.min_impressions and clicks>=cfg.min_clicks and purchases>=cfg.min_purchases,false) sufficient
 from totals t
 ), eligible as (
 select m.*,coalesce(a.name,s.name,c.name) entity_name,s.campaign_id,
 s.source_data->>'optimization_goal' optimization_goal,s.source_data->'attribution_spec' attribution_spec
 from measured m
 left join public.lyads_ads a on m.level='ad' and a.id=m.entity_id
 left join public.lyads_ad_sets s on m.level='ad_set' and s.id=m.entity_id
 left join public.lyads_campaigns c on m.level='campaign' and c.id=m.entity_id
 where coalesce(a.effective_status,s.effective_status,c.effective_status)='ACTIVE'
 ), events as (
 select 'cpa_high' detector,m.level,m.entity_id,m.entity_name,80 priority,
 jsonb_build_object('observed',m.cpa,'threshold',cfg.target_cpa*(1+cfg.cpa_excess),'target',cfg.target_cpa,'spend',m.spend,'purchases',m.purchases,'days',m.days) evidence
 from eligible m where m.current_period and m.sufficient and m.level='campaign' and cfg.target_cpa is not null and m.cpa>cfg.target_cpa*(1+cfg.cpa_excess)
 union all
 select 'roas_low',m.level,m.entity_id,m.entity_name,80,
 jsonb_build_object('observed',m.roas,'threshold',cfg.target_roas*(1-cfg.roas_shortfall),'target',cfg.target_roas,'spend',m.spend,'purchases',m.purchases,'days',m.days)
 from eligible m where m.current_period and m.sufficient and m.level='campaign' and cfg.target_roas is not null and m.roas<cfg.target_roas*(1-cfg.roas_shortfall)
 union all
 select 'creative_fatigue',m.level,m.entity_id,m.entity_name,70,
 jsonb_build_object('daily_frequency',m.daily_frequency,'frequency_threshold',cfg.fatigue_frequency,'ctr',m.ctr,'previous_ctr',p.ctr,'ctr_drop_threshold',cfg.fatigue_ctr_drop,'cpa',m.cpa,'previous_cpa',p.cpa,'cpa_rise_threshold',cfg.fatigue_cpa_rise,'spend',m.spend,'purchases',m.purchases,'previous_purchases',p.purchases,'days',m.days,'previous_days',p.days)
 from eligible m join measured p on p.entity_id=m.entity_id and p.level=m.level and not p.current_period
 where m.level='ad' and m.current_period and m.sufficient and p.sufficient
 and until_date-since_date+1>=7
 and m.days>=greatest(6,ceil((until_date-since_date+1)*0.8)) and p.days>=greatest(6,ceil((until_date-since_date+1)*0.8))
 and m.daily_frequency>=cfg.fatigue_frequency and p.ctr>0 and m.ctr<=p.ctr*(1-cfg.fatigue_ctr_drop) and m.cpa>=p.cpa*(1+cfg.fatigue_cpa_rise)
 ), peers as (
 select m.*,min(m.cpa) over(partition by m.campaign_id,m.optimization_goal,m.attribution_spec) best_cpa,
 sum(m.spend) over(partition by m.campaign_id,m.optimization_goal,m.attribution_spec) total_spend,
 count(*) over(partition by m.campaign_id,m.optimization_goal,m.attribution_spec) peer_count
 from eligible m where m.level='ad_set' and m.current_period and m.sufficient and m.optimization_goal is not null and m.attribution_spec is not null
 -- Do not judge allocation if any active peer in this campaign lacks sufficient data.
 and not exists(select 1 from public.lyads_ad_sets s where s.campaign_id=m.campaign_id and s.effective_status='ACTIVE'
 and not exists(select 1 from eligible other where other.entity_id=s.id and other.level='ad_set' and other.current_period and other.sufficient))
 ), imbalance as (
 select 'budget_imbalance' detector,'campaign'::text level,campaign_id entity_id,
 (select name from public.lyads_campaigns c where c.id=campaign_id) entity_name,60 priority,
 jsonb_build_object('spend_share',sum(spend) filter(where cpa>=best_cpa*cfg.imbalance_cpa_ratio)/nullif(max(total_spend),0),
 'share_threshold',cfg.imbalance_share,'cpa_ratio_threshold',cfg.imbalance_cpa_ratio,'best_cpa',max(best_cpa),'spend',max(total_spend),
 'purchases',sum(purchases),'days',min(days),'peer_count',max(peer_count)) evidence
 from peers where peer_count>=2
 group by campaign_id,optimization_goal,attribution_spec
 having sum(spend) filter(where cpa>=best_cpa*cfg.imbalance_cpa_ratio)/nullif(max(total_spend),0)>=cfg.imbalance_share
 ), all_events as (
 select * from events union all select * from imbalance
 ), ordered as (
 select distinct on(detector,entity_id) * from all_events order by detector,entity_id,priority desc
 ), limited as (
 select * from ordered order by priority desc,detector,entity_id limit 100
 ) select jsonb_build_object('rows',coalesce((select jsonb_agg(jsonb_build_object('id',target_account||':'||detector||':'||entity_id,'kind','performance','detector',detector,'entity_id',entity_id,'entity_name',entity_name,'level',level,'priority',priority,'evidence',evidence,'sufficientData',true,'account_id',target_account,'currency',acct.currency,'since',since_date,'until',until_date)) from limited),'[]'::jsonb),
 'evaluated_entities',(select count(*) from eligible where current_period),'sufficient_entities',(select count(*) from eligible where current_period and sufficient),
 'source_rows',(select count(*) from daily where current_period),'truncated',(select count(*)>100 from ordered),
 'settings',to_jsonb(cfg)-'workspace_id'-'ad_account_id','currency',acct.currency,'account_id',target_account,
 'since',since_date,'until',until_date,'previous_since',since_date-(until_date-since_date+1),'previous_until',since_date-1,
 'synchronized_at',acct.synchronized_at,'calculated_at',now(),'version','alerts-v1') into output;
 return output;
end $$;
revoke all on function public.lyads_compute_alerts(uuid,date,date) from public,anon,authenticated;
grant execute on function public.lyads_compute_alerts(uuid,date,date) to service_role;

-- One immutable cached scan per source revision + settings + selected period.
create function lyads_private.queue_alert_scan(target_account uuid,since_date date,until_date date,actor uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare acct public.lyads_ad_accounts; settings jsonb; job_id uuid; key text;
begin
 if since_date is null or until_date is null or until_date<since_date or until_date-since_date>89 then raise exception 'Invalid period' using errcode='22023'; end if;
 select * into acct from public.lyads_ad_accounts where id=target_account for update;
 if acct.id is null then raise exception 'Account denied' using errcode='42501'; end if;
 select to_jsonb(s) into settings from public.lyads_alert_settings s where s.ad_account_id=target_account;
 key:='alerts-v1:'||target_account||':'||since_date||':'||until_date||':'||md5(coalesce(acct.synchronized_at::text,'')||coalesce(settings::text,'')||(now() at time zone acct.timezone_name)::date::text);
 select id into job_id from public.lyads_jobs where workspace_id=acct.workspace_id and kind='alerts.scan' and idempotency_key=key;
 if job_id is not null then
  update public.lyads_jobs set status='queued',attempts=0,available_at=now(),updated_at=now(),error_code=null
  where id=job_id and status='failed' and updated_at<now()-interval '5 minutes';
  return job_id;
 end if;
 if (select count(*) from public.lyads_jobs where ad_account_id=target_account and kind='alerts.scan' and created_at>now()-interval '1 minute')>=10 then raise exception 'Scan cooldown' using errcode='P0001'; end if;
 insert into public.lyads_jobs(workspace_id,ad_account_id,requested_by,kind,idempotency_key,priority,payload)
 values(acct.workspace_id,target_account,actor,'alerts.scan',key,20,jsonb_build_object('since',since_date,'until',until_date)) returning id into job_id;
 return job_id;
end $$;
revoke all on function lyads_private.queue_alert_scan(uuid,date,date,uuid) from public,anon,authenticated;
grant execute on function lyads_private.queue_alert_scan(uuid,date,date,uuid) to service_role;
create function lyads_private.request_alert_scan(target_account uuid,since_date date,until_date date) returns uuid
language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null or target_account not in(select lyads_private.accessible_accounts()) then raise exception 'Account denied' using errcode='42501'; end if;
 return lyads_private.queue_alert_scan(target_account,since_date,until_date,(select auth.uid()));
end $$;
revoke all on function lyads_private.request_alert_scan(uuid,date,date) from public,anon;
grant execute on function lyads_private.request_alert_scan(uuid,date,date) to authenticated;
create function public.lyads_request_alert_scan(target_account uuid,since_date date,until_date date) returns uuid
language sql security invoker set search_path='' as $$ select lyads_private.request_alert_scan(target_account,since_date,until_date) $$;
revoke all on function public.lyads_request_alert_scan(uuid,date,date) from public,anon;
grant execute on function public.lyads_request_alert_scan(uuid,date,date) to authenticated;

-- Sync success automatically schedules a scan of the last seven complete days
-- in the account's timezone, avoiding an incomplete current day.
create function lyads_private.alerts_after_sync() returns trigger language plpgsql security definer set search_path='' as $$
declare day date; actor uuid;
begin
 if new.synchronized_at is not null and new.synchronized_at is distinct from old.synchronized_at then
  day:=(now() at time zone new.timezone_name)::date-1;
  select owner_id into actor from public.lyads_workspaces where id=new.workspace_id;
  begin
   perform lyads_private.queue_alert_scan(new.id,day-6,day,actor);
  exception when sqlstate 'P0001' then
   -- A reader flooding manual scan periods must not roll back a valid sync.
   null;
  end;
 end if;
 return new;
end $$;
revoke all on function lyads_private.alerts_after_sync() from public,anon,authenticated;
create trigger lyads_alerts_after_sync after update of synchronized_at on public.lyads_ad_accounts for each row execute function lyads_private.alerts_after_sync();
commit;
