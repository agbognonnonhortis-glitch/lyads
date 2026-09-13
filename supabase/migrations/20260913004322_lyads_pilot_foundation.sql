-- Lyads pilot foundation. Review against the remote schema before applying.
-- No demo records, credentials, billing defaults or automatic Meta actions.
begin;

create table public.lyads_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 200),
  created_at timestamptz not null default now()
);

create table public.lyads_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 200),
  created_at timestamptz not null default now()
);
create index lyads_workspaces_owner_idx on public.lyads_workspaces(owner_id);

create table public.lyads_meta_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.lyads_workspaces(id) on delete restrict,
  meta_user_id text not null check (length(meta_user_id) > 0),
  granted_scopes text[] not null default '{}',
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, meta_user_id)
);
comment on table public.lyads_meta_connections is
  'Non-secret connection metadata only. OAuth tokens must remain in a server-only secret store.';

create table public.lyads_ad_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.lyads_workspaces(id) on delete restrict,
  connection_id uuid not null,
  meta_account_id text not null check (length(meta_account_id) > 0),
  name text not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  timezone_name text not null,
  access_mode text not null default 'read_only' check (access_mode in ('read_only', 'manage')),
  synchronized_at timestamptz,
  unique (workspace_id, id),
  unique (workspace_id, meta_account_id),
  foreign key (workspace_id, connection_id)
    references public.lyads_meta_connections(workspace_id, id) on delete restrict
);
create index lyads_ad_accounts_connection_idx on public.lyads_ad_accounts(workspace_id, connection_id);

create table public.lyads_campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  ad_account_id uuid not null,
  meta_campaign_id text not null check (length(meta_campaign_id) > 0),
  name text not null,
  effective_status text,
  source_data jsonb not null check (jsonb_typeof(source_data) = 'object'),
  synchronized_at timestamptz not null,
  unique (workspace_id, ad_account_id, id),
  unique (workspace_id, ad_account_id, meta_campaign_id),
  foreign key (workspace_id, ad_account_id)
    references public.lyads_ad_accounts(workspace_id, id) on delete restrict
);

create table public.lyads_ad_sets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  ad_account_id uuid not null,
  campaign_id uuid not null,
  meta_ad_set_id text not null check (length(meta_ad_set_id) > 0),
  name text not null,
  effective_status text,
  source_data jsonb not null check (jsonb_typeof(source_data) = 'object'),
  synchronized_at timestamptz not null,
  unique (workspace_id, ad_account_id, id),
  unique (workspace_id, ad_account_id, meta_ad_set_id),
  foreign key (workspace_id, ad_account_id)
    references public.lyads_ad_accounts(workspace_id, id) on delete restrict,
  foreign key (workspace_id, ad_account_id, campaign_id)
    references public.lyads_campaigns(workspace_id, ad_account_id, id) on delete restrict
);
create index lyads_ad_sets_parent_idx on public.lyads_ad_sets(workspace_id, ad_account_id, campaign_id);

create table public.lyads_ads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  ad_account_id uuid not null,
  ad_set_id uuid not null,
  meta_ad_id text not null check (length(meta_ad_id) > 0),
  name text not null,
  effective_status text,
  source_data jsonb not null check (jsonb_typeof(source_data) = 'object'),
  synchronized_at timestamptz not null,
  unique (workspace_id, ad_account_id, id),
  unique (workspace_id, ad_account_id, meta_ad_id),
  foreign key (workspace_id, ad_account_id)
    references public.lyads_ad_accounts(workspace_id, id) on delete restrict,
  foreign key (workspace_id, ad_account_id, ad_set_id)
    references public.lyads_ad_sets(workspace_id, ad_account_id, id) on delete restrict
);
create index lyads_ads_parent_idx on public.lyads_ads(workspace_id, ad_account_id, ad_set_id);

create table public.lyads_sync_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  ad_account_id uuid not null,
  request_key text not null check (length(request_key) > 0),
  status text not null default 'pending' check (status in ('pending','running','succeeded','failed')),
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  unique (workspace_id, ad_account_id, id),
  unique (workspace_id, ad_account_id, request_key),
  foreign key (workspace_id, ad_account_id)
    references public.lyads_ad_accounts(workspace_id, id) on delete restrict,
  check (completed_at is null or (started_at is not null and completed_at >= started_at))
);

