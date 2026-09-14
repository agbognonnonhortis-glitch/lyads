import type { SupabaseClient } from "@supabase/supabase-js";
import { blankOnboarding, completeness, stepPaths } from "./model";
export async function onboardingData(
  db: SupabaseClient,
  userId: string,
  requested?: string,
) {
  const { data: orgs, error } = await db
    .from("lyads_workspaces")
    .select("id,name,owner_id")
    .order("created_at")
    .limit(100);
  if (error) throw error;
  const org = requested
    ? orgs?.find((o) => o.id === requested)
    : orgs?.find((o) => o.owner_id === userId) || orgs?.[0];
  if (!org) throw new Error("ORGANIZATION_NOT_FOUND");
  const queries = await Promise.all([
    db
      .from("lyads_onboarding")
      .select("*")
      .eq("workspace_id", org.id)
      .maybeSingle(),
    db
      .from("lyads_meta_connections")
      .select(
        "id,granted_scopes,connection_status,checked_at,expires_at,token_checked_at,data_access_expires_at",
      )
      .eq("workspace_id", org.id)
      .is("revoked_at", null)
      .order("checked_at", { ascending: false })
      .limit(1),
    db
      .from("lyads_ad_accounts")
      .select(
        "id,name,meta_account_id,currency,timezone_name,account_status,synchronized_at,connection_id,business_meta_id",
      )
      .eq("workspace_id", org.id)
      .order("name")
      .limit(1000),
    db
      .from("lyads_meta_resources")
      .select("kind,meta_id,source_data,connection_id,fetched_at")
      .eq("workspace_id", org.id)
      .limit(5000),
    db
      .from("lyads_resource_links")
      .select("connection_id,kind,meta_id,scope_type,scope_id")
      .eq("workspace_id", org.id)
      .limit(5000),
    db
      .from("lyads_business_accounts")
      .select("business_meta_id,ad_account_id,connection_id")
      .eq("workspace_id", org.id)
      .limit(5000),
    db
      .from("lyads_jobs")
      .select("id,kind,status,error_code,result,progress_done,created_at")
      .eq("workspace_id", org.id)
      .in("kind", [
        "meta.inventory",
        "meta.discover",
        "meta.sync",
        "website.analyze",
      ])
      .order("created_at", { ascending: false })
      .limit(30),
    db
      .from("lyads_profiles")
      .select("display_name")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  for (const q of queries) if (q.error) throw q.error;
  const state = queries[0].data || blankOnboarding(org.id);
  const connection = queries[1].data?.[0] || null;
  return {
    organization: org,
    organizations: orgs,
    state,
    connection,
    accounts: queries[2].data || [],
    resources: (queries[3].data || []).filter(
      (r) => r.connection_id === connection?.id,
    ),
    links: (queries[4].data || []).filter(
      (r) => r.connection_id === connection?.id,
    ),
    businessAccounts: (queries[5].data || []).filter(
      (r) => r.connection_id === connection?.id,
    ),
    jobs: queries[6].data || [],
    displayName: queries[7].data?.display_name || "",
    completeness: completeness(state.brain),
    editable: org.owner_id === userId,
  };
}
export async function onboardingDestination(
  db: SupabaseClient,
  userId: string,
) {
  const { data: orgs, error } = await db
    .from("lyads_workspaces")
    .select("id,owner_id")
    .order("created_at")
    .limit(100);
  if (error) throw error;
  const org = orgs?.find((o) => o.owner_id === userId) || orgs?.[0];
  if (!org) return stepPaths[0];
  const { data, error: stateError } = await db
    .from("lyads_onboarding")
    .select("current_step,completed_at")
    .eq("workspace_id", org.id)
    .maybeSingle();
  if (stateError) throw stateError;
  return data?.completed_at
    ? "/app/tableau-de-bord"
    : stepPaths[Math.min(8, Math.max(0, (data?.current_step || 1) - 1))];
}
export type OnboardingData = Awaited<ReturnType<typeof onboardingData>>;
