import type { SupabaseClient } from "@supabase/supabase-js";
import { MetaFailure } from "./meta.ts";
type Task = {
  kind: "business" | "account" | "page" | "pixel" | "events";
  path: string;
  fields?: string;
  business_id?: string;
  account_id?: string;
  pixel_id?: string;
  params?: Record<string, string>;
};
type Job = {
  id: string;
  workspace_id: string;
  payload: Record<string, unknown>;
  lease_token: string;
  progress_done: number;
};
export function eventCounts(rows: unknown): Record<string, number> {
  if (!Array.isArray(rows)) throw new MetaFailure("META_INVALID_RESPONSE");
  const counts: Record<string, number> = Object.create(null);
  for (const row of rows) {
    if (row.aggregation !== "event" || !Array.isArray(row.data))
      throw new MetaFailure("META_INVALID_RESPONSE");
    for (const entry of row.data) {
      const name = entry.value ?? entry.event;
      const raw = entry.count;
      if (!(
        typeof raw === "number" ||
        (typeof raw === "string" && /^\d+$/.test(raw))
      ))
        throw new MetaFailure("META_INVALID_RESPONSE");
      const count = Number(raw);
      if (
        typeof name !== "string" ||
        !name ||
        !Number.isSafeInteger(count) ||
        count < 0
      )
        throw new MetaFailure("META_INVALID_RESPONSE");
      counts[name] = (counts[name] || 0) + count;
      if (!Number.isSafeInteger(counts[name]))
        throw new MetaFailure("META_INVALID_RESPONSE");
    }
  }
  return counts;
}
export async function inventory(
  db: SupabaseClient,
  job: Job,
  get: (path: string, params?: Record<string, string>) => Promise<any>,
) {
  const conn = String(job.payload.connection_id);
  let tasks = job.payload.tasks as Task[] | undefined;
  const check = (result: { error: unknown }) => {
    if (result.error)
      throw new MetaFailure("META_TEMPORARILY_UNAVAILABLE", true, 10);
  };
  if (!tasks) {
    const scope = job.payload.scope;
    const bm = String(job.payload.business_id || "");
    const accountFields =
      "id,name,currency,timezone_name,account_status,business{id,name}";
    if (scope === "root")
      tasks = [
        { kind: "business", path: "me/businesses", fields: "id,name" },
        { kind: "account", path: "me/adaccounts", fields: accountFields },
      ];
    else if (scope === "business" && /^\d+$/.test(bm))
      tasks = [
        {
          kind: "account",
          path: bm + "/owned_ad_accounts",
          fields: accountFields,
          business_id: bm,
        },
        {
          kind: "account",
          path: bm + "/client_ad_accounts",
          fields: accountFields,
          business_id: bm,
        },
        {
          kind: "page",
          path: bm + "/owned_pages",
          fields: "id,name",
          business_id: bm,
        },
        {
          kind: "page",
          path: bm + "/client_pages",
          fields: "id,name",
          business_id: bm,
        },
      ];
    else if (scope === "pixels" && Array.isArray(job.payload.account_ids)) {
      const { data, error } = await db
        .from("lyads_ad_accounts")
        .select("id,meta_account_id")
        .eq("workspace_id", job.workspace_id)
        .eq("connection_id", conn)
        .in("id", job.payload.account_ids);
      if (error)
        throw new MetaFailure("META_TEMPORARILY_UNAVAILABLE", true, 10);
      tasks = (data || []).map((a) => ({
        kind: "pixel",
        path: a.meta_account_id + "/adspixels",
        fields: "id,name,last_fired_time",
        account_id: a.id,
      }));
    } else throw new MetaFailure("META_INVALID_REQUEST");
  }
  const index = Number(job.payload.task_index || 0);
  const task = tasks[index];
  const issues = Array.isArray(job.payload.issues)
    ? [...job.payload.issues]
    : [];
  const checkpoint = async (
    next: number,
    after: string | null,
    extra: Record<string, unknown> = {},
    count = 0,
  ) => {
    const { data, error } = await db.rpc("lyads_checkpoint_job", {
      target_job: job.id,
      worker_lease: job.lease_token,
      checkpoint: {
        ...job.payload,
        tasks,
        task_index: next,
        after,
        issues,
        ...extra,
      },
      done: job.progress_done + count,
    });
    if (error || !data)
      throw new MetaFailure("META_JOB_LEASE_EXPIRED", true, 10);
  };
  if (!task)
    return {
      complete: true,
      result: {
        scope: job.payload.scope,
        business_id: job.payload.business_id,
        account_ids: job.payload.account_ids,
        issues,
        completed_at: new Date().toISOString(),
      },
    };
  let response: any;
  try {
    response = await get(task.path, {
      ...(task.fields ? { fields: task.fields } : {}),
      limit: "100",
      ...task.params,
      ...(typeof job.payload.after === "string"
        ? { after: job.payload.after }
        : {}),
    });
  } catch (error) {
    if (
      error instanceof MetaFailure &&
      !error.retryable &&
      error.code !== "META_RECONNECT"
    ) {
      issues.push({
        kind: task.kind,
        scope_id:
          task.pixel_id || task.account_id || task.business_id || "root",
        code: error.code,
      });
      await checkpoint(index + 1, null, { event_counts: {} });
      return { complete: false };
    }
    throw error;
  }
  if (!Array.isArray(response.data))
    throw new MetaFailure("META_INVALID_RESPONSE");
  const next = response.paging?.next ? response.paging?.cursors?.after : null;
  if (response.paging?.next && !next)
    throw new MetaFailure("META_INVALID_RESPONSE");
  if (task.kind === "events") {
    const previous = (job.payload.event_counts || {}) as Record<string, number>;
    const counts = { ...previous };
    try {
      for (const [name, count] of Object.entries(eventCounts(response.data)))
        counts[name] = (counts[name] || 0) + count;
      if (!Number.isSafeInteger(counts[name]))
        throw new MetaFailure("META_INVALID_RESPONSE");
    } catch {
      issues.push({
        kind: "events",
        scope_id: task.pixel_id,
        code: "META_EVENT_COUNTS_UNAVAILABLE",
      });
      await checkpoint(index + 1, null, { event_counts: {} });
      return { complete: false };
    }
    if (!next)
      for (const [name, count] of Object.entries(counts)) {
        const id = task.pixel_id + ":" + name;
        check(
          await db.from("lyads_meta_resources").upsert(
            {
              workspace_id: job.workspace_id,
              connection_id: conn,
              kind: "conversion_event",
              meta_id: id,
              source_data: {
                event_name: name,
                count_7d: count,
                pixel_id: task.pixel_id,
                period_start: task.params?.start_time,
                period_end: task.params?.end_time,
                source: "meta",
              },
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id,connection_id,kind,meta_id" },
          ),
        );
        check(
          await db.from("lyads_resource_links").upsert(
            {
              workspace_id: job.workspace_id,
              connection_id: conn,
              kind: "conversion_event",
              meta_id: id,
              scope_type: "pixel",
              scope_id: task.pixel_id,
            },
            {
              onConflict:
                "workspace_id,connection_id,kind,meta_id,scope_type,scope_id",
            },
          ),
        );
      }
    await checkpoint(
      next ? index : index + 1,
      next || null,
      { event_counts: next ? counts : {} },
      response.data.length,
    );
    return { complete: false };
  }
  for (const row of response.data) {
    if (typeof row.name !== "string" || !/^(?:act_)?\d+$/.test(row.id))
      throw new MetaFailure("META_INVALID_RESPONSE");
    if (task.kind === "account") {
      if (
        !/^[A-Z]{3}$/.test(row.currency) ||
        typeof row.timezone_name !== "string"
      )
        throw new MetaFailure("META_INVALID_RESPONSE");
      const { data: account, error } = await db
        .from("lyads_ad_accounts")
        .upsert(
          {
            workspace_id: job.workspace_id,
            connection_id: conn,
            meta_account_id: row.id.startsWith("act_")
              ? row.id
              : "act_" + row.id,
            name: row.name,
            currency: row.currency,
            timezone_name: row.timezone_name,
            account_status: row.account_status ?? null,
            business_meta_id: row.business?.id || task.business_id || null,
          },
          { onConflict: "workspace_id,meta_account_id" },
        )
        .select("id")
        .single();
      if (error || !account)
        throw new MetaFailure("META_TEMPORARILY_UNAVAILABLE", true, 10);
      const bm = task.business_id || row.business?.id;
      if (bm)
        check(
          await db.from("lyads_business_accounts").upsert(
            {
              workspace_id: job.workspace_id,
              connection_id: conn,
              business_meta_id: bm,
              ad_account_id: account.id,
            },
            { onConflict: "workspace_id,business_meta_id,ad_account_id" },
          ),
        );
    } else {
      // Keep only requested public metadata, never page access tokens.
      const data = {
        id: row.id,
        name: row.name,
        ...(typeof row.last_fired_time === "string"
          ? { last_fired_time: row.last_fired_time }
          : {}),
      };
      check(
        await db.from("lyads_meta_resources").upsert(
          {
            workspace_id: job.workspace_id,
            connection_id: conn,
            kind: task.kind,
            meta_id: row.id,
            source_data: data,
            fetched_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id,connection_id,kind,meta_id" },
        ),
      );
      if (task.business_id || task.account_id)
        check(
          await db.from("lyads_resource_links").upsert(
            {
              workspace_id: job.workspace_id,
              connection_id: conn,
              kind: task.kind,
              meta_id: row.id,
              scope_type: task.account_id ? "account" : "business",
              scope_id: task.account_id || task.business_id,
            },
            {
              onConflict:
                "workspace_id,connection_id,kind,meta_id,scope_type,scope_id",
            },
          ),
        );
      if (task.kind === "pixel" && !tasks.some((t) => t.pixel_id === row.id)) {
        const end = Math.floor(Date.now() / 1000);
        tasks.push({
          kind: "events",
          path: row.id + "/stats",
          pixel_id: row.id,
          params: {
            aggregation: "event",
            start_time: String(end - 7 * 86400),
            end_time: String(end),
          },
        });
      }
    }
  }
  await checkpoint(
    next ? index : index + 1,
    next || null,
    {},
    response.data.length,
  );
  return { complete: false };
}
