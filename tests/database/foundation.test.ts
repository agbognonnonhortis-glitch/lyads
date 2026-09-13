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
          "select relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relname = any($1::text[])",
          [tables.map((t) => "lyads_" + t)],
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
    await t.test(
      "Membership never grants an unassigned account and revocation applies immediately",
      async () => {
        await asUser(alice);
        const grants = JSON.stringify([
          { ad_account_id: a.account, can_edit: true },
        ]);
        await db.query(
          "select public.lyads_set_member($1,$2,'editor',$3::jsonb)",
          [wa, bob, grants],
        );
        await asUser(bob);
        assert.equal(
          (
            await db.query(
              "select * from public.lyads_campaigns where workspace_id=$1",
              [wa],
            )
          ).rows.length,
          1,
        );
        assert.equal(
          (
            await db.query<{ can_edit: boolean }>(
              "select * from public.lyads_account_permission($1)",
              [a.account],
            )
          ).rows[0].can_edit,
          true,
        );
        await sqlError(
          "select public.lyads_set_member($1,$2,'admin','[]')",
          [wa, bob],
          "42501",
        );
        await sqlError(
          "insert into public.lyads_account_access(workspace_id,user_id,ad_account_id) values($1,$2,$3)",
          [wa, bob, a.account],
          "42501",
        );
        await asUser(alice);
        await sqlError(
          "select public.lyads_set_member($1,$2,'viewer',$3::jsonb)",
          [wa, bob, grants],
          "22023",
        );
        await sqlError(
          "select public.lyads_set_member($1,$2,'editor',$3::jsonb)",
          [
            wa,
            bob,
            JSON.stringify([{ ad_account_id: b.account, can_edit: false }]),
          ],
          "22023",
        );
        await db.query("select public.lyads_set_member($1,$2,'viewer','[]')", [
          wa,
          bob,
        ]);
        await asUser(bob);
        assert.equal(
          (
            await db.query(
              "select * from public.lyads_workspaces where id=$1",
              [wa],
            )
          ).rows.length,
          1,
        );
        for (const table of tables.slice(2))
          assert.equal(
            (
              await db.query(
                `select * from public.lyads_${table} where workspace_id=$1`,
                [wa],
              )
            ).rows.length,
            0,
            table,
          );
        await asUser(alice);
        await db.query("select public.lyads_set_member($1,$2,null,'[]')", [
          wa,
          bob,
        ]);
        await asUser(bob);
        assert.equal(
          (
            await db.query(
              "select * from public.lyads_workspaces where id=$1",
              [wa],
            )
          ).rows.length,
          0,
        );
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
      "Account initialization is retryable, isolated and preserves existing names",
      async () => {
        const charlie = "00000000-0000-0000-0000-000000000003";
        await db.exec("reset role");
        await db.query("insert into auth.users values ($1)", [charlie]);
        await asUser(charlie);
        const initialize = async (name: string) =>
          (
            await db.query<{ id: string }>(
              "select public.lyads_initialize_account($1) as id",
              [name],
            )
          ).rows[0].id;
        await sqlError(
          "select public.lyads_initialize_account($1)",
          ["  "],
          "22023",
        );
        const id = await initialize("Charlie");
        assert.equal(await initialize("Replacement"), id);
        assert.deepEqual(
          (
            await db.query(
              "select user_id, display_name from public.lyads_profiles",
            )
          ).rows,
          [{ user_id: charlie, display_name: "Charlie" }],
        );
        assert.deepEqual(
          (
            await db.query(
              "select id, owner_id, name from public.lyads_workspaces",
            )
          ).rows,
          [{ id, owner_id: charlie, name: "Charlie" }],
        );
        await asUser(alice);
        assert.equal(await initialize("Should not overwrite"), wa);
        assert.equal(
          (
            await db.query<{ display_name: string }>(
              "select display_name from public.lyads_profiles",
            )
          ).rows[0].display_name,
          "Changed",
        );
        await asUser("");
        await sqlError(
          "select public.lyads_initialize_account('No identity')",
          [],
          "42501",
        );
        await db.exec("reset role; set role anon");
        await sqlError(
          "select public.lyads_initialize_account('Anonymous')",
          [],
          "42501",
        );
      },
    );
    await t.test(
      "Queue prioritizes user jobs and refuses completion with a stale lease",
      async () => {
        await admin();
        await db.query(
          "insert into public.lyads_jobs(workspace_id,ad_account_id,kind,idempotency_key,priority) values($1,$3,'meta.refresh_permissions','background',0),($1,$2,'meta.sync','manual',100)",
          [wa, a.account, a.account],
        );
        const first = (
          await db.query<{
            id: string;
            lease_token: string;
            idempotency_key: string;
          }>("select * from public.lyads_claim_job(60)")
        ).rows[0];
        assert.equal(first.idempotency_key, "manual");
        const stale = (
          await db.query<{ ok: boolean }>(
            "select public.lyads_finish_job($1,$2,true) as ok",
            [first.id, bob],
          )
        ).rows[0].ok;
        assert.equal(stale, false);
        assert.equal(
          (
            await db.query<{ ok: boolean }>(
              "select public.lyads_finish_job($1,$2,true) as ok",
              [first.id, first.lease_token],
            )
          ).rows[0].ok,
          true,
        );
        assert.equal(
          (
            await db.query<{ idempotency_key: string }>(
              "select * from public.lyads_claim_job(60)",
            )
          ).rows[0].idempotency_key,
          "background",
        );
        await asUser(bob);
        assert.equal(
          (
            await db.query(
              "select id from public.lyads_jobs where workspace_id=$1",
              [wa],
            )
          ).rows.length,
          0,
        );
        await sqlError("select * from public.lyads_claim_job(60)", [], "42501");
        await sqlError("select payload from public.lyads_jobs", [], "42501");
      },
    );
    await t.test(
      "Credit holds prevent overspending; partial success charges only successful units",
      async () => {
        await admin();
        await db.query(
          "select public.lyads_grant_credits($1,'month-test','monthly',60,now()+interval '1 month')",
          [wa],
        );
        await db.query(
          "select public.lyads_grant_credits($1,'month-test','monthly',60,now()+interval '1 month')",
          [wa],
        );
        const operation = (
          await db.query<{ id: string }>(
            "select public.lyads_reserve_credits($1,'studio.image','images',4,6) as id",
            [wa],
          )
        ).rows[0].id;
        assert.equal(
          (
            await db.query<{ id: string }>(
              "select public.lyads_reserve_credits($1,'studio.image','images',4,6) as id",
              [wa],
            )
          ).rows[0].id,
          operation,
        );
        await sqlError(
          "select public.lyads_reserve_credits($1,'studio.image','too-many',7,6)",
          [wa],
          "P0001",
        );
        await sqlError(
          "select public.lyads_reserve_credits($1,'studio.image','wrong-price',1,1)",
          [wa],
          "22023",
        );
        assert.equal(
          (
            await db.query(
              "select * from public.lyads_credit_transactions where kind='debit'",
            )
          ).rows.length,
          0,
        );
        assert.equal(
          Number(
            (
              await db.query<{ charge: string }>(
                "select public.lyads_settle_credits($1,3) as charge",
                [operation],
              )
            ).rows[0].charge,
          ),
          18,
        );
        await db.query("select public.lyads_settle_credits($1,3)", [operation]);
        assert.equal(
          (
            await db.query(
              "select * from public.lyads_credit_transactions where kind='debit'",
            )
          ).rows.length,
          1,
        );
        await asUser(alice);
        assert.equal(
          Number(
            (
              await db.query<{ available: string }>(
                "select * from public.lyads_credit_balance($1)",
                [wa],
              )
            ).rows[0].available,
          ),
          42,
        );
        await sqlError(
          "select public.lyads_grant_credits($1,'forged','monthly',1000,now()+interval '1 month')",
          [wa],
          "42501",
        );
        await admin();
        await db.query("select public.lyads_refund_credits($1)", [operation]);
        await db.query("select public.lyads_refund_credits($1)", [operation]);
        assert.equal(
          (
            await db.query(
              "select * from public.lyads_credit_transactions where kind='refund'",
            )
          ).rows.length,
          1,
        );
        assert.equal(
          Number(
            (
              await db.query<{ available: string }>(
                "select * from public.lyads_credit_balance($1)",
                [wa],
              )
            ).rows[0].available,
          ),
          60,
        );
        await sqlError(
          "delete from public.lyads_credit_transactions",
          [],
          "42501",
        );
      },
    );
    await t.test(
      "Atomic sync hides staged data, rejects stale leases and removes revised empty days",
      async () => {
        await admin();
        const job = await uuid(
          "insert into public.lyads_jobs(workspace_id,ad_account_id,kind,idempotency_key,priority) values($1,$2,'meta.sync','atomic-import',100)",
          [wa, a.account],
        );
        const lease = (
          await db.query<{ id: string; lease_token: string }>(
            "select * from public.lyads_claim_job(60)",
          )
        ).rows[0];
        assert.equal(lease.id, job);
        assert.equal(
          (
            await db.query(
              "select * from public.lyads_start_leased_job($1,$2)",
              [job, lease.lease_token],
            )
          ).rows.length,
          1,
        );
        assert.equal(
          (
            await db.query(
              "select * from public.lyads_start_leased_job($1,$2)",
              [job, lease.lease_token],
            )
          ).rows.length,
          0,
        );
        const run = await uuid(
          "insert into public.lyads_sync_runs(workspace_id,ad_account_id,request_key,status,started_at) values($1,$2,$3,'running',now())",
          [wa, a.account, job],
        );
        const row = {
          workspace_id: wa,
          ad_account_id: a.account,
          sync_run_id: run,
          level: "account",
          date_start: "2026-09-02",
          date_stop: "2026-09-02",
          query_context: {},
          deduplication_key: "atomic-row",
          currency: "EUR",
          metrics: { spend: "123.45" },
          fetched_at: new Date().toISOString(),
        };
        assert.equal(
          (
            await db.query<{ ok: boolean }>(
              "select public.lyads_stage_insights($1,$2,$3,'{}',1) ok",
              [job, bob, JSON.stringify([row])],
            )
          ).rows[0].ok,
          false,
        );
        await db.query("select public.lyads_stage_insights($1,$2,$3,'{}',1)", [
          job,
          lease.lease_token,
          JSON.stringify([row]),
        ]);
        assert.equal(
          (
            await db.query(
              "select id from public.lyads_insight_snapshots where deduplication_key='atomic-row'",
            )
          ).rows.length,
          0,
        );
        await asUser(alice);
        await sqlError(
          "select * from public.lyads_insight_staging",
          [],
          "42501",
        );
        await sqlError(
          "select public.lyads_meta_encryption_key()",
          [],
          "42501",
        );
        await admin();
        const resumed = (
          await db.query<{ id: string; lease_token: string }>(
            "select * from public.lyads_claim_job(60)",
          )
        ).rows[0];
        assert.equal(resumed.id, job);
        await db.query(
          "select public.lyads_complete_sync($1,$2,'2026-09-01','2026-09-02')",
          [job, resumed.lease_token],
        );
        const rows = (
          await db.query<{ metrics: { spend: string } }>(
            "select metrics from public.lyads_insight_snapshots where ad_account_id=$1 and date_start between '2026-09-01' and '2026-09-02'",
            [a.account],
          )
        ).rows;
        assert.deepEqual(rows, [{ metrics: { spend: "123.45" } }]);
        assert.equal(
          (
            await db.query<{ status: string }>(
              "select status from public.lyads_sync_runs where id=$1",
              [run],
            )
          ).rows[0].status,
          "succeeded",
        );
        assert.equal(
          (
            await db.query(
              "select * from public.lyads_insight_staging where job_id=$1",
              [job],
            )
          ).rows.length,
          0,
        );
      },
    );
    await t.test(
      "Structure ingestion preserves identity and journals real field changes once",
      async () => {
        await admin();
        const input = JSON.stringify([
          { id: "123456", name: "Imported", effective_status: "ACTIVE" },
        ]);
        await db.query(
          "select public.lyads_ingest_structure($1,$2,'campaign',$3,$4)",
          [wa, a.account, input, alice],
        );
        await db.query(
          "select public.lyads_ingest_structure($1,$2,'campaign',$3,$4)",
          [wa, a.account, input, alice],
        );
        assert.equal(
          (
            await db.query(
              "select id from public.lyads_campaigns where ad_account_id=$1 and meta_campaign_id='123456'",
              [a.account],
            )
          ).rows.length,
          1,
        );
        assert.equal(
          (
            await db.query(
              "select id from public.lyads_audit_events where operation_id=$1 and entity_id='123456'",
              [alice],
            )
          ).rows.length,
          3,
        );
        await sqlError(
          "select public.lyads_ingest_structure($1,$2,'campaign',$3,$4)",
          [wb, a.account, input, bob],
          "23503",
        );
        await db.query("select public.lyads_schedule_due_jobs()");
        assert.equal(
          (
            await db.query<{ n: number }>(
              "select public.lyads_dispatch_jobs() n",
            )
          ).rows[0].n,
          0,
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
