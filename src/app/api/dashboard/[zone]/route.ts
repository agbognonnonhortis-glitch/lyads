import { NextRequest } from "next/server";
import { formatPerformanceAlert } from "@/lib/alerts/format";
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
    const campaign = q.get("campaign") || null;
    const adSet = q.get("adset") || null;
    if ((campaign && !uuid(campaign)) || (adSet && !uuid(adSet)))
      throw new ApiError(
        "INVALID_SCOPE",
        400,
        "Sélectionnez une campagne et un ensemble valides.",
      );
    const scopeArgs = {
      target_workspace: organization,
      target_accounts: ids,
      target_campaign: campaign,
      target_ad_set: adSet,
    };
    const scope = await client.supabase.rpc("lyads_dashboard_scope", {
      ...scopeArgs,
      include_options: zone === "context",
    });
    if (scope.error?.code === "42501")
      throw new ApiError(
        "INVALID_SCOPE",
        403,
        "Cette campagne ou cet ensemble n’appartient pas aux comptes sélectionnés.",
      );
    if (scope.error) throw scope.error;

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
      scope: { campaign, adSet },
      freshness: fresh,
      selected: ids,
      currency:
        new Set(accounts.map((a) => a.currency)).size === 1
          ? accounts[0].currency
          : null,
      sufficientData: false,
      sufficiencyReason:
        "Les métriques brutes ne constituent pas un jugement de performance.",
      conversionMetric: "purchase",
    };
    if (zone === "context") {
      const [jobs, credits, profile] = await Promise.all([
        ids.length
          ? client.supabase
              .from("lyads_jobs")
              .select(
                "id,ad_account_id,status,progress_done,progress_total,result,error_code,created_at,updated_at",
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
        ...scope.data,
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
      const activeImport = await client.supabase
        .from("lyads_jobs")
        .select("id")
        .eq("workspace_id", organization)
        .eq("kind", "meta.sync")
        .in("ad_account_id", ids)
        .in("status", ["queued", "running"])
        .limit(1);
      if (activeImport.error) throw activeImport.error;
      if (activeImport.data?.length)
        return client.json({
          ...common,
          period,
          rows: issues,
          pending: false,
          performanceAvailable: true,
          sufficientData: false,
          message:
            "L’analyse des performances reprendra à la fin de la synchronisation.",
        });
      let performanceAvailable = true;
      const scanIds = await Promise.all(
        ids.map(async (id) => {
          const scan = await client.supabase.rpc("lyads_request_alert_scan", {
            target_account: id,
            since_date: period.since,
            until_date: period.until,
          });
          if (scan.error?.code === "P0001")
            throw new ApiError(
              "SCAN_COOLDOWN",
              429,
              "Plusieurs analyses viennent d’être demandées. Réessayez dans une minute.",
            );
          if (scan.error && ["PGRST202", "42883"].includes(scan.error.code)) {
            performanceAvailable = false;
            return null;
          }
          if (scan.error) throw scan.error;
          return scan.data;
        }),
      );
      const scans = performanceAvailable
        ? await client.supabase
            .from("lyads_jobs")
            .select(
              "id,ad_account_id,status,result,progress_done,progress_total",
            )
            .eq("workspace_id", organization)
            .in("id", scanIds)
        : { data: [], error: null };
      if (scans.error) throw scans.error;
      const scanResults = (scans.data || [])
        .filter((s) => s.status === "succeeded")
        .map((s) => s.result);
      const pending = (scans.data || []).some((s) =>
        ["queued", "running"].includes(s.status),
      );
      const failed = (scans.data || []).some((s) =>
        ["failed", "cancelled"].includes(s.status),
      );
      const filtered = await client.supabase.rpc(
        "lyads_scoped_performance_alerts",
        {
          ...scopeArgs,
          alerts: scanResults.flatMap((result) => result?.rows || []),
        },
      );
      if (filtered.error) throw filtered.error;
      const performanceRows = (filtered.data || []).map(formatPerformanceAlert);
      const rows = [...performanceRows, ...issues];
      return client.json({
        ...common,
        period,
        rows,
        pending,
        performanceAvailable,
        scans: scans.data,
        sufficientData: campaign
          ? performanceRows.length > 0
          : scanResults.some((result) => result?.sufficient_entities > 0),
        sufficiencyReason: scanResults.every(
          (result) => !result?.sufficient_entities,
        )
          ? "Données insuffisantes pour juger la performance."
          : null,
        message: !performanceAvailable
          ? "L’analyse de performance est temporairement indisponible. Réessayez plus tard."
          : pending
            ? "Analyse des performances en cours…"
            : failed
              ? "L’analyse des performances a échoué. Réessayez la synchronisation."
              : campaign
                ? ""
                : scanResults.every((result) => !result?.source_rows)
                  ? "Aucune métrique importée sur cette période. Synchronisez ce compte pour analyser ses performances."
                  : scanResults.every((result) => !result?.sufficient_entities)
                    ? "Données insuffisantes : aucune conclusion de performance pour cette période."
                    : "",
        needsTargets: scanResults.some((result) =>
          Boolean(result?.needs_targets),
        ),
      });
    }
    if (zone === "recommendations")
      return client.json({
        ...common,
        period,
        rows: [],
        message: "Aucune recommandation disponible pour le moment.",
      });
    if (zone === "creatives") {
      const offset = Number(q.get("offset") || 0);
      if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000000)
        throw new ApiError(
          "INVALID_PAGE",
          400,
          "Rechargez la liste des publicités.",
        );
      const ranking = await client.supabase.rpc("lyads_scoped_account_ads", {
        ...scopeArgs,
        since_date: period.since,
        until_date: period.until,
        page_offset: offset,
        page_size: 5,
      });
      if (ranking.error) throw ranking.error;
      if (
        (ranking.data?.rows || []).some(
          (row: { currency: string }) => row.currency !== accounts[0].currency,
        )
      )
        throw new ApiError(
          "CURRENCY_MISMATCH",
          409,
          "Relancez la synchronisation pour actualiser la devise du compte.",
        );
      return client.json({
        ...common,
        ...ranking.data,
        period,
        sufficientData: Boolean(ranking.data?.rankedAds),
        sufficiencyReason: ranking.data?.rankedAds
          ? null
          : "Données insuffisantes ou événement de conversion indisponible pour établir un classement.",
        conversionMetric: "configured_event",
      });
    }
    const result = await client.supabase.rpc("lyads_scoped_dashboard_metrics", {
      ...scopeArgs,
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
