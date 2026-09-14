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
      "Onboarding persists verified resources, rejects cross-tenant choices and grants free credits once",
      async () => {
        await asUser(alice);
        const ws = await uuid(
          "insert into public.lyads_workspaces(owner_id,name) values ($1,$2)",
          [alice, "Onboarding test"],
        );
        await admin();
        const conn = await uuid(
          "insert into public.lyads_meta_connections(workspace_id,meta_user_id,connection_status) values ($1,'onboarding-test','connected')",
          [ws],
        );
        const account = await uuid(
          "insert into public.lyads_ad_accounts(workspace_id,connection_id,meta_account_id,name,currency,timezone_name) values ($1,$2,'act_991','Onboarding account','EUR','UTC')",
          [ws, conn],
        );
        for (const [kind, id, name] of [
          ["business", "901", "Business 1"],
          ["business", "902", "Business 2"],
          ["page", "903", "Page"],
          ["pixel", "904", "Pixel"],
        ]) {
          await db.query(
            "insert into public.lyads_meta_resources(workspace_id,connection_id,kind,meta_id,source_data) values ($1,$2,$3,$4,$5)",
            [ws, conn, kind, id, JSON.stringify({ name })],
          );
        }
        await db.query(
          "insert into public.lyads_business_accounts values ($1,$2,'901',$3)",
          [ws, conn, account],
        );
        await db.query(
          "insert into public.lyads_resource_links values ($1,$2,'page','903','business','901'),($1,$2,'pixel','904','account',$3)",
          [ws, conn, account],
        );
        const rpc = "select * from public.lyads_save_onboarding($1,$2,$3)";
        await asUser(bob);
        await sqlError(rpc, [ws, 0, "{}"], "42501");
        await asUser(alice);
        await sqlError(
          rpc,
          [ws, 0, JSON.stringify({ plan_key: "free", complete: true })],
          "22023",
        );
        await sqlError(
          rpc,
          [ws, 0, JSON.stringify({ brain: { activity: { source: "agent" } } })],
          "22023",
        );
        await sqlError(
          rpc,
          [
            ws,
            0,
            JSON.stringify({
              business_meta_id: "901",
              ad_account_ids: [a.account],
            }),
          ],
          "42501",
        );
        // A connection alone, or a business without accounts, cannot advance.
        for (const changes of [
          { current_step: 3 },
          { business_meta_id: "901", current_step: 3 },
          {
            business_meta_id: "901",
            ad_account_ids: [account],
            current_step: 4,
          },
          {
            business_meta_id: "901",
            ad_account_ids: [account],
            pages_skipped: true,
            current_step: 4,
          },
          {
            business_meta_id: "901",
            ad_account_ids: [account],
            pixels_skipped: true,
            pages_skipped: true,
            current_step: 8,
            review: true,
            plan_key: "free",
            complete: true,
          },
        ])
          await sqlError(rpc, [ws, 0, JSON.stringify(changes)], "22023");
        let saved: any = (
          await db.query(rpc, [
            ws,
            0,
            JSON.stringify({
              business_meta_id: "901",
              ad_account_ids: [account],
              current_step: 3,
            }),
          ])
        ).rows[0];
        assert.equal(saved.revision, 1);
        await sqlError(rpc, [ws, 0, "{}"], "40001");
        await sqlError(
          rpc,
          [ws, 1, JSON.stringify({ current_step: 5 })],
          "22023",
        );
        await sqlError(
          rpc,
          [
            ws,
            1,
            JSON.stringify({
              pixels: [
                { account_id: account, pixel_id: "904", event: "Purchase" },
              ],
            }),
          ],
          "22023",
        );
        saved = (
          await db.query(rpc, [
            ws,
            1,
            JSON.stringify({
              page_ids: ["903"],
              pixels: [{ account_id: account, pixel_id: "904", event: null }],
              brain: {
                activity: { name: "Client business" },
                offer: { products: [{ name: "Real product", price: "29" }] },
              },
              current_step: 8,
            }),
          ])
        ).rows[0];
        assert.equal(saved.brain.activity.name, "Client business");
        assert.equal(saved.provenance.activity.source, "user");
        await sqlError(
          rpc,
          [ws, 2, JSON.stringify({ current_step: 10 })],
          "23514",
        );
        await sqlError(
          rpc,
          [ws, 2, JSON.stringify({ plan_key: "free", complete: true })],
          "22023",
        );
        const inventory = (
          await db.query<any>(
            "select public.lyads_request_inventory($1,'business') id",
            [ws],
          )
        ).rows[0].id;
        assert.equal(
          (
            await db.query<any>(
              "select public.lyads_request_inventory($1,'business') id",
              [ws],
            )
          ).rows[0].id,
          inventory,
        );
        saved = (
          await db.query(rpc, [
            ws,
            2,
            JSON.stringify({ business_meta_id: "902", current_step: 2 }),
          ])
        ).rows[0];
        assert.deepEqual(saved.ad_account_ids, []);
        assert.deepEqual(saved.page_ids, []);
        assert.deepEqual(saved.pixels, []);
        assert.equal(saved.brain.activity.name, "Client business");
        await sqlError(
          rpc,
          [ws, 3, JSON.stringify({ page_ids: ["903"] })],
          "42501",
        );
        saved = (
          await db.query(rpc, [
            ws,
            3,
            JSON.stringify({
              business_meta_id: "901",
              ad_account_ids: [account],
              page_ids: ["903"],
              pixels_skipped: true,
              current_step: 8,
              review: true,
            }),
          ])
        ).rows[0];
        saved = (
          await db.query(rpc, [
            ws,
            4,
            JSON.stringify({ plan_key: "free", complete: true }),
          ])
        ).rows[0];
        assert.equal(saved.current_step, 10);
        assert.ok(saved.completed_at);
        assert.deepEqual(saved.page_ids, ["903"]);
        assert.deepEqual(saved.pixels, []);
        assert.equal(saved.pixels_skipped, true);
        assert.equal(saved.pages_skipped, false);
        await db.query(rpc, [
          ws,
          5,
          JSON.stringify({ plan_key: "free", complete: true }),
        ]);
        await sqlError(
          "update public.lyads_onboarding set brain='{}' where workspace_id=$1",
          [ws],
          "42501",
        );
        await asUser(bob);
        assert.equal(
          (
            await db.query(
              "select * from public.lyads_onboarding where workspace_id=$1",
              [ws],
            )
          ).rows.length,
          0,
        );
        await sqlError(
          "select public.lyads_request_inventory($1,'root')",
          [ws],
          "42501",
        );
        await admin();
        assert.equal(
          (
            await db.query<any>(
              "select count(*)::int n from public.lyads_credit_lots where workspace_id=$1",
              [ws],
            )
          ).rows[0].n,
          1,
        );
      },
    );
    await t.test(
      "Website jobs isolate tenants, validate evidence and preserve concurrent manual edits",
      async () => {
        await admin();
        const ws = (
          await db.query<any>(
            "select workspace_id from public.lyads_onboarding where brain#>>'{activity,name}'='Client business'",
          )
        ).rows[0].workspace_id;
        await asUser(alice);
        const getState = async () =>
          (
            await db.query<any>(
              "select * from public.lyads_onboarding where workspace_id=$1",
              [ws],
            )
          ).rows[0];
        let state = await getState();
        const request =
          "select public.lyads_request_website_analysis($1,$2,$3) id";
        const args = [ws, state.revision, "https://vendor.fr/"];
        await asUser(bob);
        await sqlError(request, args, "42501");
        await asUser(alice);
        const job = (await db.query<any>(request, args)).rows[0].id;
        state = await getState();
        assert.equal(state.current_step, 6);
        assert.equal(state.analysis_job_id, job);
        assert.equal(
          (
            await db.query<any>(request, [
              ws,
              state.revision,
              "https://vendor.fr/",
            ])
          ).rows[0].id,
          job,
        );
        await sqlError(
          request,
          [ws, state.revision, "https://another.fr/"],
          "P0001",
        );
        const save = "select * from public.lyads_save_onboarding($1,$2,$3)";
        state = (
          await db.query<any>(save, [
            ws,
            state.revision,
            JSON.stringify({
              brain: {
                activity: {
                  benefits: "Correction utilisateur",
                  price: "25 EUR",
                },
              },
            }),
          ])
        ).rows[0];
        await asUser(bob);
        assert.equal(
          (
            await db.query("select id from public.lyads_jobs where id=$1", [
              job,
            ])
          ).rows.length,
          0,
        );
        await admin();
        const lease = "99999999-9999-4999-8999-999999999999";
        const text =
          "Maison Test propose un outil pour les artisans. Il réduit le temps de préparation des devis.";
        await db.query(
          "update public.lyads_jobs set status='running',lease_token=$2,lease_until=now()+interval '1 minute',payload=payload||jsonb_build_object('pages',jsonb_build_array(jsonb_build_object('url','https://vendor.fr/','text',$3::text))) where id=$1",
          [job, lease, text],
        );
        const fields: any = Object.fromEntries(
          [
            "name",
            "product_name",
            "description",
            "benefits",
            "problem",
            "products",
            "niche",
            "audience",
          ].map((k) => [
            k,
            { value: null, evidence: null, source_url: null, kind: "missing" },
          ]),
        );
        fields.name = {
          value: "Maison Test",
          evidence: "Maison Test",
          source_url: "https://vendor.fr/",
          kind: "extracted",
        };
        fields.description = {
          value: "Outil pour les artisans",
          evidence: "un outil pour les artisans",
          source_url: "https://vendor.fr/",
          kind: "extracted",
        };
        fields.benefits = {
          value: "Gain de temps",
          evidence: "Il réduit le temps de préparation des devis.",
          source_url: "https://vendor.fr/",
          kind: "inferred",
        };
        const complete =
          "select public.lyads_complete_website_analysis($1,$2,$3) ok";
        assert.equal(
          (
            await db.query<any>(complete, [
              job,
              "88888888-8888-4888-8888-888888888888",
              JSON.stringify(fields),
            ])
          ).rows[0].ok,
          false,
        );
        await sqlError(
          complete,
          [
            job,
            lease,
            JSON.stringify({
              ...fields,
              description: {
                ...fields.description,
                evidence: "Source inventée",
              },
            }),
          ],
          "22023",
        );
        assert.equal(
          (await db.query<any>(complete, [job, lease, JSON.stringify(fields)]))
            .rows[0].ok,
          true,
        );
        assert.equal(
          (await db.query<any>(complete, [job, lease, JSON.stringify(fields)]))
            .rows[0].ok,
          false,
        );
        await asUser(alice);
        state = await getState();
        assert.equal(state.current_step, 7);
        assert.equal(
          state.brain.activity.description,
          "Outil pour les artisans",
        );
        assert.equal(state.brain.activity.benefits, "Correction utilisateur");
        assert.equal(state.brain.activity.price, "25 EUR");
        assert.equal(state.brain.activity.name, "Client business");
        assert.equal(
          state.provenance.activity_fields.description.source,
          "site",
        );
        assert.equal(state.provenance.activity_fields.benefits.source, "user");
        state = (
          await db.query<any>(save, [
            ws,
            state.revision,
            JSON.stringify({
              brain: { activity: { name: "Entreprise validée" } },
              current_step: 8,
            }),
          ])
        ).rows[0];
        assert.equal(
          (
            await db.query<any>(
              "select name from public.lyads_workspaces where id=$1",
              [ws],
            )
          ).rows[0].name,
          "Entreprise validée",
        );
      },
    );
    await t.test(
      "Dashboard aggregates decimal metrics without mixing levels, breakdowns or unauthorized accounts",
      async () => {
        await admin();
        await db.exec("begin");
        try {
          await db.query(
            "delete from public.lyads_insight_snapshots where ad_account_id=$1",
            [a.account],
          );
          const add = async (
            key: string,
            metrics: object,
            level = "account",
            context: object = { breakdowns: "" },
          ) =>
            db.query(
              "insert into public.lyads_insight_snapshots(workspace_id,ad_account_id,sync_run_id,level,campaign_id,date_start,date_stop,query_context,deduplication_key,currency,metrics,fetched_at) values($1,$2,$3,$4,$5,'2026-09-01','2026-09-01',$6,$7,'EUR',$8,now())",
              [
                wa,
                a.account,
                a.sync,
                level,
                level === "campaign" ? a.campaign : null,
                JSON.stringify(context),
                key,
                JSON.stringify(metrics),
              ],
            );
          await add("dashboard-base", {
            spend: "0.30",
            impressions: "100",
            clicks: "3",
            actions: [
              { action_type: "purchase", value: "2" },
              { action_type: "omni_purchase", value: "2" },
            ],
            action_values: [{ action_type: "purchase", value: "1.20" }],
          });
          await add("dashboard-placement", { spend: "900" }, "account", {
            breakdowns: "publisher_platform,platform_position",
            breakdown_values: {
              publisher_platform: "facebook",
              platform_position: "feed",
            },
          });
          await add("dashboard-campaign", { spend: "50" }, "campaign");
          await asUser(alice);
          const query =
            "select public.lyads_dashboard_metrics($1,$2,'2026-09-01','2026-09-07',$3) result";
          const rows = (await db.query<any>(query, [wa, [a.account], "kpis"]))
            .rows[0].result;
          assert.equal(rows.length, 1);
          assert.equal(rows[0].spend, 0.3);
          assert.equal(rows[0].cpc, 0.1);
          assert.equal(rows[0].purchases, 2);
          assert.equal(rows[0].roas, 4);
          await admin();
          // A second accessible account must never contaminate a one-account request.
          const other = await uuid(
            "insert into public.lyads_ad_accounts(workspace_id,connection_id,meta_account_id,name,currency,timezone_name) values ($1,$2,'other-test','Other','USD','UTC')",
            [wa, a.connection],
          );
          const otherSync = await uuid(
            "insert into public.lyads_sync_runs(workspace_id,ad_account_id,request_key) values($1,$2,'other-dashboard')",
            [wa, other],
          );
          await db.query(
            "insert into public.lyads_insight_snapshots(workspace_id,ad_account_id,sync_run_id,level,date_start,date_stop,query_context,deduplication_key,currency,metrics,fetched_at) values($1,$2,$3,'account','2026-09-01','2026-09-01','{}','other','USD','{\"spend\":\"999\"}',now())",
            [wa, other, otherSync],
          );
          for (const [date, spend] of [
            ["2026-08-25", "10"],
            ["2026-08-24", "9999"],
            ["2026-09-08", "8888"],
          ]) {
            await db.query(
              "insert into public.lyads_insight_snapshots(workspace_id,ad_account_id,sync_run_id,level,date_start,date_stop,query_context,deduplication_key,currency,metrics,fetched_at) values($1,$2,$3,'account',$4::date,$4::date,'{}',$4::text,'EUR',$5,now())",
              [wa, a.account, a.sync, date, JSON.stringify({ spend })],
            );
          }
          await asUser(alice);
          const scoped = (await db.query<any>(query, [wa, [a.account], "kpis"]))
            .rows[0].result;
          assert.equal(
            scoped.find((r: any) => r.bucket === "current").spend,
            0.3,
          );
          assert.equal(
            scoped.find((r: any) => r.bucket === "previous").spend,
            10,
          );
          assert.ok(scoped.every((r: any) => r.currency === "EUR"));
          const series = (
            await db.query<any>(query, [wa, [a.account], "series"])
          ).rows[0].result;
          assert.deepEqual(
            series.map((r: any) => r.bucket),
            ["2026-08-25", "2026-09-01"],
          );
          const campaigns = (
            await db.query<any>(query, [wa, [a.account], "campaigns"])
          ).rows[0].result;
          assert.equal(campaigns[0].spend, 50);
          assert.equal(campaigns[0].roas, null);
          await db.exec("savepoint denied");
          await sqlError(query, [wa, [a.account, b.account], "kpis"], "42501");
          await db.exec("rollback to savepoint denied");
          const empty = (
            await db.query<any>(
              "select public.lyads_dashboard_metrics($1,$2,'2025-01-01','2025-01-07','kpis') result",
              [wa, [a.account]],
            )
          ).rows[0].result;
          assert.deepEqual(empty, []);
        } finally {
          await db.exec("rollback");
        }
      },
    );
    await t.test(
      "Notification reads and read receipts respect recipients, organisations and account access",
      async () => {
        await admin();
        await db.exec("begin");
        try {
          const insert =
            "insert into public.lyads_notifications(workspace_id,ad_account_id,user_id,event_key,kind,message) values($1,$2,$3,$4,'sync.complete','Test')";
          const own = await uuid(insert, [wa, a.account, alice, "notice-a"]);
          const other = await uuid(insert, [wb, b.account, bob, "notice-b"]);
          const hidden = await uuid(insert, [
            wa,
            a.account,
            bob,
            "notice-hidden",
          ]);
          const general = await uuid(insert, [wa, null, bob, "notice-general"]);
          await asUser(alice);
          await db.query(
            "select public.lyads_set_member($1,$2,'editor','[]')",
            [wa, bob],
          );
          await asUser(bob);
          const rows = (
            await db.query<{ id: string }>(
              "select id from public.lyads_notifications where id=any($1::uuid[])",
              [[own, other, hidden, general]],
            )
          ).rows;
          assert.deepEqual(
            rows.map((r) => r.id).sort(),
            [other, general].sort(),
          );
          const denied = await db.query(
            "update public.lyads_notifications set read_at=now() where id=any($1::uuid[]) returning id",
            [[own, hidden]],
          );
          assert.equal(denied.rows.length, 0);
          const updated = await db.query(
            "update public.lyads_notifications set read_at=now() where id=$1 and read_at is null returning id",
            [other],
          );
          assert.equal(updated.rows.length, 1);
          assert.equal(
            (
              await db.query(
                "update public.lyads_notifications set read_at=now() where id=$1 and read_at is null returning id",
                [other],
              )
            ).rows.length,
            0,
          );
          await db.exec("savepoint content");
          await sqlError(
            "update public.lyads_notifications set message='forged' where id=$1",
            [other],
            "42501",
          );
          await db.exec("rollback to savepoint content");
        } finally {
          await db.exec("rollback");
        }
      },
    );
    await t.test(
      "Token validation and invalidation cannot overwrite a replacement OAuth credential",
      async () => {
        await admin();
        await db.exec("begin");
        try {
          const scopes = [
            "ads_read",
            "ads_management",
            "business_management",
            "pages_show_list",
            "pages_read_engagement",
          ];
          const save =
            "select public.lyads_save_verified_meta_connection($1,'90210',$2,'{}',null,$3,'123',null) as id";
          const conn = (
            await db.query<{ id: string }>(save, [wa, scopes, "cipher-old"])
          ).rows[0].id;
          assert.equal(
            (
              await db.query<{ connection_status: string }>(
                "select connection_status from public.lyads_meta_connections where id=$1",
                [conn],
              )
            ).rows[0].connection_status,
            "connected",
          );
          await db.query(save, [wa, scopes, "cipher-new"]);
          const validate =
            "select public.lyads_record_meta_validation($1,$2,'123',null,null) as ok";
          assert.equal(
            (await db.query<{ ok: boolean }>(validate, [conn, "cipher-old"]))
              .rows[0].ok,
            false,
          );
          assert.equal(
            (
              await db.query<{ ok: boolean }>(
                "select public.lyads_invalidate_meta_token($1,'cipher-old') as ok",
                [conn],
              )
            ).rows[0].ok,
            false,
          );
          assert.equal(
            (
              await db.query<{ ok: boolean }>(
                "select public.lyads_record_meta_permissions($1,'cipher-old','{}','{}') as ok",
                [conn],
              )
            ).rows[0].ok,
            false,
          );
          assert.equal(
            (await db.query<{ ok: boolean }>(validate, [conn, "cipher-new"]))
              .rows[0].ok,
            true,
          );
          await db.query(
            "select public.lyads_record_meta_permissions($1,'cipher-new',array['ads_read'],'{}')",
            [conn],
          );
          assert.equal(
            (
              await db.query<{ connection_status: string }>(
                "select connection_status from public.lyads_meta_connections where id=$1",
                [conn],
              )
            ).rows[0].connection_status,
            "partial",
          );
          await asUser(alice);
          await db.exec("savepoint denied");
          await sqlError(validate, [conn, "cipher-new"], "42501");
          await db.exec("rollback to savepoint denied");
        } finally {
          await db.exec("rollback");
        }
      },
    );
    await t.test(
      "Signed webhook ingestion is service-only, deduplicated, and limited to selected accounts of its app",
      async () => {
        await admin();
        await db.exec("begin");
        try {
          await db.query(
            "update public.lyads_meta_connections set meta_app_id='123',connection_status='connected',revoked_at=null where id=$1",
            [a.connection],
          );
          await db.query(
            "update public.lyads_meta_connections set meta_app_id='456',connection_status='connected',revoked_at=null where id=$1",
            [b.connection],
          );
          await db.query(
            "update public.lyads_ad_accounts set meta_account_id='act_121' where id=any($1::uuid[])",
            [[a.account, b.account]],
          );
          for (const [workspace, account] of [
            [wa, a.account],
            [wb, b.account],
          ]) {
            await db.query(
              "insert into public.lyads_onboarding(workspace_id,ad_account_ids) values($1,array[$2::uuid]) on conflict(workspace_id) do update set ad_account_ids=excluded.ad_account_ids",
              [workspace, account],
            );
            await db.query(
              "insert into public.lyads_meta_sync_settings(workspace_id,ad_account_id,next_sync_at) values($1,$2,now()+interval '1 day') on conflict(ad_account_id) do update set next_sync_at=excluded.next_sync_at,enabled=true",
              [workspace, account],
            );
          }
          const receive =
            "select public.lyads_receive_meta_webhook('123',$1,array['act_121','act_999']) as ok";
          assert.equal(
            (await db.query<{ ok: boolean }>(receive, ["a".repeat(64)])).rows[0]
              .ok,
            true,
          );
          const due =
            "select next_sync_at<now()+interval '2 minutes' as due from public.lyads_meta_sync_settings where ad_account_id=$1";
          assert.equal(
            (await db.query<{ due: boolean }>(due, [a.account])).rows[0].due,
            true,
          );
          assert.equal(
            (await db.query<{ due: boolean }>(due, [b.account])).rows[0].due,
            false,
          );
          await db.query(
            "update public.lyads_meta_sync_settings set next_sync_at=now()+interval '1 day' where ad_account_id=$1",
            [a.account],
          );
          assert.equal(
            (await db.query<{ ok: boolean }>(receive, ["a".repeat(64)])).rows[0]
              .ok,
            false,
          );
          assert.equal(
            (await db.query<{ due: boolean }>(due, [a.account])).rows[0].due,
            false,
          );
          await db.query(
            "update public.lyads_onboarding set ad_account_ids='{}' where workspace_id=$1",
            [wa],
          );
          await db.query(receive, ["b".repeat(64)]);
          assert.equal(
            (await db.query<{ due: boolean }>(due, [a.account])).rows[0].due,
            false,
          );
          await asUser(alice);
          await db.exec("savepoint denied");
          await sqlError(receive, ["c".repeat(64)], "42501");
          await db.exec("rollback to savepoint denied");
        } finally {
          await db.exec("rollback");
        }
      },
    );
    await t.test(
      "Performance alerts use significant data, real targets, comparable peers and account isolation",
      async () => {
        await admin();
        await db.exec("begin");
        try {
          await db.query(
            "update public.lyads_campaigns set effective_status='ACTIVE' where id=$1",
            [a.campaign],
          );
          await db.query(
            "update public.lyads_ads set effective_status='ACTIVE' where id=$1",
            [a.ad],
          );
          await db.query(
            `update public.lyads_ad_sets set effective_status='ACTIVE',source_data='{"optimization_goal":"OFFSITE_CONVERSIONS","attribution_spec":[{"event_type":"CLICK_THROUGH","window_days":7}]}' where id=$1`,
            [a.adset],
          );
          const peer = await uuid(
            `insert into public.lyads_ad_sets(workspace_id,ad_account_id,campaign_id,meta_ad_set_id,name,effective_status,source_data,synchronized_at) select workspace_id,ad_account_id,campaign_id,'peer','Peer','ACTIVE',source_data,now() from public.lyads_ad_sets where id=$1`,
            [a.adset],
          );
          await db.query(
            `insert into public.lyads_alert_settings(workspace_id,ad_account_id,target_cpa,target_roas) values($1,$2,10,1)`,
            [wa, a.account],
          );
          for (const [level, column, entity] of [
            ["campaign", "campaign_id", a.campaign],
            ["ad", "ad_id", a.ad],
            ["ad_set", "ad_set_id", a.adset],
            ["ad_set", "ad_set_id", peer],
          ]) {
            await db.query(
              `insert into public.lyads_insight_snapshots(workspace_id,ad_account_id,sync_run_id,level,${column},date_start,date_stop,query_context,deduplication_key,currency,metrics,fetched_at)
            select $1,$2,$3,$4,$5::uuid,d::date,d::date,'{}',$5::uuid::text||':'||d::date,'EUR',jsonb_build_object('spend',case when $5::uuid=$6::uuid then '20' when $4='ad_set' then '200' when d<'2026-08-08' then '20' else '40' end,'impressions','2000','clicks',case when d<'2026-08-08' then '100' else '40' end,'frequency','4','actions',jsonb_build_array(jsonb_build_object('action_type','purchase','value','2')),'action_values',jsonb_build_array(jsonb_build_object('action_type','purchase','value','10'))),now()
            from generate_series('2026-08-01'::date,'2026-08-14'::date,interval '1 day') d`,
              [wa, a.account, a.sync, level, entity, peer],
            );
          }
          const compute = async () =>
            (
              await db.query<{ result: any }>(
                "select public.lyads_compute_alerts($1,'2026-08-08','2026-08-14') result",
                [a.account],
              )
            ).rows[0].result;
          const result = await compute();
          assert.deepEqual(result.rows.map((r: any) => r.detector).sort(), [
            "budget_imbalance",
            "cpa_high",
            "creative_fatigue",
            "roas_low",
          ]);
          assert.equal(
            result.rows.find((r: any) => r.detector === "cpa_high").evidence
              .observed,
            20,
          );
          assert.equal(
            result.rows.find((r: any) => r.detector === "creative_fatigue")
              .evidence.previous_cpa,
            10,
          );
          assert.equal(result.sufficient_entities, 4);
          assert.ok(
            result.rows.every(
              (r: any) =>
                r.sufficientData &&
                r.currency === "EUR" &&
                r.account_id === a.account,
            ),
          );
          // Missing purchases are unknown, never fabricated zero conversions.
          await db.exec("savepoint thin");
          await db.query(
            "update public.lyads_insight_snapshots set metrics=metrics-'actions' where ad_account_id=$1",
            [a.account],
          );
          assert.equal((await compute()).rows.length, 0);
          assert.equal((await compute()).sufficient_entities, 0);
          await db.exec("rollback to savepoint thin");
          await db.query(
            "update public.lyads_alert_settings set min_purchases=1000 where ad_account_id=$1",
            [a.account],
          );
          assert.equal((await compute()).rows.length, 0);
          await db.exec("rollback to savepoint thin");
          await db.query(
            "update public.lyads_alert_settings set target_cpa=null,target_roas=null where ad_account_id=$1",
            [a.account],
          );
          assert.deepEqual(
            (await compute()).rows.map((r: any) => r.detector).sort(),
            ["budget_imbalance", "creative_fatigue"],
          );
          await db.exec("rollback to savepoint thin");
          await db.query(
            "update public.lyads_ad_sets set source_data=source_data-'attribution_spec' where id=$1",
            [peer],
          );
          assert.ok(
            !(await compute()).rows.some(
              (r: any) => r.detector === "budget_imbalance",
            ),
          );
          await db.exec("rollback to savepoint thin");
          // Short observation periods cannot trigger fatigue.
          const short = (
            await db.query<{ result: any }>(
              "select public.lyads_compute_alerts($1,'2026-08-12','2026-08-14') result",
              [a.account],
            )
          ).rows[0].result;
          assert.ok(
            !short.rows.some((r: any) => r.detector === "creative_fatigue"),
          );
          await asUser(alice);
          const query =
            "select public.lyads_request_alert_scan($1,'2026-08-08','2026-08-14') id";
          const job = (await db.query<{ id: string }>(query, [a.account]))
            .rows[0].id;
          assert.equal(
            (await db.query<{ id: string }>(query, [a.account])).rows[0].id,
            job,
          );
          await db.query(
            "update public.lyads_alert_settings set target_cpa=11 where ad_account_id=$1",
            [a.account],
          );
          assert.notEqual(
            (await db.query<{ id: string }>(query, [a.account])).rows[0].id,
            job,
          );
          await db.exec("savepoint denied");
          await sqlError(query, [b.account], "42501");
          await db.exec("rollback to savepoint denied");
          await sqlError(
            "select public.lyads_compute_alerts($1,'2026-08-08','2026-08-14')",
            [a.account],
            "42501",
          );
          await db.exec("rollback to savepoint denied");
          await sqlError(
            "update public.lyads_alert_settings set min_purchases=0 where ad_account_id=$1",
            [a.account],
            "23514",
          );
          await db.exec("rollback to savepoint denied");
          await asUser(bob);
          assert.equal(
            (
              await db.query(
                "select * from public.lyads_alert_settings where ad_account_id=$1",
                [a.account],
              )
            ).rows.length,
            0,
          );
        } finally {
          await db.exec("rollback");
        }
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
