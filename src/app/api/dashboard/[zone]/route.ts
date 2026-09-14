import { NextRequest } from "next/server";
import { authenticated, apiFailure, ApiError, uuid } from "@/lib/backend/http";
import {
  dashboardZones,
  periodDates,
  freshness,
  connectionIssues,
} from "@/lib/dashboard/model";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ zone: string }> },
) {
  try {
    const { zone } = await context.params;
    if (!dashboardZones.includes(zone as (typeof dashboardZones)[number]))
      throw new ApiError("NOT_FOUND", 404, "Cette zone n’existe pas.");
    const client = await authenticated(request),
      q = request.nextUrl.searchParams;
    const organization = q.get("organization");
    if (!uuid(organization))
      throw new ApiError(
        "INVALID_ORGANIZATION",
        400,
        "Sélectionnez votre entreprise.",
      );
    const role = await client.supabase.rpc("lyads_organization_role", {
      target_workspace: organization,
    });
    if (role.error) throw role.error;
    if (!role.data)
      throw new ApiError(
        "ACCESS_DENIED",
        403,
        "Demandez un accès à cette entreprise.",
      );
    const [accountsResult, onboarding] = await Promise.all([
      client.supabase
        .from("lyads_ad_accounts")
        .select("id,name,currency,timezone_name,synchronized_at,connection_id")
        .eq("workspace_id", organization)
        .order("name")
        .limit(1000),
      client.supabase
        .from("lyads_onboarding")
        .select("ad_account_ids")
        .eq("workspace_id", organization)
        .maybeSingle(),
    ]);
    if (accountsResult.error || onboarding.error)
      throw accountsResult.error || onboarding.error;
    const connected: string[] = onboarding.data?.ad_account_ids || [];
    const available = (accountsResult.data || []).filter((a) =>
      connected.includes(a.id),
    );
    const defaultAccount = connected.find((id) =>
      available.some((a) => a.id === id),
    );
    const requestedAccounts = q.get("accounts");
    if (requestedAccounts !== null && !requestedAccounts.trim())
      throw new ApiError(
        "INVALID_ACCOUNT",
        400,
        "Sélectionnez un compte publicitaire.",
      );
    const ids = [
      ...new Set(
        (requestedAccounts ?? defaultAccount ?? "").split(",").filter(Boolean),
      ),
    ];
    if (
      ids.length > 100 ||
      ids.some((id) => !uuid(id) || !available.some((a) => a.id === id))
    )
      throw new ApiError(
        "ACCESS_DENIED",
        403,
        "Sélectionnez un compte publicitaire connecté à cette entreprise.",
      );
    const accounts = available.filter((a) => ids.includes(a.id));
    let issues: ReturnType<typeof connectionIssues> = [];
    if (["context", "alerts"].includes(zone) && accounts.length) {
      const connections = await client.supabase
        .from("lyads_meta_connections")
        .select(
          "id,connection_status,token_checked_at,expires_at,data_access_expires_at,revoked_at,granted_scopes",
        )
        .eq("workspace_id", organization)
        .in("id", [...new Set(accounts.map((a) => a.connection_id))]);
      if (connections.error) throw connections.error;
      issues = connectionIssues(connections.data || []);
    }
    const fresh = freshness(accounts);
    const common = {
      freshness: fresh,
      selected: ids,
      currency:
        new Set(accounts.map((a) => a.currency)).size === 1
          ? accounts[0].currency
          : null,
      sufficientData: false,
      sufficiencyReason:
        "Les seuils de jugement de performance ne sont pas encore configurés.",
      conversionMetric: "purchase",
    };
    if (zone === "context") {
      const [jobs, credits, profile] = await Promise.all([
        ids.length
          ? client.supabase
              .from("lyads_jobs")
              .select(
                "id,ad_account_id,status,progress_done,progress_total,result,error_code,created_at",
              )
              .eq("workspace_id", organization)
              .eq("kind", "meta.sync")
              .in("ad_account_id", ids)
              .order("created_at", { ascending: false })
              .limit(300)
          : Promise.resolve({ data: [], error: null }),
        client.supabase.rpc("lyads_credit_balance", {
          target_workspace: organization,
        }),
        client.supabase
          .from("lyads_profiles")
          .select("display_name")
          .eq("user_id", client.user.id)
          .maybeSingle(),
      ]);
      if (jobs.error || credits.error || profile.error)
        throw jobs.error || credits.error || profile.error;
      return client.json({
        ...common,
        accounts: available,
        selected: ids,
        jobs: jobs.data,
        credits: credits.data?.[0] || null,
        displayName: profile.data?.display_name || "",
        role: role.data,
        connectionIssues: issues,
      });
    }
    let period;
    try {
      period = periodDates(q.get("since") || "", q.get("until") || "");
    } catch {
      throw new ApiError(
        "INVALID_PERIOD",
        400,
        "Choisissez une période valide de 90 jours maximum.",
      );
    }
    if (!ids.length)
      return client.json({
        ...common,
        period,
        rows: [],
        message: "Connectez un compte publicitaire pour afficher ses données.",
      });
    if (new Set(accounts.map((a) => a.currency)).size > 1)
      throw new ApiError(
        "MIXED_CURRENCIES",
        422,
        "Ces comptes utilisent des devises différentes. Sélectionnez des comptes dans une même devise.",
      );
    if (zone === "alerts") {
      const ads = await client.supabase
        .from("lyads_ads")
        .select("id,name,effective_status")
        .eq("workspace_id", organization)
        .in("ad_account_id", ids)
        .in("effective_status", [
          "DISAPPROVED",
          "PENDING_REVIEW",
          "WITH_ISSUES",
        ])
        .limit(100);
      if (ads.error) throw ads.error;
      const rows = [
        ...(ads.data || []).map((a) => ({
          id: a.id,
          title: a.name,
          message:
            a.effective_status === "PENDING_REVIEW"
              ? "Publicité en cours de révision par Meta."
              : "Cette publicité nécessite une vérification dans Meta.",
          kind: "ad",
        })),
        ...issues,
      ];
      return client.json({
        ...common,
        period,
        rows,
        message:
          "Les alertes de diffusion sont issues de Meta. Les détecteurs de performance ne sont pas encore activés.",
      });
    }
    if (zone === "recommendations")
      return client.json({
        ...common,
        period,
        rows: [],
        message:
          "Aucune recommandation validée disponible. Le moteur d’optimisation n’est pas encore activé.",
      });
    const result = await client.supabase.rpc("lyads_dashboard_metrics", {
      target_workspace: organization,
      target_accounts: ids,
      since_date: period.since,
      until_date: period.until,
      zone,
    });
    if (result.error) throw result.error;
    if (
      (result.data || []).some(
        (row: { currency: string }) => row.currency !== accounts[0].currency,
      )
    )
      throw new ApiError(
        "CURRENCY_MISMATCH",
        409,
        "La devise des données importées ne correspond pas à celle du compte. Relancez la synchronisation.",
      );
    return client.json({
      ...common,
      period,
      rows: result.data || [],
      message:
        "Une valeur absente reste indisponible. CPA et ROAS utilisent exclusivement les achats « purchase » retournés par Meta.",
    });
  } catch (error) {
    return apiFailure(error);
  }
}
