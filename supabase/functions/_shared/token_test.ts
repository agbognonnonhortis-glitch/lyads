import assert from "node:assert/strict";
import { inspectToken, tokenMetadata } from "./token.ts";
import { META_SCOPES, permissions } from "./meta.ts";
const now = 1700000000000;
const valid = {
  is_valid: true,
  app_id: "123",
  user_id: "456",
  type: "USER",
  expires_at: now / 1000 + 3600,
  data_access_expires_at: now / 1000 + 7200,
};
Deno.test("Token validation rejects a different app, identity, expired access and malformed metadata", () => {
  const read = (patch = {}) =>
    tokenMetadata({ data: { ...valid, ...patch } }, "123", "456", now);
  assert.equal(read().appId, "123");
  assert.throws(() => read({ app_id: "789" }), /META_APP_CHANGED/);
  for (
    const patch of [
      { is_valid: false },
      { user_id: "789" },
      { type: "SYSTEM_USER" },
      { expires_at: now / 1000 },
      { data_access_expires_at: now / 1000 - 1 },
    ]
  ) assert.throws(() => read(patch), /META_RECONNECT/);
  for (
    const patch of [
      { expires_at: "0" },
      { data_access_expires_at: undefined },
      { expires_at: NaN },
    ]
  ) assert.throws(() => read(patch), /META_INVALID_RESPONSE/);
  assert.equal(
    read({ expires_at: 0, data_access_expires_at: 0 }).expiresAt,
    null,
  );
});
Deno.test("Introspection uses app credentials server-side and distinguishes invalid app credentials", async () => {
  let calls = 0;
  const options = {
    version: "v26.0",
    token: "fixture-user-token",
    appId: "123",
    appSecret: "a".repeat(32),
    userId: "456",
    before: async () => {
      calls++;
    },
    after: async () => {},
  };
  const result = await inspectToken({
    ...options,
    fetcher: async (url, init) => {
      const u = new URL(String(url));
      assert.equal(u.pathname, "/v26.0/debug_token");
      assert.equal(u.searchParams.get("input_token"), options.token);
      assert.equal(u.searchParams.has("access_token"), false);
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer 123|" + options.appSecret,
      );
      return Response.json({
        data: { ...valid, expires_at: 0, data_access_expires_at: 0 },
      });
    },
  });
  assert.equal(result.userId, "456");
  assert.equal(calls, 1);
  await assert.rejects(
    inspectToken({
      ...options,
      fetcher: async () =>
        Response.json({
          error: { code: 100, message: "PRIVATE TOKEN DETAILS" },
        }, { status: 400 }),
    }),
    /META_TOKEN_UNVERIFIED/,
  );
  await assert.rejects(
    inspectToken({
      ...options,
      fetcher: async () =>
        Response.json({
          error: { code: 190, message: "SECRET PROVIDER DETAIL" },
        }, { status: 400 }),
    }),
    /META_NOT_CONFIGURED/,
  );
});
Deno.test("Partial page permissions remain explicit while ads reads can continue", () => {
  const partial = permissions(
    META_SCOPES.filter((s) => s !== "pages_read_engagement").map((
      permission,
    ) => ({ permission, status: "granted" })),
  );
  assert.equal(partial.canReadAds, true);
  assert.equal(partial.canListPages, true);
  assert.equal(partial.canReadPages, false);
  assert.equal(partial.complete, false);
  assert.deepEqual(partial.missing, ["pages_read_engagement"]);
});
