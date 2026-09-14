begin;
-- Every public read remains subject to RLS, including direct RPC calls.
create function public.lyads_dashboard_scope(target_workspace uuid,target_accounts uuid[],target_campaign uuid default null,target_ad_set uuid default null,include_options boolean default false)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if target_accounts is null or cardinality(target_accounts)>100 then raise exception 'Invalid accounts' using errcode='22023'; end if;
 if exists(select 1 from unnest(target_accounts) r(id) where not exists(select 1 from public.lyads_ad_accounts a where a.id=r.id and a.workspace_id=target_workspace)) then
 raise exception 'Account access denied' using errcode='42501'; end if;
 if target_campaign is not null and not exists(select 1 from public.lyads_campaigns c where c.id=target_campaign and c.workspace_id=target_workspace and c.ad_account_id=any(target_accounts)) then
 raise exception 'Campaign access denied' using errcode='42501'; end if;
 if target_ad_set is not null and (target_campaign is null or not exists(select 1 from public.lyads_ad_sets s where s.id=target_ad_set and s.campaign_id=target_campaign and s.workspace_id=target_workspace and s.ad_account_id=any(target_accounts))) then
 raise exception 'Ad set access denied' using errcode='42501'; end if;
 if not include_options then return '{}'::jsonb; end if;
 return jsonb_build_object(
 'campaigns',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'effective_status',c.effective_status,'ad_account_id',c.ad_account_id) order by (c.effective_status='ACTIVE') desc nulls last,c.name,c.id) from public.lyads_campaigns c where c.workspace_id=target_workspace and c.ad_account_id=any(target_accounts)),'[]'::jsonb),
 'adSets',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'effective_status',s.effective_status,'campaign_id',s.campaign_id) order by (s.effective_status='ACTIVE') desc nulls last,s.name,s.id) from public.lyads_ad_sets s where s.workspace_id=target_workspace and s.ad_account_id=any(target_accounts) and s.campaign_id=target_campaign),'[]'::jsonb));