create table public.lyads_insight_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  ad_account_id uuid not null,
  sync_run_id uuid not null,
  campaign_id uuid,
  ad_set_id uuid,
  ad_id uuid,
  level text not null check (level in ('account','campaign','ad_set','ad')),
  date_start date not null,
  date_stop date not null check (date_stop >= date_start),
  -- Complete canonical request: attribution, breakdowns, fields, API version,
  -- account timezone and all other parameters affecting interpretation.
  query_context jsonb not null check (jsonb_typeof(query_context) = 'object'),
  -- Canonical identity of query + entity + period + breakdown values.
  deduplication_key text not null check (length(deduplication_key) > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  metrics jsonb not null check (jsonb_typeof(metrics) = 'object'),
  fetched_at timestamptz not null,
  unique (workspace_id, ad_account_id, id),
  unique (workspace_id, ad_account_id, deduplication_key),
  foreign key (workspace_id, ad_account_id)
    references public.lyads_ad_accounts(workspace_id, id) on delete restrict,
  foreign key (workspace_id, ad_account_id, sync_run_id)
    references public.lyads_sync_runs(workspace_id, ad_account_id, id) on delete restrict,
  foreign key (workspace_id, ad_account_id, campaign_id)
    references public.lyads_campaigns(workspace_id, ad_account_id, id) on delete restrict,
  foreign key (workspace_id, ad_account_id, ad_set_id)
    references public.lyads_ad_sets(workspace_id, ad_account_id, id) on delete restrict,
  foreign key (workspace_id, ad_account_id, ad_id)
    references public.lyads_ads(workspace_id, ad_account_id, id) on delete restrict,
  check (
    (level = 'account' and campaign_id is null and ad_set_id is null and ad_id is null) or
    (level = 'campaign' and campaign_id is not null and ad_set_id is null and ad_id is null) or
    (level = 'ad_set' and campaign_id is null and ad_set_id is not null and ad_id is null) or
    (level = 'ad' and campaign_id is null and ad_set_id is null and ad_id is not null)
  )
);
comment on column public.lyads_insight_snapshots.metrics is
  'Source values only; absent metrics stay absent. Monetary decimal strings must not be coerced to float. Derived and estimated metrics belong in analyses.';
create index lyads_insights_period_idx on public.lyads_insight_snapshots(workspace_id, ad_account_id, date_start, date_stop);
create index lyads_insights_sync_idx on public.lyads_insight_snapshots(workspace_id, ad_account_id, sync_run_id);
create index lyads_insights_campaign_idx on public.lyads_insight_snapshots(workspace_id, ad_account_id, campaign_id);
create index lyads_insights_ad_set_idx on public.lyads_insight_snapshots(workspace_id, ad_account_id, ad_set_id);
create index lyads_insights_ad_idx on public.lyads_insight_snapshots(workspace_id, ad_account_id, ad_id);

create table public.lyads_analyses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  ad_account_id uuid not null,
  sync_run_id uuid not null,
  request_key text not null check (length(request_key) > 0),
  kind text not null check (kind in ('scan','full_analysis')),
  status text not null default 'pending' check (status in ('pending','running','succeeded','failed')),
  date_start date not null,
  date_stop date not null check (date_stop >= date_start),
  processor_version text not null,
  -- Immutable input copied by the worker; remains traceable if later syncs update insights.
  input_snapshot jsonb not null check (jsonb_typeof(input_snapshot) = 'object'),
  result jsonb check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  error_code text,
  unique (workspace_id, ad_account_id, id),
  unique (workspace_id, ad_account_id, request_key),
  foreign key (workspace_id, ad_account_id, sync_run_id)
    references public.lyads_sync_runs(workspace_id, ad_account_id, id) on delete restrict
);
create index lyads_analyses_sync_idx on public.lyads_analyses(workspace_id, ad_account_id, sync_run_id);

create table public.lyads_recommendations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  ad_account_id uuid not null,
  analysis_id uuid not null,
  recommendation_key text not null check (length(recommendation_key) > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  unique (workspace_id, ad_account_id, id),
  unique (workspace_id, ad_account_id, analysis_id, recommendation_key),
  foreign key (workspace_id, ad_account_id, analysis_id)
    references public.lyads_analyses(workspace_id, ad_account_id, id) on delete restrict
);

create table public.lyads_action_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  ad_account_id uuid not null,
  recommendation_id uuid,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (length(event_type) > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (workspace_id, ad_account_id)
    references public.lyads_ad_accounts(workspace_id, id) on delete restrict,
  foreign key (workspace_id, ad_account_id, recommendation_id)
    references public.lyads_recommendations(workspace_id, ad_account_id, id) on delete restrict
);
create index lyads_events_account_time_idx on public.lyads_action_events(workspace_id, ad_account_id, created_at);
create index lyads_events_recommendation_idx on public.lyads_action_events(workspace_id, ad_account_id, recommendation_id);
create index lyads_events_actor_idx on public.lyads_action_events(actor_id);

alter table public.lyads_profiles enable row level security;
revoke all on table public.lyads_profiles from public, anon, authenticated, service_role;
grant select on table public.lyads_profiles to authenticated;
grant select, insert, update, delete on table public.lyads_profiles to service_role;
create policy lyads_profiles_owner_read on public.lyads_profiles
  for select to authenticated using (user_id = (select auth.uid()));

alter table public.lyads_workspaces enable row level security;
revoke all on table public.lyads_workspaces from public, anon, authenticated, service_role;
grant select on table public.lyads_workspaces to authenticated;
grant select, insert, update, delete on table public.lyads_workspaces to service_role;
create policy lyads_workspaces_owner_read on public.lyads_workspaces
  for select to authenticated using (owner_id = (select auth.uid()));

