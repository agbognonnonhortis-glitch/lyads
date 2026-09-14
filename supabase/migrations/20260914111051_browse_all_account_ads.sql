begin;
-- A paginated account-wide inventory, with performance ranks only for sufficient data.
create function public.lyads_account_ads(target_workspace uuid,target_accounts uuid[],since_date date,until_date date,page_offset integer default 0,page_size integer default 10)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare output jsonb;
begin
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
 (select public.lyads_metric_number(x->>'value') from jsonb_array_elements(case when jsonb_typeof(s.metrics->'action_values')='array' then s.metrics->'action_values' else '[]'::jsonb end) x where x->>'action_type'='purchase' limit 1) revenue,
 coalesce(cfg.min_days,3) min_days,coalesce(cfg.min_purchases,10) min_results,
 coalesce(cfg.min_spend,0) min_spend,coalesce(cfg.min_impressions,1000) min_impressions,coalesce(cfg.min_clicks,30) min_clicks
 from public.lyads_ads a
 join public.lyads_ad_accounts account on account.id=a.ad_account_id and account.workspace_id=a.workspace_id
 left join public.lyads_ad_sets adset on adset.id=a.ad_set_id and adset.workspace_id=a.workspace_id and adset.ad_account_id=a.ad_account_id
 left join public.lyads_insight_snapshots s on a.id=s.ad_id and a.workspace_id=s.workspace_id and a.ad_account_id=s.ad_account_id
 and s.level='ad' and coalesce(s.query_context->>'breakdowns','')=''
 and s.date_start>=since_date and s.date_stop<=until_date
 left join public.lyads_alert_settings cfg on cfg.ad_account_id=a.ad_account_id
 where a.workspace_id=target_workspace and a.ad_account_id=any(target_accounts)
 -- Include every imported ad, including active ads with no metrics in this period.
 ), grouped as (
 select bucket,name,thumbnail,currency,result_event,count(date_start) source_rows,count(distinct date_start) observed_days,
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
 ), qualified as (
 select e.*, sufficient_data and (result_event<>'purchase' or roas is not null) rankable
 from evaluated e
 ), ranked as (
 select e.*,
 case when rankable then row_number() over(partition by result_event,currency,rankable
 order by case when result_event='purchase' then roas end desc nulls last,cost_per_result asc,results desc,bucket) end rank,
 case when rankable then
   case when result_event='purchase' then roas/nullif(max(roas) filter(where rankable) over(partition by result_event,currency),0)
   else min(cost_per_result) filter(where rankable) over(partition by result_event,currency)/nullif(cost_per_result,0) end
 end bar_ratio
 from qualified e
 ), page as (
 select * from ranked order by rankable desc,result_event nulls last,currency,rank nulls last,name,bucket
 limit page_size offset page_offset
 ) select jsonb_build_object(
 'rows',coalesce((select jsonb_agg(to_jsonb(r) order by rankable desc,result_event nulls last,currency,rank nulls last,name,bucket) from page r),'[]'::jsonb),
 'totalAds',(select count(*) from ranked),
 'rankedAds',(select count(*) from ranked where rankable),
 'nextOffset',case when page_offset+page_size<(select count(*) from ranked) then page_offset+page_size end
 ) into output;
 return output;
end $$;
revoke all on function public.lyads_account_ads(uuid,uuid[],date,date,integer,integer) from public,anon;
grant execute on function public.lyads_account_ads(uuid,uuid[],date,date,integer,integer) to authenticated;
commit;
