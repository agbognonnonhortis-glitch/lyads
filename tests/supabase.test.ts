import test from "node:test";
import assert from "node:assert/strict";
import {
  getSupabaseConfig,
  SUPABASE_PROJECT_URL,
} from "../src/lib/supabase/config";
import { checkSupabaseConnection } from "../src/lib/supabase/connection";

const env = {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_PROJECT_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only",
};

test("Supabase configuration rejects missing keys, other projects and private keys", () => {
  assert.throws(() => getSupabaseConfig({}), {
    message: "MISSING_CONFIGURATION",
  });
  assert.throws(
    () =>
      getSupabaseConfig({
        ...env,
        NEXT_PUBLIC_SUPABASE_URL: "https://another.supabase.co",
      }),
    { message: "WRONG_PROJECT" },
  );
  for (const key of [
    "sb_secret_never_public",
    "eyJhbGci.service_role.signature",
    "",
  ]) {
    assert.throws(() =>
      getSupabaseConfig({ ...env, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }),
    );
  }
  assert.deepEqual(getSupabaseConfig(env), {
    url: SUPABASE_PROJECT_URL,
    publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
});

test("Connection diagnostics detect rejected credentials and never claim database reads", async () => {
  const calls: { url: string; method?: string }[] = [];
  const fetcher = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    calls.push({ url: String(input), method: init?.method });
    return new Response(null, {
      status: String(input).includes("/rest/") ? 401 : 200,
    });
  }) as typeof fetch;
  const result = await checkSupabaseConnection(getSupabaseConfig(env), fetcher);
  assert.equal(result.status, "service_unavailable");
  assert.equal(result.databaseReadVerified, false);
  assert.ok(
    calls.every(
      (call) =>
        call.method === "GET" && call.url.startsWith(SUPABASE_PROJECT_URL),
    ),
  );
  assert.equal(calls.length, 2);
  assert.ok(
    !JSON.stringify(result).includes(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  );
});

test("Network errors are reported without leaking request details", async () => {
  const fetcher = (async () => {
    throw new Error("secret request contents");
  }) as typeof fetch;
  const result = await checkSupabaseConnection(getSupabaseConfig(env), fetcher);
  assert.equal(result.status, "service_unavailable");
  assert.ok(
    result.checks.every((check) => check.httpStatus === null && !check.ok),
  );
  assert.ok(!JSON.stringify(result).includes("secret"));
});

test("PostgREST schema response verifies reachability without claiming a table read", async () => {
  for (const code of ["PGRST205", "unrelated_error"]) {
    const fetcher = (async (input: string | URL | Request) => {
      if (String(input).includes("/rest/")) {
        assert.ok(String(input).endsWith("?select=*&limit=0"));
        return Response.json({ code }, { status: 404 });
      }
      return new Response(null, { status: 200 });
    }) as typeof fetch;
    const result = await checkSupabaseConnection(
      getSupabaseConfig(env),
      fetcher,
    );
    assert.equal(
      result.status,
      code === "PGRST205" ? "services_reachable" : "service_unavailable",
    );
    assert.equal(result.databaseReadVerified, false);
    assert.equal(
      result.checks[1].evidence,
      code === "PGRST205" ? "schema_cache_response" : null,
    );
  }
});
