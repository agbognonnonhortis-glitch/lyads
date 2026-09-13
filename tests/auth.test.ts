import { test } from "node:test";
import assert from "node:assert/strict";
import {
  appOrigin,
  sameOrigin,
  isStrongPassword,
  isEmail,
  isName,
  privatePath,
} from "../src/lib/auth/validation";

test("Auth POSTs require the application's origin, including when fetch metadata is absent", () => {
  const original = process.env.APP_URL;
  process.env.APP_URL = "https://lyads.example";
  try {
    const request = (headers: Record<string, string>) =>
      new Request("https://lyads.example/api/auth/login", { headers });
    assert.equal(sameOrigin(request({})), false);
    assert.equal(
      sameOrigin(request({ origin: "https://evil.example" })),
      false,
    );
    assert.equal(
      sameOrigin(
        request({
          origin: "https://lyads.example",
          "sec-fetch-site": "cross-site",
        }),
      ),
      false,
    );
    assert.equal(
      sameOrigin(request({ origin: "https://lyads.example" })),
      true,
    );
  } finally {
    if (original === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = original;
  }
});

test("OAuth return origins cannot be supplied by a remote request host", () => {
  const original = process.env.APP_URL;
  try {
    delete process.env.APP_URL;
    assert.equal(
      appOrigin(
        new Request("http://localhost:3000", {
          headers: { host: "127.0.0.1:3000" },
        }),
      ),
      "http://127.0.0.1:3000",
    );
    assert.throws(
      () => appOrigin(new Request("https://evil.example")),
      /MISSING_APP_URL/,
    );
    for (const value of [
      "https://lyads.example/redirect",
      "https://lyads.example?next=evil",
      "http://lyads.example",
      "ftp://localhost",
      "https://user:secret@lyads.example",
    ]) {
      process.env.APP_URL = value;
      assert.throws(() => appOrigin(new Request("https://lyads.example")));
    }
    process.env.APP_URL = "https://lyads.example";
    assert.equal(
      appOrigin(new Request("https://evil.example")),
      "https://lyads.example",
    );
    process.env.APP_URL = "http://127.0.0.1:3000";
    assert.equal(
      appOrigin(new Request("http://127.0.0.1:3000")),
      "http://127.0.0.1:3000",
    );
  } finally {
    if (original === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = original;
  }
});

test("Account validation rejects malformed values and applies the supplied password requirements", () => {
  assert.equal(isEmail(" test@example.com "), true);
  for (const value of [null, {}, "missing-domain", "a b@example.com", "a@"])
    assert.equal(isEmail(value), false);
  assert.equal(isName(" Élodie "), true);
  for (const value of [null, "  ", "a".repeat(101)])
    assert.equal(isName(value), false);
  assert.equal(isStrongPassword("Valid-test-123"), true);
  for (const value of [
    null,
    "shortA1",
    "no-capitals-123",
    "NoDigitsAnywhere",
    "A1".repeat(65),
  ])
    assert.equal(isStrongPassword(value), false);
  for (const path of [
    "/bienvenue",
    "/app",
    "/app/tableau-de-bord",
    "/configuration/entreprise",
  ])
    assert.equal(privatePath(path), true);
  for (const path of ["/", "/connexion", "/inscription"])
    assert.equal(privatePath(path), false);
});

import { initializeAccount } from "../src/lib/auth/account";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const testIdentity = {
  id: "local-test-user",
  email: "test@example.invalid",
  user_metadata: { full_name: "Test User" },
  app_metadata: {},
  aud: "authenticated",
  created_at: "2026-09-13T00:00:00Z",
} as User;

test("An initialization gateway timeout retries the same atomic RPC and recovers", async () => {
  const calls: unknown[] = [];
  const client = {
    rpc: async (...args: unknown[]) => {
      calls.push(args);
      return calls.length < 3
        ? {
            data: null,
            error: { code: "", message: "Gateway timeout" },
            status: 504,
          }
        : { data: "existing-workspace-id", error: null, status: 200 };
    },
  } as unknown as SupabaseClient;
  assert.equal(
    await initializeAccount(client, testIdentity),
    "existing-workspace-id",
  );
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[0], [
    "lyads_initialize_account",
    { display_name: "Test User" },
  ]);
  assert.deepEqual(calls[1], calls[0]);
  assert.deepEqual(calls[2], calls[0]);
});

test("Permanent authorization failures are not retried, and logs exclude private response contents", async (t) => {
  let calls = 0;
  const logger = t.mock.method(console, "error", () => {});
  const client = {
    rpc: async () => {
      calls++;
      return {
        data: null,
        error: { code: "42501", message: "private response body" },
        status: 403,
      };
    },
  } as unknown as SupabaseClient;
  await assert.rejects(
    initializeAccount(client, testIdentity),
    /ACCOUNT_INITIALIZATION_FAILED/,
  );
  assert.equal(calls, 1);
  assert.deepEqual(logger.mock.calls[0].arguments, [
    "[auth] account_initialization_failed",
    { status: 403, code: "42501", attempts: 1 },
  ]);
});

test("Repeated temporary failures stop after three attempts", async (t) => {
  t.mock.method(console, "error", () => {});
  let calls = 0;
  const client = {
    rpc: async () => {
      calls++;
      return { data: null, error: { code: "" }, status: 503 };
    },
  } as unknown as SupabaseClient;
  await assert.rejects(
    initializeAccount(client, testIdentity),
    /ACCOUNT_INITIALIZATION_FAILED/,
  );
  assert.equal(calls, 3);
});
