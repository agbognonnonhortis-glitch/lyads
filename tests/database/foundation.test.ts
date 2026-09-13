import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const migrationDir = new URL("../../supabase/migrations/", import.meta.url);
const tables = [
  "profiles",
  "workspaces",
  "meta_connections",
  "ad_accounts",
  "campaigns",
  "ad_sets",
  "ads",
  "sync_runs",
  "insight_snapshots",
  "analyses",
  "recommendations",
  "action_events",
];
const alice = "00000000-0000-0000-0000-000000000001";
const bob = "00000000-0000-0000-0000-000000000002";

// Real PostgreSQL engine; only Supabase Auth's identity boundary is emulated.
// These tests do not validate the hosted Auth service or the remote deployment.
test("Pilot migration enforces ownership, provenance and write permissions in PostgreSQL", async (t) => {
  const db = await PGlite.create();
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to anon, authenticated, service_role;
      grant execute on function auth.uid() to anon, authenticated, service_role;
      insert into auth.users values ('${alice}'), ('${bob}');
    `);
    for (const file of readdirSync(migrationDir)
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      await db.exec(readFileSync(new URL(file, migrationDir), "utf8"));
    }
    const asUser = async (id: string) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    };
    const admin = async () => {
      await db.exec("reset role; set role service_role");
    };
    const uuid = async (sql: string, params: unknown[]) =>
      (await db.query<{ id: string }>(sql + " returning id", params)).rows[0]
        .id;
    const sqlError = async (sql: string, params: unknown[], code: string) => {
      await assert.rejects(
        db.query(sql, params),
        (err: any) => err.code === code,
      );
    };

    await asUser(alice);
    await db.query(
      "insert into public.lyads_profiles(user_id,display_name) values ($1,$2)",
      [alice, "Alice test"],
    );
    const wa = await uuid(
      "insert into public.lyads_workspaces(owner_id,name) values ($1,$2)",
      [alice, "Workspace A test"],
    );
    await asUser(bob);
    await db.query(
      "insert into public.lyads_profiles(user_id,display_name) values ($1,$2)",
      [bob, "Bob test"],
    );
    const wb = await uuid(
      "insert into public.lyads_workspaces(owner_id,name) values ($1,$2)",
      [bob, "Workspace B test"],
    );

    async function seed(workspace: string) {
      await admin();
      const connection = await uuid(
        "insert into public.lyads_meta_connections(workspace_id,meta_user_id) values ($1,$2)",
        [workspace, "meta-test-user"],
      );
      const account = await uuid(
        "insert into public.lyads_ad_accounts(workspace_id,connection_id,meta_account_id,name,currency,timezone_name) values ($1,$2,'act-test','Test account','EUR','UTC')",
        [workspace, connection],
      );
      const campaign = await uuid(
        "insert into public.lyads_campaigns(workspace_id,ad_account_id,meta_campaign_id,name,source_data,synchronized_at) values ($1,$2,'campaign-test','Test','{}',now())",
        [workspace, account],
      );
      const adset = await uuid(
        "insert into public.lyads_ad_sets(workspace_id,ad_account_id,campaign_id,meta_ad_set_id,name,source_data,synchronized_at) values ($1,$2,$3,'adset-test','Test','{}',now())",
        [workspace, account, campaign],
      );
      const ad = await uuid(
        "insert into public.lyads_ads(workspace_id,ad_account_id,ad_set_id,meta_ad_id,name,source_data,synchronized_at) values ($1,$2,$3,'ad-test','Test','{}',now())",
        [workspace, account, adset],
      );
      const sync = await uuid(
        "insert into public.lyads_sync_runs(workspace_id,ad_account_id,request_key) values ($1,$2,'sync-test')",
        [workspace, account],
      );
      const insight = await uuid(
        "insert into public.lyads_insight_snapshots(workspace_id,ad_account_id,sync_run_id,level,date_start,date_stop,query_context,deduplication_key,currency,metrics,fetched_at) values ($1,$2,$3,'account','2026-09-01','2026-09-01','{}','insight-test','EUR','{\"spend\":\"0.10\"}',now())",
        [workspace, account, sync],
      );
      const analysis = await uuid(
        "insert into public.lyads_analyses(workspace_id,ad_account_id,sync_run_id,request_key,kind,date_start,date_stop,processor_version,input_snapshot) values ($1,$2,$3,'analysis-test','scan','2026-09-01','2026-09-01','test','{}')",
        [workspace, account, sync],
      );
      const recommendation = await uuid(
        "insert into public.lyads_recommendations(workspace_id,ad_account_id,analysis_id,recommendation_key,payload) values ($1,$2,$3,'test','{}')",
        [workspace, account, analysis],
      );
      await db.query(
        "insert into public.lyads_action_events(workspace_id,ad_account_id,recommendation_id,event_type,payload) values ($1,$2,$3,'test','{}')",
        [workspace, account, recommendation],
      );
      return {
        connection,
        account,
        campaign,
        adset,
        ad,
        sync,
        insight,
        analysis,
        recommendation,
      };
    }
    const a = await seed(wa);
    const b = await seed(wb);

    await t.test(
      "Every table has RLS and both users see only their own rows",
      async () => {
        await db.exec("reset role");
        const flags = await db.query<{ relrowsecurity: boolean }>(
          "select relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relname like 'lyads_%'",
        );
        assert.equal(flags.rows.length, tables.length);
        assert.ok(flags.rows.every((r) => r.relrowsecurity));
        for (const [user, workspace] of [
          [alice, wa],
          [bob, wb],
        ]) {
          await asUser(user);
          for (const table of tables) {
            const rows = (
              await db.query<Record<string, unknown>>(
                `select * from public.lyads_${table}`,
              )
            ).rows;
            assert.equal(rows.length, 1, table);
            assert.equal(
              rows[0][
                table === "profiles"
                  ? "user_id"
                  : table === "workspaces"
                    ? "id"
                    : "workspace_id"
              ],
              table === "profiles" ? user : workspace,
              table,
            );
          }
        }
      },
    );
    await t.test("Anonymous callers have no table privileges", async () => {
      await db.exec("reset role; set role anon");
      for (const table of tables) {
        await sqlError(`select * from public.lyads_${table}`, [], "42501");
        await sqlError(
          `insert into public.lyads_${table} default values`,
          [],
          "42501",
        );
        await sqlError(`delete from public.lyads_${table}`, [], "42501");
        const column =
          table === "profiles"
            ? "display_name"
            : table === "workspaces"
              ? "name"
              : "workspace_id";
        await sqlError(
          `update public.lyads_${table} set ${column} = ${column}`,
          [],
          "42501",
        );
      }
    });
    await t.test(
      "Users can edit their names but cannot forge or transfer ownership",
      async () => {
        await asUser(alice);
        assert.equal(
          (
            await db.query(
              "update public.lyads_profiles set display_name=$1 where user_id=$2",
              ["Changed", alice],
            )
          ).affectedRows,
          1,
        );
        assert.equal(
          (
            await db.query(
              "update public.lyads_workspaces set name=$1 where id=$2",
              ["Changed", wa],
            )
          ).affectedRows,
          1,
        );
        assert.equal(
          (
            await db.query(
              "update public.lyads_workspaces set name=$1 where id=$2",
              ["Stolen", wb],
            )
          ).affectedRows,
          0,
        );
        await sqlError(
          "insert into public.lyads_workspaces(owner_id,name) values ($1,$2)",
          [bob, "Forged"],
          "42501",
        );
        await sqlError(
          "insert into public.lyads_profiles(user_id,display_name) values ($1,$2)",
          [bob, "Forged"],
          "42501",
        );
        await sqlError(
          "update public.lyads_workspaces set owner_id=$1 where id=$2",
          [bob, wa],
          "42501",
        );
        await sqlError(
          "delete from public.lyads_workspaces where id=$1",
          [wa],
          "42501",
        );
        await sqlError(
          "delete from public.lyads_profiles where user_id=$1",
          [alice],
          "42501",
        );
      },
    );
    await t.test(
      "Clients cannot forge imported results, permissions or action history",
      async () => {
        await asUser(alice);
        for (const table of tables.slice(2)) {
          await sqlError(
            `insert into public.lyads_${table}(workspace_id) values ($1)`,
            [wa],
            "42501",
          );
          await sqlError(
            `update public.lyads_${table} set workspace_id=$1 where workspace_id=$1`,
            [wa],
            "42501",
          );
          await sqlError(
            `delete from public.lyads_${table} where workspace_id=$1`,
            [wa],
            "42501",
          );
        }
      },
    );
    await t.test(
      "Composite foreign keys reject cross-workspace and cross-account links",
      async () => {
        await admin();
        await sqlError(
          "update public.lyads_ad_accounts set connection_id=$1 where id=$2",
          [b.connection, a.account],
          "23503",
        );
        await sqlError(
          "update public.lyads_ad_sets set campaign_id=$1 where id=$2",
          [b.campaign, a.adset],
          "23503",
        );
        await sqlError(
          "update public.lyads_ads set ad_set_id=$1 where id=$2",
          [b.adset, a.ad],
          "23503",
        );
        await sqlError(
          "update public.lyads_insight_snapshots set sync_run_id=$1 where id=$2",
          [b.sync, a.insight],
          "23503",
        );
        await sqlError(
          "update public.lyads_recommendations set analysis_id=$1 where id=$2",
          [b.analysis, a.recommendation],
          "23503",
        );
        const second = await uuid(
          "insert into public.lyads_ad_accounts(workspace_id,connection_id,meta_account_id,name,currency,timezone_name) values ($1,$2,'act-second','Second','USD','UTC')",
          [wa, a.connection],
        );
        await sqlError(
          "update public.lyads_ad_sets set ad_account_id=$1 where id=$2",
          [second, a.adset],
          "23503",
        );
      },
    );
    await t.test(
      "Resynchronization uses stable identities and preserves absent and decimal metrics",
      async () => {
        await admin();
        await sqlError(
          "insert into public.lyads_sync_runs(workspace_id,ad_account_id,request_key) values ($1,$2,'sync-test')",
          [wa, a.account],
          "23505",
        );
        await sqlError(
          "insert into public.lyads_campaigns(workspace_id,ad_account_id,meta_campaign_id,name,source_data,synchronized_at) values ($1,$2,'campaign-test','Duplicate','{}',now())",
          [wa, a.account],
          "23505",
        );
        await db.query(
          "insert into public.lyads_insight_snapshots(workspace_id,ad_account_id,sync_run_id,level,date_start,date_stop,query_context,deduplication_key,currency,metrics,fetched_at) values ($1,$2,$3,'account','2026-09-01','2026-09-01','{}','insight-test','EUR','{\"spend\":\"0.20\"}',now()) on conflict(workspace_id,ad_account_id,deduplication_key) do update set metrics=excluded.metrics",
          [wa, a.account, a.sync],
        );
        const rows = (
          await db.query<{ metrics: Record<string, unknown> }>(
            "select metrics from public.lyads_insight_snapshots where workspace_id=$1",
            [wa],
          )
        ).rows;
        assert.equal(rows.length, 1);
        assert.deepEqual(rows[0].metrics, { spend: "0.20" });
        await sqlError(
          "update public.lyads_insight_snapshots set date_stop='2026-08-01' where id=$1",
          [a.insight],
          "23514",
        );
        await sqlError(
          "update public.lyads_insight_snapshots set level='ad' where id=$1",
          [a.insight],
          "23514",
        );
      },
    );
    await t.test(
      "Worker can append but cannot alter or delete audit events",
      async () => {
        await admin();
        await sqlError(
          "update public.lyads_action_events set event_type='tampered'",
          [],
          "42501",
        );
        await sqlError("delete from public.lyads_action_events", [], "42501");
      },
    );
  } finally {
    await db.close();
  }
});
