begin;
alter table public.lyads_alert_settings
 add column target_cpr numeric check(target_cpr>0 and target_cpr<1e12),
 add column target_cpl numeric check(target_cpl>0 and target_cpl<1e12);
-- Targets are editable; platform-owned volume/sensitivity controls cannot be changed through REST.
revoke insert,update on public.lyads_alert_settings from authenticated;
grant insert(workspace_id,ad_account_id,target_cpa,target_cpl,target_cpr,target_roas),
 update(workspace_id,ad_account_id,target_cpa,target_cpl,target_cpr,target_roas) on public.lyads_alert_settings to authenticated;
create or replace function public.lyads_compute_alerts(target_account uuid, since_date date, until_date date)
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
 with campaign_events as (
 select campaign_id,case when count(public.lyads_primary_result(source_data))=count(*) and count(distinct public.lyads_primary_result(source_data))=1 then min(public.lyads_primary_result(source_data)) end result_event
 from public.lyads_ad_sets where ad_account_id=target_account and workspace_id=acct.workspace_id group by campaign_id
 ), daily as (
 select s.level,coalesce(s.ad_id,s.ad_set_id,s.campaign_id) entity_id,s.date_start,
 s.date_start>=since_date current_period,
 event.result_event,
 public.lyads_metric_number(s.metrics->>'spend') spend,
 public.lyads_metric_number(s.metrics->>'impressions') impressions,
 public.lyads_metric_number(s.metrics->>'clicks') clicks,
 public.lyads_metric_number(s.metrics->>'frequency') frequency,
 (select public.lyads_metric_number(x->>'value') from jsonb_array_elements(case when jsonb_typeof(s.metrics->'actions')='array' then s.metrics->'actions' else '[]'::jsonb end) x where x->>'action_type'=event.result_event limit 1) results,
 (select public.lyads_metric_number(x->>'value') from jsonb_array_elements(case when jsonb_typeof(s.metrics->'action_values')='array' then s.metrics->'action_values' else '[]'::jsonb end) x where x->>'action_type'='purchase' limit 1) revenue
 from public.lyads_insight_snapshots s
 left join public.lyads_ads ad on s.level='ad' and ad.id=s.ad_id and ad.ad_account_id=target_account
 left join public.lyads_ad_sets adset on adset.id=case when s.level='ad_set' then s.ad_set_id else ad.ad_set_id end and adset.ad_account_id=target_account
 left join campaign_events ce on s.level='campaign' and ce.campaign_id=s.campaign_id
 cross join lateral (select case when s.level='campaign' then ce.result_event else public.lyads_primary_result(adset.source_data) end result_event) event
 where s.ad_account_id=target_account and s.workspace_id=acct.workspace_id and s.currency=acct.currency
 and s.level in ('campaign','ad_set','ad') and s.date_start=s.date_stop
 and s.date_start between since_date-(until_date-since_date+1) and until_date
 and s.date_start < (now() at time zone acct.timezone_name)::date
 and coalesce(s.query_context->>'breakdowns','')=''
 ), totals as (
 select level,entity_id,result_event,current_period,count(*) source_rows,count(distinct date_start) days,
 case when count(spend)=count(*) then sum(spend) end spend,
 case when count(impressions)=count(*) then sum(impressions) end impressions,
 case when count(clicks)=count(*) then sum(clicks) end clicks,
 case when count(results)=count(*) then sum(results) end results,
 case when count(revenue)=count(*) then sum(revenue) end revenue,
 case when count(frequency)=count(*) then avg(frequency) end daily_frequency
 from daily group by level,entity_id,result_event,current_period
 ), measured as (
 select t.*,spend/nullif(results,0) cpa,case when result_event='purchase' then revenue/nullif(spend,0) end roas,clicks/nullif(impressions,0) ctr,
 coalesce(result_event is not null and source_rows=days and days>=cfg.min_days and spend>0 and spend>=cfg.min_spend and impressions>=cfg.min_impressions and clicks>=cfg.min_clicks and results>=cfg.min_purchases,false) sufficient
 from totals t
 ), eligible as (
 select m.*,coalesce(a.name,s.name,c.name) entity_name,s.campaign_id,
 case when m.result_event='purchase' then coalesce(cfg.target_cpa,cfg.target_cpr)
 when m.result_event in ('lead','complete_registration') then coalesce(cfg.target_cpl,cfg.target_cpr) else cfg.target_cpr end cost_target,
 ce.result_event campaign_event,
 s.source_data->>'optimization_goal' optimization_goal,s.source_data->'attribution_spec' attribution_spec
 from measured m
 left join public.lyads_ads a on m.level='ad' and a.id=m.entity_id
 left join public.lyads_ad_sets s on m.level='ad_set' and s.id=m.entity_id
 left join public.lyads_campaigns c on m.level='campaign' and c.id=m.entity_id
 left join campaign_events ce on ce.campaign_id=s.campaign_id
 where coalesce(a.effective_status,s.effective_status,c.effective_status)='ACTIVE'
 ), events as (
 select case when m.result_event='purchase' then 'cpa_high' when m.result_event in ('lead','complete_registration') then 'cpl_high' else 'cpr_high' end detector,m.level,m.entity_id,m.entity_name,80 priority,
 jsonb_build_object('observed',m.cpa,'threshold',m.cost_target*(1+cfg.cpa_excess),'target',m.cost_target,'spend',m.spend,'results',m.results,'result_event',m.result_event,'days',m.days) evidence
 from eligible m where m.current_period and m.sufficient and (m.level='campaign' or (m.level='ad_set' and m.campaign_event is null)) and m.cost_target is not null and m.cpa>m.cost_target*(1+cfg.cpa_excess)
 union all
 select 'roas_low',m.level,m.entity_id,m.entity_name,80,
 jsonb_build_object('observed',m.roas,'threshold',cfg.target_roas*(1-cfg.roas_shortfall),'target',cfg.target_roas,'spend',m.spend,'results',m.results,'result_event',m.result_event,'days',m.days)
 from eligible m where m.current_period and m.sufficient and (m.level='campaign' or (m.level='ad_set' and m.campaign_event is null)) and m.result_event='purchase' and cfg.target_roas is not null and m.roas<cfg.target_roas*(1-cfg.roas_shortfall)
 union all
 select 'creative_fatigue',m.level,m.entity_id,m.entity_name,70,
 jsonb_build_object('daily_frequency',m.daily_frequency,'frequency_threshold',cfg.fatigue_frequency,'ctr',m.ctr,'previous_ctr',p.ctr,'ctr_drop_threshold',cfg.fatigue_ctr_drop,'cpa',m.cpa,'previous_cpa',p.cpa,'cpa_rise_threshold',cfg.fatigue_cpa_rise,'spend',m.spend,'results',m.results,'result_event',m.result_event,'previous_results',p.results,'days',m.days,'previous_days',p.days)
 from eligible m join measured p on p.entity_id=m.entity_id and p.level=m.level and p.result_event=m.result_event and not p.current_period
 where m.level='ad' and m.current_period and m.sufficient and p.sufficient
 and until_date-since_date+1>=7
 and m.days>=greatest(6,ceil((until_date-since_date+1)*0.8)) and p.days>=greatest(6,ceil((until_date-since_date+1)*0.8))
 and m.daily_frequency>=cfg.fatigue_frequency and p.ctr>0 and m.ctr<=p.ctr*(1-cfg.fatigue_ctr_drop) and m.cpa>=p.cpa*(1+cfg.fatigue_cpa_rise)
 ), peers as (
 select m.*,min(m.cpa) over(partition by m.campaign_id,m.result_event,m.optimization_goal,m.attribution_spec) best_cpa,
 sum(m.spend) over(partition by m.campaign_id,m.result_event,m.optimization_goal,m.attribution_spec) total_spend,
 count(*) over(partition by m.campaign_id,m.result_event,m.optimization_goal,m.attribution_spec) peer_count
 from eligible m where m.level='ad_set' and m.current_period and m.sufficient and m.optimization_goal is not null and m.attribution_spec is not null
 -- Do not judge allocation if any active peer in this campaign lacks sufficient data.
 and not exists(select 1 from public.lyads_ad_sets s where s.campaign_id=m.campaign_id and s.effective_status='ACTIVE'
 and not exists(select 1 from eligible other where other.entity_id=s.id and other.level='ad_set' and other.current_period and other.sufficient))
 ), imbalance as (
 select 'budget_imbalance' detector,'campaign'::text level,campaign_id entity_id,
 (select name from public.lyads_campaigns c where c.id=campaign_id) entity_name,60 priority,
 jsonb_build_object('spend_share',sum(spend) filter(where cpa>=best_cpa*cfg.imbalance_cpa_ratio)/nullif(max(total_spend),0),
 'share_threshold',cfg.imbalance_share,'cpa_ratio_threshold',cfg.imbalance_cpa_ratio,'best_cpa',max(best_cpa),'spend',max(total_spend),
 'results',sum(results),'result_event',result_event,'days',min(days),'peer_count',max(peer_count)) evidence
 from peers where peer_count>=2
 group by campaign_id,result_event,optimization_goal,attribution_spec
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
 'needs_targets',exists(select 1 from eligible where current_period and (cost_target is null or (result_event='purchase' and cfg.target_roas is null))),
 'settings',jsonb_build_object('target_cpa',cfg.target_cpa,'target_cpl',cfg.target_cpl,'target_cpr',cfg.target_cpr,'target_roas',cfg.target_roas),'currency',acct.currency,'account_id',target_account,
 'since',since_date,'until',until_date,'previous_since',since_date-(until_date-since_date+1),'previous_until',since_date-1,
 'synchronized_at',acct.synchronized_at,'calculated_at',now(),'version','alerts-v2') into output;
 return output;
end $$;
create or replace function lyads_private.queue_alert_scan(target_account uuid,since_date date,until_date date,actor uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare acct public.lyads_ad_accounts; settings jsonb; job_id uuid; key text;
begin
 if since_date is null or until_date is null or until_date<since_date or until_date-since_date>89 then raise exception 'Invalid period' using errcode='22023'; end if;
 select * into acct from public.lyads_ad_accounts where id=target_account for update;
 if acct.id is null then raise exception 'Account denied' using errcode='42501'; end if;
 select to_jsonb(s) into settings from public.lyads_alert_settings s where s.ad_account_id=target_account;
 key:='alerts-v2:'||target_account||':'||since_date||':'||until_date||':'||md5(coalesce(acct.synchronized_at::text,'')||coalesce(settings::text,'')||(now() at time zone acct.timezone_name)::date::text);
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
commit;
