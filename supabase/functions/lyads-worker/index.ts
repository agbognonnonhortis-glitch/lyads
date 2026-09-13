import {
  extractBusiness,
  readPage,
  type SourcePage,
  WEBSITE_MESSAGES,
  WebsiteFailure,
} from "../_shared/website.ts";
import { inventory } from "../_shared/inventory.ts";
import { createClient } from "@supabase/supabase-js";
import {
  META_MESSAGES,
  MetaFailure,
  openToken,
  permissions,
  readMeta,
  sha256,
} from "../_shared/meta.ts";
import {
  accountDate,
  datasets,
  dateWindows,
  insightFields,
  structures,
} from "../_shared/sync.ts";
const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
import { encryptionKey, graphVersion } from "../_shared/runtime.ts";
type Job = {
  id: string;
  workspace_id: string;
  ad_account_id: string | null;
  requested_by: string | null;
  kind: string;
  lease_token: string;
  attempts: number;
  max_attempts: number;
  progress_done: number;
  payload: Record<string, unknown>;
};
function configured(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new MetaFailure("META_NOT_CONFIGURED");
  return value;
}
async function finish(job: Job, result: unknown, error?: MetaFailure) {
  const { data: finished, error: dbError } = await db.rpc("lyads_finish_job", {
    target_job: job.id,
    worker_lease: job.lease_token,
    success: !error,
    job_result: result,
    failure_code: error?.code || null,
    retry_seconds: error?.retryable
      ? Math.min(3600, Math.max(error.delaySeconds, 2 ** job.attempts))
      : null,
  });
  if (dbError || !finished) throw new Error("JOB_STATE_UNAVAILABLE");
  if (!error || !error.retryable || job.attempts >= job.max_attempts) {
    if (error && job.ad_account_id) {
      await db
        .from("lyads_sync_runs")
        .update({
          status: "failed",
          error_code: error.code,
          completed_at: new Date().toISOString(),
        })
        .eq("request_key", job.id)
        .eq("workspace_id", job.workspace_id);
    }
    if (job.requested_by) {
      await db.from("lyads_notifications").upsert(
        {
          workspace_id: job.workspace_id,
          ad_account_id: job.ad_account_id,
          user_id: job.requested_by,
          event_key: "job:" + job.id,
          kind: error ? "sync.failed" : "sync.complete",
          message: error
            ? META_MESSAGES[error.code] ||
              META_MESSAGES.META_REQUEST_UNAVAILABLE
            : "La synchronisation Meta est terminée.",
        },
        { onConflict: "user_id,event_key", ignoreDuplicates: true },
      );
    }
  }
}
async function checkpoint(
  job: Job,
  payload: Record<string, unknown>,
  increment: number,
) {
  const { data, error } = await db.rpc("lyads_checkpoint_job", {
    target_job: job.id,
    worker_lease: job.lease_token,
    checkpoint: payload,
    done: job.progress_done + increment,
  });
  if (error || !data) throw new MetaFailure("META_JOB_LEASE_EXPIRED", true, 10);
}
async function processWebsite(job: Job) {
  try {
    const { data: org, error: orgError } = await db.from("lyads_workspaces")
      .select("owner_id").eq("id", job.workspace_id).single();
    if (orgError || !job.requested_by || org?.owner_id !== job.requested_by) {
      throw new WebsiteFailure("WEBSITE_ACCESS_REVOKED");
    }
    const pages = (job.payload.pages || []) as SourcePage[];
    const pending = (job.payload.pending || []) as string[];
    if (pending.length && pages.length < 5) {
      const [url, ...rest] = pending;
      let page: SourcePage | null = null;
      try {
        page = await readPage(url);
      } catch (error) {
        if (!pages.length) throw error;
      }
      if (page) pages.push(page);
      const remaining = pages.length === 1 && page
        ? [...new Set([...rest, ...page.links])].filter((u) => u !== page.url)
          .slice(0, 4)
        : rest;
      await checkpoint(job, { ...job.payload, pages, pending: remaining }, 1);
      return;
    }
    const extracted = await extractBusiness(
      pages,
      Deno.env.get("OPENAI_API_KEY") || "",
      Deno.env.get("OPENAI_EXTRACTION_MODEL") || undefined,
    );
    const { data: done, error } = await db.rpc(
      "lyads_complete_website_analysis",
      { target_job: job.id, worker_lease: job.lease_token, extracted },
    );
    if (error || !done) throw new WebsiteFailure("WEBSITE_INVALID_RESULT");
  } catch (error) {
    const code = error instanceof WebsiteFailure
      ? error.code
      : "WEBSITE_UNAVAILABLE";
    console.error("[website]", code);
    const { data: finished } = await db.rpc("lyads_finish_job", {
      target_job: job.id,
      worker_lease: job.lease_token,
      success: false,
      failure_code: code,
      job_result: null,
      retry_seconds: null,
    });
    if (finished && job.requested_by) {
      await db.from("lyads_notifications").upsert({
        workspace_id: job.workspace_id,
        user_id: job.requested_by,
        event_key: "job:" + job.id,
        kind: "website.failed",
        message: WEBSITE_MESSAGES[code],
      }, { onConflict: "user_id,event_key", ignoreDuplicates: true });
    }
  }
}
async function process(job: Job) {
  if (job.kind === "website.analyze") return processWebsite(job);
  try {
    const version = graphVersion();
    const { data: org } = await db
      .from("lyads_workspaces")
      .select("owner_id")
      .eq("id", job.workspace_id)
      .single();
    if (job.requested_by && org?.owner_id !== job.requested_by) {
      const { data: grant } = await db
        .from("lyads_account_access")
        .select("user_id")
        .eq("workspace_id", job.workspace_id)
        .eq("ad_account_id", job.ad_account_id || "")
        .eq("user_id", job.requested_by)
        .maybeSingle();
      if (!grant) throw new MetaFailure("META_ACCESS_REVOKED");
    }
    const { data: connection } = await db
      .from("lyads_meta_connections")
      .select("*")
      .eq("id", job.payload.connection_id)
      .eq("workspace_id", job.workspace_id)
      .single();
    if (
      !connection ||
      connection.revoked_at ||
      (connection.expires_at &&
        Date.parse(connection.expires_at) <= Date.now()) ||
      (connection.data_access_expires_at &&
        Date.parse(connection.data_access_expires_at) <= Date.now())
    ) {
      throw new MetaFailure("META_RECONNECT");
    }
    const { data: secret } = await db
      .from("lyads_meta_credentials")
      .select("ciphertext,key_version")
      .eq("connection_id", connection.id)
      .single();
    if (!secret) throw new MetaFailure("META_NOT_CONFIGURED");
    const token = await openToken(
      secret.ciphertext,
      await encryptionKey(db),
      job.workspace_id + ":" + connection.meta_user_id,
    );
    const bucket = job.ad_account_id || connection.id;
    const before = async () => {
      const { data, error } = await db.rpc("lyads_take_meta_slot", {
        bucket_key: bucket,
      });
      if (error) {
        throw new MetaFailure("META_TEMPORARILY_UNAVAILABLE", true, 10);
      }
      if (data > 0) {
        throw new MetaFailure(
          "META_RATE_LIMIT",
          true,
          Math.max(1, Math.ceil(data / 1000)),
        );
      }
    };
    const after = async (headers: Headers) => {
      const raw = headers.get("x-business-use-case-usage") ||
        headers.get("x-app-usage");
      if (!raw) return;
      let usage;
      try {
        usage = JSON.parse(raw);
      } catch {
        return;
      }
      const ratios: number[] = [];
      const inspect = (v: unknown) => {
        if (Array.isArray(v)) v.forEach(inspect);
        else if (v && typeof v === "object") {
          for (const [key, value] of Object.entries(v)) {
            if (
              ["call_count", "total_cputime", "total_time"].includes(key) &&
              typeof value === "number"
            ) {
              ratios.push(value);
            } else if (typeof value === "object") inspect(value);
          }
        }
      };
      inspect(usage);
      await db
        .from("lyads_meta_quota")
        .update({
          consumption: usage,
          blocked_until: Math.max(0, ...ratios) >= 80
            ? new Date(Date.now() + 60000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("bucket", bucket);
    };
    const get = (path: string, params: Record<string, string> = {}) =>
      readMeta({ version, path, params, token, before, after });
    if (job.kind === "meta.inventory") {
      const outcome = await inventory(db, job, get);
      if (outcome.complete) await finish(job, outcome.result);
      return;
    }
    if (job.kind === "meta.refresh_permissions") {
      const actual = permissions((await get("me/permissions")).data);
      const { error } = await db
        .from("lyads_meta_connections")
        .update({
          granted_scopes: actual.granted,
          permission_status: actual.statuses,
          checked_at: new Date().toISOString(),
          connection_status: actual.canReadAds ? "connected" : "partial",
        })
        .eq("id", connection.id);
      if (error) {
        throw new MetaFailure("META_TEMPORARILY_UNAVAILABLE", true, 10);
      }
      await finish(job, { permissions: actual.statuses });
      return;
    }
    if (
      !connection.granted_scopes.includes("ads_read") &&
      !connection.granted_scopes.includes("ads_management")
    ) {
      throw new MetaFailure("META_PERMISSION_REQUIRED");
    }
    const cursor = typeof job.payload.after === "string"
      ? job.payload.after
      : undefined;
    if (job.kind === "meta.discover") {
      const page = await get("me/adaccounts", {
        fields:
          "id,name,currency,timezone_name,account_status,business{id,name}",
        limit: "100",
        ...(cursor ? { after: cursor } : {}),
      });
      if (!Array.isArray(page.data)) {
        throw new MetaFailure("META_INVALID_RESPONSE");
      }
      for (const account of page.data) {
        if (
          !/^act_\d+$/.test(account.id) ||
          typeof account.name !== "string" ||
          !/^[A-Z]{3}$/.test(account.currency) ||
          typeof account.timezone_name !== "string"
        ) {
          throw new MetaFailure("META_INVALID_RESPONSE");
        }
        const { error } = await db.from("lyads_ad_accounts").upsert(
          {
            workspace_id: job.workspace_id,
            connection_id: connection.id,
            meta_account_id: account.id,
            name: account.name,
            currency: account.currency,
            timezone_name: account.timezone_name,
            business_meta_id: account.business?.id || null,
            account_status: account.account_status ?? null,
          },
          { onConflict: "workspace_id,meta_account_id" },
        );
        if (error) {
          throw new MetaFailure("META_TEMPORARILY_UNAVAILABLE", true, 10);
        }
      }
      for (const account of page.data) {
        if (
          account.business &&
          /^\d+$/.test(account.business.id) &&
          typeof account.business.name === "string"
        ) {
          const { error } = await db.from("lyads_meta_resources").upsert(
            {
              workspace_id: job.workspace_id,
              connection_id: connection.id,
              kind: "business",
              meta_id: account.business.id,
              source_data: {
                id: account.business.id,
                name: account.business.name,
              },
            },
            { onConflict: "workspace_id,connection_id,kind,meta_id" },
          );
          if (error) {
            throw new MetaFailure("META_TEMPORARILY_UNAVAILABLE", true, 10);
          }
        }
      }
      const next = page.paging?.next ? page.paging?.cursors?.after : undefined;
      if (next) {
        await checkpoint(
          job,
          { ...job.payload, after: next },
          page.data.length,
        );
      } else {
        await finish(job, {
          accounts_discovered: job.progress_done + page.data.length,
        });
      }
      return;
    }
    const { data: account } = await db
      .from("lyads_ad_accounts")
      .select("*")
      .eq("id", job.ad_account_id)
      .eq("workspace_id", job.workspace_id)
      .single();
    if (!account) throw new MetaFailure("META_ACCESS_REVOKED");
    const stage = Number(job.payload.stage || 0);
    if (stage < structures.length) {
      const spec = structures[stage];
      const page = await get(account.meta_account_id + "/" + spec.edge, {
        fields: spec.fields,
        limit: "100",
        ...(cursor ? { after: cursor } : {}),
      });
      if (!Array.isArray(page.data)) {
        throw new MetaFailure("META_INVALID_RESPONSE");
      }
      const { error } = await db.rpc("lyads_ingest_structure", {
        target_workspace: job.workspace_id,
        target_account: account.id,
        entity_level: spec.level,
        entities: page.data,
        operation: job.id,
      });
      if (error) throw new MetaFailure("META_INVALID_RESPONSE");
      const next = page.paging?.next ? page.paging?.cursors?.after : undefined;
      await checkpoint(
        job,
        {
          ...job.payload,
          stage: next ? stage : stage + 1,
          after: next || null,
        },
        page.data.length,
      );
      return;
    }
    const dates = Array.isArray(job.payload.windows)
      ? (job.payload.windows as { since: string; until: string }[])
      : dateWindows(
        accountDate(account.timezone_name),
        account.synchronized_at
          ? Number(job.payload.revision_days || 7)
          : Number(job.payload.history_days || 90),
      );
    const datasetIndex = Number(job.payload.dataset || 0);
    const windowIndex = Number(job.payload.window || 0);
    if (datasetIndex >= datasets.length) {
      const { data, error } = await db.rpc("lyads_complete_sync", {
        target_job: job.id,
        worker_lease: job.lease_token,
        period_start: dates.at(-1)?.since,
        period_end: dates[0]?.until,
      });
      if (error || !data) {
        throw new MetaFailure("META_TEMPORARILY_UNAVAILABLE", true, 10);
      }
      if (job.requested_by) {
        await db.from("lyads_notifications").upsert(
          {
            workspace_id: job.workspace_id,
            ad_account_id: job.ad_account_id,
            user_id: job.requested_by,
            event_key: "job:" + job.id,
            kind: "sync.complete",
            message: "La synchronisation Meta est terminée.",
          },
          { onConflict: "user_id,event_key", ignoreDuplicates: true },
        );
      }
      return;
    }
    const spec = datasets[datasetIndex];
    const period = dates[windowIndex];
    if (!period) throw new MetaFailure("META_INVALID_REQUEST");
    const { error: createError } = await db.from("lyads_sync_runs").upsert(
      {
        workspace_id: job.workspace_id,
        ad_account_id: account.id,
        request_key: job.id,
        status: "running",
        started_at: new Date().toISOString(),
      },
      {
        onConflict: "workspace_id,ad_account_id,request_key",
        ignoreDuplicates: true,
      },
    );
    const { data: run, error: runError } = await db
      .from("lyads_sync_runs")
      .select("id")
      .eq("workspace_id", job.workspace_id)
      .eq("ad_account_id", account.id)
      .eq("request_key", job.id)
      .single();
    if (createError || runError || !run) {
      throw new MetaFailure("META_TEMPORARILY_UNAVAILABLE", true, 10);
    }
    const context = {
      api_version: version,
      level: spec.level,
      breakdowns: spec.breakdowns,
      time_increment: 1,
      use_unified_attribution_setting: true,
      timezone: account.timezone_name,
      currency: account.currency,
    };
    const page = await get(account.meta_account_id + "/insights", {
      fields: insightFields(spec.level),
      level: spec.level,
      time_range: JSON.stringify(period),
      time_increment: "1",
      use_unified_attribution_setting: "true",
      limit: "100",
      ...(spec.breakdowns ? { breakdowns: spec.breakdowns } : {}),
      ...(cursor ? { after: cursor } : {}),
    });
    if (!Array.isArray(page.data)) {
      throw new MetaFailure("META_INVALID_RESPONSE");
    }
    const mapping = spec.level === "account"
      ? null
      : spec.level === "campaign"
      ? {
        table: "lyads_campaigns",
        external: "meta_campaign_id",
        field: "campaign_id",
      }
      : spec.level === "adset"
      ? {
        table: "lyads_ad_sets",
        external: "meta_ad_set_id",
        field: "adset_id",
      }
      : { table: "lyads_ads", external: "meta_ad_id", field: "ad_id" };
    const entities: Record<string, string> = {};
    if (mapping && page.data.length) {
      const { data, error } = await db
        .from(mapping.table)
        .select("id," + mapping.external)
        .eq("workspace_id", job.workspace_id)
        .eq("ad_account_id", account.id)
        .in(
          mapping.external,
          page.data.map((row: Record<string, string>) => row[mapping.field]),
        );
      if (error) {
        throw new MetaFailure("META_TEMPORARILY_UNAVAILABLE", true, 10);
      }
      for (const row of data || []) {
        const item = row as unknown as Record<string, string>;
        entities[item[mapping.external]] = item.id;
      }
    }
    const rows = [];
    for (const row of page.data) {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(row.date_start) ||
        row.date_start !== row.date_stop ||
        row.date_start < period.since ||
        row.date_stop > period.until ||
        "act_" + row.account_id !== account.meta_account_id
      ) {
        throw new MetaFailure("META_INVALID_RESPONSE");
      }
      const entityId = mapping ? entities[row[mapping.field]] : null;
      if (mapping && !entityId) {
        const retries = Number(job.payload.structure_restarts || 0);
        if (retries >= 2) throw new MetaFailure("META_INVALID_RESPONSE");
        await checkpoint(
          job,
          {
            ...job.payload,
            stage: 0,
            after: null,
            windows: dates,
            structure_restarts: retries + 1,
          },
          0,
        );
        return;
      }
      const metrics: Record<string, unknown> = {};
      for (
        const field of [
          "spend",
          "impressions",
          "clicks",
          "reach",
          "frequency",
        ]
      ) {
        if (row[field] !== undefined) {
          if (
            typeof row[field] !== "string" ||
            !/^\d+(?:\.\d+)?$/.test(row[field])
          ) {
            throw new MetaFailure("META_INVALID_RESPONSE");
          }
          metrics[field] = row[field];
        }
      }
      for (const field of ["actions", "action_values"]) {
        if (row[field] !== undefined) {
          if (
            !Array.isArray(row[field]) ||
            !row[field].every(
              (a: Record<string, unknown>) =>
                typeof a.action_type === "string" &&
                typeof a.value === "string" &&
                /^\d+(?:\.\d+)?$/.test(a.value),
            )
          ) {
            throw new MetaFailure("META_INVALID_RESPONSE");
          }
          metrics[field] = row[field];
        }
      }
      const breakdowns: Record<string, string> = {};
      for (const field of spec.breakdowns.split(",").filter(Boolean)) {
        if (typeof row[field] !== "string") {
          throw new MetaFailure("META_INVALID_RESPONSE");
        }
        breakdowns[field] = row[field];
      }
      const key = await sha256(
        JSON.stringify({
          context,
          entity: entityId || account.id,
          date: row.date_start,
          breakdowns,
        }),
      );
      rows.push({
        workspace_id: job.workspace_id,
        ad_account_id: account.id,
        sync_run_id: run.id,
        level: spec.level === "adset" ? "ad_set" : spec.level,
        campaign_id: spec.level === "campaign" ? entityId : null,
        ad_set_id: spec.level === "adset" ? entityId : null,
        ad_id: spec.level === "ad" ? entityId : null,
        date_start: row.date_start,
        date_stop: row.date_stop,
        query_context: { ...context, breakdown_values: breakdowns },
        deduplication_key: key,
        currency: account.currency,
        metrics,
        fetched_at: new Date().toISOString(),
      });
    }
    const next = page.paging?.next ? page.paging?.cursors?.after : undefined;
    const nextWindow = next ? windowIndex : (windowIndex + 1) % dates.length;
    const nextDataset = !next && nextWindow === 0
      ? datasetIndex + 1
      : datasetIndex;
    const { data: staged, error: stageError } = await db.rpc(
      "lyads_stage_insights",
      {
        target_job: job.id,
        worker_lease: job.lease_token,
        source_rows: rows,
        checkpoint: {
          ...job.payload,
          stage,
          windows: dates,
          dataset: nextDataset,
          window: nextWindow,
          after: next || null,
        },
        done: job.progress_done + rows.length,
      },
    );
    if (stageError || !staged) {
      throw new MetaFailure("META_TEMPORARILY_UNAVAILABLE", true, 10);
    }
  } catch (error) {
    const failure = error instanceof MetaFailure
      ? error
      : new MetaFailure("META_TEMPORARILY_UNAVAILABLE", true, 10);
    if (failure.code === "META_RECONNECT" && job.payload.connection_id) {
      await db
        .from("lyads_meta_connections")
        .update({ connection_status: "expired" })
        .eq("id", job.payload.connection_id)
        .eq("workspace_id", job.workspace_id);
    }
    console.error("[worker]", failure.code);
    await finish(job, null, failure);
  }
}
Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  try {
    const text = await request.text();
    if (text.length > 1024) return new Response(null, { status: 413 });
    const body = JSON.parse(text);
    if (typeof body.jobId !== "string" || typeof body.leaseToken !== "string") {
      return new Response(null, { status: 401 });
    }
    // A short-lived, single-use lease is generated in PostgreSQL. Only the service
    // role can claim jobs/read leases. No long-lived worker secret in cron or UI.
    const { data, error } = await db.rpc("lyads_start_leased_job", {
      target_job: body.jobId,
      worker_lease: body.leaseToken,
    });
    if (error || !data?.[0]) return new Response(null, { status: 401 });
    await process(data[0] as Job); // One bounded page, not the full import.
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 503 });
  }
});
