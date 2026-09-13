begin;
-- Numeric arithmetic stays in PostgreSQL. Missing or malformed source values stay NULL.
create function public.lyads_metric_number(value text) returns numeric
language sql immutable security invoker set search_path='' as $$
 select case when length(value)<=40 and value ~ '^[0-9]+([.][0-9]+)?$' then value::numeric end
$$;
revoke all on function public.lyads_metric_number(text) from public,anon;
grant execute on function public.lyads_metric_number(text) to authenticated,service_role;

create function public.lyads_dashboard_metrics(target_workspace uuid, target_accounts uuid[], since_date date, until_date date, zone text)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare output jsonb; begin
 if target_accounts is null or cardinality(target_accounts) not between 1 and 100 or since_date is null or until_date is null or until_date<since_date or until_date-since_date>179
 or zone not in ('kpis','series','campaigns','placements','creatives') then raise exception 'Invalid dashboard query' using errcode='22023'; end if;
 -- Reject partial authorization instead of silently returning a subset. RLS is still applied below.
 if exists(select 1 from unnest(target_accounts) requested(id) where not exists(select 1 from public.lyads_ad_accounts a where a.id=requested.id and a.workspace_id=target_workspace)) then
 raise exception 'Account access denied' using errcode='42501'; end if;
 with source as (
 select s.*, case when zone='series' then s.date_start::text when zone='campaigns' then s.campaign_id::text
 when zone='creatives' then s.ad_id::text when zone='placements' then coalesce(s.query_context->'breakdown_values'->>'publisher_platform','')||' / '||coalesce(s.query_context->'breakdown_values'->>'platform_position','')
 else case when s.date_start>=since_date then 'current' else 'previous' end end bucket,
 public.lyads_metric_number(metrics->>'spend') spend,
 public.lyads_metric_number(metrics->>'impressions') impressions,
 public.lyads_metric_number(metrics->>'clicks') clicks,
 (select public.lyads_metric_number(x->>'value') from jsonb_array_elements(case when jsonb_typeof(metrics->'actions')='array' then metrics->'actions' else '[]'::jsonb end) x where x->>'action_type'='purchase' limit 1) purchases,
 (select public.lyads_metric_number(x->>'value') from jsonb_array_elements(case when jsonb_typeof(metrics->'action_values')='array' then metrics->'action_values' else '[]'::jsonb end) x where x->>'action_type'='purchase' limit 1) revenue
 from public.lyads_insight_snapshots s
 where s.workspace_id=target_workspace and s.ad_account_id=any(target_accounts)
 and s.date_start>=case when zone in ('kpis','series') then since_date-(until_date-since_date+1) else since_date end and s.date_stop<=until_date
 and s.level=case when zone='campaigns' then 'campaign' when zone='creatives' then 'ad' else 'account' end
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
revoke all on function public.lyads_dashboard_metrics(uuid,uuid[],date,date,text) from public,anon;
grant execute on function public.lyads_dashboard_metrics(uuid,uuid[],date,date,text) to authenticated;
create index lyads_dashboard_insights_idx on public.lyads_insight_snapshots(workspace_id,ad_account_id,level,date_start);
commit;