end $$;
revoke all on function public.lyads_dashboard_scope(uuid,uuid[],uuid,uuid,boolean) from public,anon;
grant execute on function public.lyads_dashboard_scope(uuid,uuid[],uuid,uuid,boolean) to authenticated;
create function public.lyads_scoped_dashboard_metrics(target_workspace uuid, target_accounts uuid[], since_date date, until_date date, zone text,target_campaign uuid default null,target_ad_set uuid default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare output jsonb; begin
 perform public.lyads_dashboard_scope(target_workspace,target_accounts,target_campaign,target_ad_set);
 if target_accounts is null or cardinality(target_accounts) not between 1 and 100 or since_date is null or until_date is null or until_date<since_date or until_date-since_date>179
 or zone not in ('kpis','series','campaigns','placements','creatives') then raise exception 'Invalid dashboard query' using errcode='22023'; end if;
 -- Reject partial authorization instead of silently returning a subset. RLS is still applied below.
 if exists(select 1 from unnest(target_accounts) requested(id) where not exists(select 1 from public.lyads_ad_accounts a where a.id=requested.id and a.workspace_id=target_workspace)) then
 raise exception 'Account access denied' using errcode='42501'; end if;
 with source as (
 select s.*, case when zone='series' then s.date_start::text when zone='campaigns' then coalesce(s.campaign_id,parent.campaign_id)::text
 when zone='creatives' then s.ad_id::text when zone='placements' then coalesce(s.query_context->'breakdown_values'->>'publisher_platform','')||' / '||coalesce(s.query_context->'breakdown_values'->>'platform_position','')
 else case when s.date_start>=since_date then 'current' else 'previous' end end bucket,
 public.lyads_metric_number(metrics->>'spend') spend,
 public.lyads_metric_number(metrics->>'impressions') impressions,
 public.lyads_metric_number(metrics->>'clicks') clicks,
 (select public.lyads_metric_number(x->>'value') from jsonb_array_elements(case when jsonb_typeof(metrics->'actions')='array' then metrics->'actions' else '[]'::jsonb end) x where x->>'action_type'='purchase' limit 1) purchases,
 (select public.lyads_metric_number(x->>'value') from jsonb_array_elements(case when jsonb_typeof(metrics->'action_values')='array' then metrics->'action_values' else '[]'::jsonb end) x where x->>'action_type'='purchase' limit 1) revenue
 from public.lyads_insight_snapshots s
 left join public.lyads_ad_sets parent on parent.id=s.ad_set_id and parent.workspace_id=s.workspace_id and parent.ad_account_id=s.ad_account_id
 where s.workspace_id=target_workspace and s.ad_account_id=any(target_accounts)
 and s.date_start>=case when zone in ('kpis','series') then since_date-(until_date-since_date+1) else since_date end and s.date_stop<=until_date
 and (target_campaign is null or coalesce(s.campaign_id,parent.campaign_id)=target_campaign)
 and (target_ad_set is null or s.ad_set_id=target_ad_set)
 and s.level=case when target_ad_set is not null then 'ad_set' when target_campaign is not null then 'campaign' when zone='campaigns' then 'campaign' when zone='creatives' then 'ad' else 'account' end
 and coalesce(s.query_context->>'breakdowns','')=case when zone='placements' then 'publisher_platform,platform_position' else '' end
 ), grouped as (
 select bucket,currency,count(*) rows,count(distinct date_start) observed_days,count(distinct ad_account_id) accounts_count,
 case when count(spend)=count(*) then sum(spend) end spend,
 case when count(impressions)=count(*) then sum(impressions) end impressions,
 case when count(clicks)=count(*) then sum(clicks) end clicks,
 case when count(purchases)=count(*) then sum(purchases) end purchases,
 case when count(revenue)=count(*) then sum(revenue) end revenue
 from source group by bucket,currency
 ), ranked as (
 select g.*,g.spend/nullif(g.clicks,0) cpc,g.spend/nullif(g.purchases,0) cpa,g.revenue/nullif(g.spend,0) roas,
 case when zone='campaigns' then (select c.name from public.lyads_campaigns c where c.id::text=g.bucket)
 when zone='creatives' then (select a.name from public.lyads_ads a where a.id::text=g.bucket) else g.bucket end name,
 case when zone='creatives' then (select a.source_data->'creative'->>'thumbnail_url' from public.lyads_ads a where a.id::text=g.bucket) end thumbnail
 from grouped g order by case when zone in ('campaigns','placements','creatives') then g.spend end desc nulls last,g.bucket,g.currency
 limit case when zone='creatives' then 5 when zone in ('campaigns','placements') then 50 else 400 end
 ) select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into output from ranked r;
 return output;
end $$;
revoke all on function public.lyads_scoped_dashboard_metrics(uuid,uuid[],date,date,text,uuid,uuid) from public,anon;
grant execute on function public.lyads_scoped_dashboard_metrics(uuid,uuid[],date,date,text,uuid,uuid) to authenticated;
create function public.lyads_scoped_account_ads(target_workspace uuid,target_accounts uuid[],since_date date,until_date date,page_offset integer default 0,page_size integer default 5,target_campaign uuid default null,target_ad_set uuid default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare output jsonb;
begin
 perform public.lyads_dashboard_scope(target_workspace,target_accounts,target_campaign,target_ad_set);
 if page_offset is null or page_offset<0 or page_offset>1000000 or page_size is null or page_size not between 1 and 100 then
 raise exception 'Invalid page' using errcode='22023'; end if;
 if target_accounts is null or cardinality(target_accounts) not between 1 and 100 or since_date is null or until_date is null or until_date<since_date or until_date-since_date>89 then
 raise exception 'Invalid ranking period' using errcode='22023'; end if;
 if exists(select 1 from unnest(target_accounts) r(id) where not exists(select 1 from public.lyads_ad_accounts a where a.id=r.id and a.workspace_id=target_workspace)) then
 raise exception 'Account access denied' using errcode='42501'; end if;
 with source as (
 select a.id bucket,a.name,a.source_data->'creative'->>'thumbnail_url' thumbnail,coalesce(s.currency,account.currency) currency,s.date_start,s.date_stop,
 public.lyads_primary_result(adset.source_data) result_event,
 public.lyads_metric_number(s.metrics->>'spend') spend,
 public.lyads_metric_number(s.metrics->>'impressions') impressions,
 public.lyads_metric_number(s.metrics->>'clicks') clicks,
 (select public.lyads_metric_number(x->>'value') from jsonb_array_elements(case when jsonb_typeof(s.metrics->'actions')='array' then s.metrics->'actions' else '[]'::jsonb end) x where x->>'action_type'=public.lyads_primary_result(adset.source_data) limit 1) results,
 (select public.lyads_metric_number(x->>'value') from jsonb_array_elements(case when jsonb_typeof(s.metrics->'action_values')='array' then s.metrics->'action_values' else '[]'::jsonb end) x where x->>'action_type'='purchase' limit 1) revenue
 from public.lyads_ads a
 join public.lyads_ad_accounts account on account.id=a.ad_account_id and account.workspace_id=a.workspace_id
 left join public.lyads_ad_sets adset on adset.id=a.ad_set_id and adset.workspace_id=a.workspace_id and adset.ad_account_id=a.ad_account_id
 left join public.lyads_insight_snapshots s on a.id=s.ad_id and a.workspace_id=s.workspace_id and a.ad_account_id=s.ad_account_id
 and s.level='ad' and coalesce(s.query_context->>'breakdowns','')=''
 and s.date_start>=since_date and s.date_stop<=until_date
 where a.workspace_id=target_workspace and a.ad_account_id=any(target_accounts)
 and (target_campaign is null or adset.campaign_id=target_campaign)
 and (target_ad_set is null or a.ad_set_id=target_ad_set)
 -- Include every imported ad, including active ads with no metrics in this period.
 ), grouped as (
 select bucket,name,thumbnail,currency,result_event,count(date_start) source_rows,count(distinct date_start) observed_days,
 bool_and(date_start=date_stop) daily_only,
 case when count(spend)=count(*) then sum(spend) end spend,
 case when count(impressions)=count(*) then sum(impressions) end impressions,
 case when count(clicks)=count(*) then sum(clicks) end clicks,
 case when count(results)=count(*) then sum(results) end results,
 case when count(revenue)=count(*) then sum(revenue) end revenue
 from source group by bucket,name,thumbnail,currency,result_event
 ), evaluated as (
 select g.*,spend/nullif(results,0) cost_per_result,spend/nullif(clicks,0) cpc,
 case when result_event='purchase' then revenue/nullif(spend,0) end roas
 from grouped g
 ), event_ranked as (
 -- No spend, age, impression or conversion-volume threshold gates this listing.
 select e.*,row_number() over(partition by result_event,currency order by
 case when result_event='purchase' then roas end desc nulls last,
 cost_per_result asc nulls last,results desc nulls last,bucket) event_rank,
 (cost_per_result is not null) rankable,
 case when result_event='purchase' then roas/nullif(max(roas) over(partition by result_event,currency),0)
 when cost_per_result=0 then 1
 else min(cost_per_result) over(partition by result_event,currency)/nullif(cost_per_result,0) end bar_ratio
 from evaluated e
 ), ranked as (
 -- Interleave each event's best ads without comparing unlike conversion costs.
 select e.*,row_number() over(order by rankable desc,event_rank,(result_event='purchase') desc nulls last,result_event nulls last,currency,bucket) rank
 from event_ranked e
 ), page as (
 select * from ranked order by rank limit page_size offset page_offset
 ) select jsonb_build_object(
 'rows',coalesce((select jsonb_agg(to_jsonb(r) order by rank) from page r),'[]'::jsonb),
 'totalAds',(select count(*) from ranked),
 'rankedAds',(select count(*) from ranked where rankable),
 'nextOffset',case when page_offset+page_size<(select count(*) from ranked) then page_offset+page_size end
 ) into output;
 return output;
end $$;
revoke all on function public.lyads_scoped_account_ads(uuid,uuid[],date,date,integer,integer,uuid,uuid) from public,anon;
grant execute on function public.lyads_scoped_account_ads(uuid,uuid[],date,date,integer,integer,uuid,uuid) to authenticated;

-- Filter cached, account-wide performance detections through the validated hierarchy.
-- Technical connection problems stay applicable to the whole selected account.
create function public.lyads_scoped_performance_alerts(target_workspace uuid,target_accounts uuid[],target_campaign uuid,target_ad_set uuid,alerts jsonb)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare output jsonb;
begin
 perform public.lyads_dashboard_scope(target_workspace,target_accounts,target_campaign,target_ad_set);
 select coalesce(jsonb_agg(r.value order by r.position),'[]'::jsonb) into output
 from jsonb_array_elements(alerts) with ordinality r(value,position)
 where (r.value->>'account_id')::uuid=any(target_accounts)
 and ((target_campaign is null and target_ad_set is null)
 or (r.value->>'level'='campaign' and target_ad_set is null and (r.value->>'entity_id')::uuid=target_campaign)
 or (r.value->>'level'='ad_set' and exists(select 1 from public.lyads_ad_sets s where s.id=(r.value->>'entity_id')::uuid and s.workspace_id=target_workspace and s.ad_account_id=any(target_accounts) and s.campaign_id=target_campaign and (target_ad_set is null or s.id=target_ad_set)))
 or (r.value->>'level'='ad' and exists(select 1 from public.lyads_ads a join public.lyads_ad_sets s on s.id=a.ad_set_id and s.workspace_id=a.workspace_id and s.ad_account_id=a.ad_account_id where a.id=(r.value->>'entity_id')::uuid and a.workspace_id=target_workspace and a.ad_account_id=any(target_accounts) and s.campaign_id=target_campaign and (target_ad_set is null or s.id=target_ad_set))));
 return output;
end $$;
revoke all on function public.lyads_scoped_performance_alerts(uuid,uuid[],uuid,uuid,jsonb) from public,anon;
grant execute on function public.lyads_scoped_performance_alerts(uuid,uuid[],uuid,uuid,jsonb) to authenticated;
commit;
