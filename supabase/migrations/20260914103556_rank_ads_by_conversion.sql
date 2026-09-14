begin;
-- Resolve the configured result, never infer a purchase objective from incidental purchases.
create function public.lyads_primary_result(adset jsonb) returns text
language sql immutable security invoker set search_path='' as $$
 select case
 when nullif(adset->'promoted_object'->>'custom_conversion_id','') is not null
 then 'offsite_conversion.custom.'||(adset->'promoted_object'->>'custom_conversion_id')
 when adset->'promoted_object'->>'custom_event_type'='PURCHASE' then 'purchase'
 when adset->'promoted_object'->>'custom_event_type'='LEAD' then 'lead'
 when adset->'promoted_object'->>'custom_event_type'='COMPLETE_REGISTRATION' then 'complete_registration'
 when adset->'promoted_object'->>'custom_event_type'='ADD_TO_CART' then 'add_to_cart'
 when adset->'promoted_object'->>'custom_event_type'='INITIATED_CHECKOUT' then 'initiate_checkout'
 when nullif(adset->'promoted_object'->>'custom_event_type','') is not null then null
 when adset->>'optimization_goal'='LEAD_GENERATION' then 'lead'
 when adset->>'optimization_goal'='LINK_CLICKS' then 'link_click'
 when adset->>'optimization_goal'='LANDING_PAGE_VIEWS' then 'landing_page_view'
 when adset->>'optimization_goal'='POST_ENGAGEMENT' then 'post_engagement'
 when adset->>'optimization_goal'='PAGE_LIKES' then 'like'
 end
$$;
revoke all on function public.lyads_primary_result(jsonb) from public,anon;
grant execute on function public.lyads_primary_result(jsonb) to authenticated,service_role;

create function public.lyads_ranked_ads(target_workspace uuid,target_accounts uuid[],since_date date,until_date date)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare output jsonb;
begin
 if target_accounts is null or cardinality(target_accounts) not between 1 and 100 or since_date is null or until_date is null or until_date<since_date or until_date-since_date>89 then
 raise exception 'Invalid ranking period' using errcode='22023'; end if;
 if exists(select 1 from unnest(target_accounts) r(id) where not exists(select 1 from public.lyads_ad_accounts a where a.id=r.id and a.workspace_id=target_workspace)) then
 raise exception 'Account access denied' using errcode='42501'; end if;
 with source as (
 select a.id bucket,a.name,a.source_data->'creative'->>'thumbnail_url' thumbnail,s.currency,s.date_start,s.date_stop,
 public.lyads_primary_result(adset.source_data) result_event,
 public.lyads_metric_number(s.metrics->>'spend') spend,
 public.lyads_metric_number(s.metrics->>'impressions') impressions,
 public.lyads_metric_number(s.metrics->>'clicks') clicks,
 (select public.lyads_metric_number(x->>'value') from jsonb_array_elements(case when jsonb_typeof(s.metrics->'actions')='array' then s.metrics->'actions' else '[]'::jsonb end) x where x->>'action_type'=public.lyads_primary_result(adset.source_data) limit 1) results,
 (select public.lyads_metric_number(x->>'value') from jsonb_array_elements(case when jsonb_typeof(s.metrics->'action_values')='array' then s.metrics->'action_values' else '[]'::jsonb end) x where x->>'action_type'='purchase' limit 1) revenue,
 coalesce(cfg.min_days,3) min_days,coalesce(cfg.min_purchases,10) min_results,
 coalesce(cfg.min_spend,0) min_spend,coalesce(cfg.min_impressions,1000) min_impressions,coalesce(cfg.min_clicks,30) min_clicks
 from public.lyads_insight_snapshots s
 join public.lyads_ads a on a.id=s.ad_id and a.workspace_id=s.workspace_id and a.ad_account_id=s.ad_account_id
 join public.lyads_ad_sets adset on adset.id=a.ad_set_id and adset.workspace_id=a.workspace_id and adset.ad_account_id=a.ad_account_id
 left join public.lyads_alert_settings cfg on cfg.ad_account_id=s.ad_account_id
 where s.workspace_id=target_workspace and s.ad_account_id=any(target_accounts) and s.level='ad'
 and coalesce(s.query_context->>'breakdowns','')='' and s.date_start>=since_date and s.date_stop<=until_date
 -- Active and inactive entities are included; only the reporting period filters delivery.
 ), grouped as (
 select bucket,name,thumbnail,currency,result_event,count(*) source_rows,count(distinct date_start) observed_days,
 bool_and(date_start=date_stop) daily_only,
 case when count(spend)=count(*) then sum(spend) end spend,
 case when count(impressions)=count(*) then sum(impressions) end impressions,
 case when count(clicks)=count(*) then sum(clicks) end clicks,
 case when count(results)=count(*) then sum(results) end results,
 case when count(revenue)=count(*) then sum(revenue) end revenue,
 max(min_days) min_days,max(min_results) min_results,max(min_spend) min_spend,max(min_impressions) min_impressions,max(min_clicks) min_clicks
 from source group by bucket,name,thumbnail,currency,result_event
 ), evaluated as (
 select g.*,spend/nullif(results,0) cost_per_result,spend/nullif(clicks,0) cpc,
 case when result_event='purchase' then revenue/nullif(spend,0) end roas,
 coalesce(result_event is not null and daily_only and source_rows=observed_days and observed_days>=min_days and results>=min_results and spend>0 and spend>=min_spend and impressions>=min_impressions and clicks>=min_clicks,false) sufficient_data
 from grouped g
 ), ranked as (
 select e.*,row_number() over(partition by result_event,currency order by case when result_event='purchase' then roas end desc nulls last,cost_per_result asc,results desc,bucket) rank
 from evaluated e where sufficient_data and (result_event<>'purchase' or roas is not null)
 ) select jsonb_build_object(
 'rows',coalesce((select jsonb_agg(to_jsonb(r) order by result_event,currency,rank) from ranked r where rank<=5),'[]'::jsonb),
 'evaluatedAds',(select count(*) from evaluated),
 'unknownObjectiveAds',(select count(*) from evaluated where result_event is null),
 'insufficientDataAds',(select count(*) from evaluated where result_event is not null and not sufficient_data),
 'missingRoasAds',(select count(*) from evaluated where sufficient_data and result_event='purchase' and roas is null)
 ) into output;
 return output;
end $$;
revoke all on function public.lyads_ranked_ads(uuid,uuid[],date,date) from public,anon;
grant execute on function public.lyads_ranked_ads(uuid,uuid[],date,date) to authenticated;
commit;
