import assert from "node:assert/strict";
import { eventCounts, inventory } from "./inventory.ts";
import { MetaFailure } from "./meta.ts";
Deno.test(
  "Event inventory reports provider counts and rejects missing or ambiguous volumes",
  () => {
    assert.equal(
      eventCounts([
        {
          aggregation: "event",
          data: [
            { value: "Purchase", count: 2 },
            { value: "Purchase", count: "3" },
          ],
        },
      ]).Purchase,
      5,
    );
    for (const count of [null, undefined, "", -1, 1.2, "unknown"])
      assert.throws(() =>
        eventCounts([
          { aggregation: "event", data: [{ value: "Purchase", count }] },
        ]),
      );
    assert.throws(() => eventCounts([{ aggregation: "other", data: [] }]));
    assert.deepEqual(Object.keys(eventCounts([])), []);
  },
);
Deno.test(
  "Resource discovery checkpoints pagination and never stores provider tokens",
  async () => {
    let saved: any, checkpoint: any;
    const db: any = {
      from: () => ({
        upsert: async (value: any) => {
          saved = value;
          return { error: null };
        },
      }),
      rpc: async (_: string, args: any) => {
        checkpoint = args;
        return { data: true, error: null };
      },
    };
    const job: any = {
      id: "job",
      workspace_id: "org",
      payload: { connection_id: "connection", scope: "root" },
      lease_token: "lease",
      progress_done: 0,
    };
    const outcome = await inventory(db, job, async (path, params) => {
      assert.equal(path, "me/businesses");
      assert.equal(params?.fields, "id,name");
      return {
        data: [{ id: "123", name: "Business", access_token: "never-store" }],
        paging: { next: "provider-next-page", cursors: { after: "cursor" } },
      };
    });
    assert.equal(outcome.complete, false);
    assert.equal(checkpoint.checkpoint.after, "cursor");
    assert.equal(checkpoint.checkpoint.task_index, 0);
    assert.equal(saved.source_data.access_token, undefined);
    assert.equal(checkpoint.done, 1);
  },
);
Deno.test(
  "Missing Meta permissions yield an explicit issue, quota failures remain retryable",
  async () => {
    let checkpoint: any;
    const db: any = {
      rpc: async (_: string, args: any) => {
        checkpoint = args;
        return { data: true, error: null };
      },
    };
    const job: any = {
      id: "job",
      workspace_id: "org",
      payload: { connection_id: "connection", scope: "root" },
      lease_token: "lease",
      progress_done: 0,
    };
    await inventory(db, job, async () => {
      throw new MetaFailure("META_PERMISSION_REQUIRED");
    });
    assert.equal(
      checkpoint.checkpoint.issues[0].code,
      "META_PERMISSION_REQUIRED",
    );
    assert.equal(checkpoint.checkpoint.task_index, 1);
    await assert.rejects(
      inventory(db, job, async () => {
        throw new MetaFailure("META_RATE_LIMIT", true, 60);
      }),
    );
  },
);