alter table public.lyads_meta_connections enable row level security;
revoke all on table public.lyads_meta_connections from public, anon, authenticated, service_role;
grant select on table public.lyads_meta_connections to authenticated;
grant select, insert, update, delete on table public.lyads_meta_connections to service_role;
create policy lyads_meta_connections_owner_read on public.lyads_meta_connections
  for select to authenticated using (workspace_id in (select id from public.lyads_workspaces where owner_id = (select auth.uid())));

alter table public.lyads_ad_accounts enable row level security;
revoke all on table public.lyads_ad_accounts from public, anon, authenticated, service_role;
grant select on table public.lyads_ad_accounts to authenticated;
grant select, insert, update, delete on table public.lyads_ad_accounts to service_role;
create policy lyads_ad_accounts_owner_read on public.lyads_ad_accounts
  for select to authenticated using (workspace_id in (select id from public.lyads_workspaces where owner_id = (select auth.uid())));

alter table public.lyads_campaigns enable row level security;
revoke all on table public.lyads_campaigns from public, anon, authenticated, service_role;
grant select on table public.lyads_campaigns to authenticated;
grant select, insert, update, delete on table public.lyads_campaigns to service_role;
create policy lyads_campaigns_owner_read on public.lyads_campaigns
  for select to authenticated using (workspace_id in (select id from public.lyads_workspaces where owner_id = (select auth.uid())));

alter table public.lyads_ad_sets enable row level security;
revoke all on table public.lyads_ad_sets from public, anon, authenticated, service_role;
grant select on table public.lyads_ad_sets to authenticated;
grant select, insert, update, delete on table public.lyads_ad_sets to service_role;
create policy lyads_ad_sets_owner_read on public.lyads_ad_sets
  for select to authenticated using (workspace_id in (select id from public.lyads_workspaces where owner_id = (select auth.uid())));

alter table public.lyads_ads enable row level security;
revoke all on table public.lyads_ads from public, anon, authenticated, service_role;
grant select on table public.lyads_ads to authenticated;
grant select, insert, update, delete on table public.lyads_ads to service_role;
create policy lyads_ads_owner_read on public.lyads_ads
  for select to authenticated using (workspace_id in (select id from public.lyads_workspaces where owner_id = (select auth.uid())));

alter table public.lyads_sync_runs enable row level security;
revoke all on table public.lyads_sync_runs from public, anon, authenticated, service_role;
grant select on table public.lyads_sync_runs to authenticated;
grant select, insert, update, delete on table public.lyads_sync_runs to service_role;
create policy lyads_sync_runs_owner_read on public.lyads_sync_runs
  for select to authenticated using (workspace_id in (select id from public.lyads_workspaces where owner_id = (select auth.uid())));

alter table public.lyads_insight_snapshots enable row level security;
revoke all on table public.lyads_insight_snapshots from public, anon, authenticated, service_role;
grant select on table public.lyads_insight_snapshots to authenticated;
grant select, insert, update, delete on table public.lyads_insight_snapshots to service_role;
create policy lyads_insight_snapshots_owner_read on public.lyads_insight_snapshots
  for select to authenticated using (workspace_id in (select id from public.lyads_workspaces where owner_id = (select auth.uid())));

alter table public.lyads_analyses enable row level security;
revoke all on table public.lyads_analyses from public, anon, authenticated, service_role;
grant select on table public.lyads_analyses to authenticated;
grant select, insert, update, delete on table public.lyads_analyses to service_role;
create policy lyads_analyses_owner_read on public.lyads_analyses
  for select to authenticated using (workspace_id in (select id from public.lyads_workspaces where owner_id = (select auth.uid())));

alter table public.lyads_recommendations enable row level security;
revoke all on table public.lyads_recommendations from public, anon, authenticated, service_role;
grant select on table public.lyads_recommendations to authenticated;
grant select, insert, update, delete on table public.lyads_recommendations to service_role;
create policy lyads_recommendations_owner_read on public.lyads_recommendations
  for select to authenticated using (workspace_id in (select id from public.lyads_workspaces where owner_id = (select auth.uid())));

alter table public.lyads_action_events enable row level security;
revoke all on table public.lyads_action_events from public, anon, authenticated, service_role;
grant select on table public.lyads_action_events to authenticated;
grant select, insert on table public.lyads_action_events to service_role;
create policy lyads_action_events_owner_read on public.lyads_action_events
  for select to authenticated using (workspace_id in (select id from public.lyads_workspaces where owner_id = (select auth.uid())));

-- Only onboarding names are directly editable by clients. Ownership columns
-- cannot be changed, and imported metrics, access modes and agent outputs are server-written.
grant insert (user_id, display_name), update (display_name) on public.lyads_profiles to authenticated;
create policy lyads_profiles_owner_insert on public.lyads_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy lyads_profiles_owner_update on public.lyads_profiles
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant insert (owner_id, name), update (name) on public.lyads_workspaces to authenticated;
create policy lyads_workspaces_owner_insert on public.lyads_workspaces
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy lyads_workspaces_owner_update on public.lyads_workspaces
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

commit;
