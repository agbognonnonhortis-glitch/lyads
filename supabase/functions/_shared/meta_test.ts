import assert from "node:assert/strict";
import {
  graphUrl,
  permissions,
  sealToken,
  openToken,
  metaError,
  readMeta,
} from "./meta.ts";
Deno.test(
  "Encryption binds the token to its organization and identity",
  async () => {
    const key = btoa(
      String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
    );
    const encrypted = await sealToken("test-only-token", key, "org-a:user-a");
    assert.notEqual(encrypted, "test-only-token");
    assert.equal(
      await openToken(encrypted, key, "org-a:user-a"),
      "test-only-token",
    );
    await assert.rejects(openToken(encrypted, key, "org-b:user-a"));
    const parts = encrypted.split(".");
    parts[1] = (parts[1][0] === "A" ? "B" : "A") + parts[1].slice(1);
    await assert.rejects(openToken(parts.join("."), key, "org-a:user-a"));
  },
);
Deno.test(
  "Permissions are based on grants actually returned, not requested scopes",
  () => {
    const access = permissions([
      { permission: "ads_read", status: "granted" },
      { permission: "ads_management", status: "declined" },
    ]);
    assert.equal(access.canReadAds, true);
    assert.equal(access.canManageAds, false);
    assert.equal(access.canReadBusiness, false);
  },
);
Deno.test(
  "Meta requests cannot follow an arbitrary host and translate errors",
  async () => {
    assert.throws(() => graphUrl("v25.0", "https://untrusted.example"));
    assert.throws(() => graphUrl("latest", "me"));
    assert.equal(metaError(190, 400).code, "META_RECONNECT");
    assert.equal(metaError(200, 403).retryable, false);
    assert.equal(metaError(4, 400).retryable, true);
    let before = false,
      after = false;
    const fetcher: typeof fetch = async (input, init) => {
      assert.equal(before, true);
      assert.equal(new URL(String(input)).hostname, "graph.facebook.com");
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer test",
      );
      return new Response(
        JSON.stringify({
          error: { code: 190, message: "PRIVATE PROVIDER MESSAGE" },
        }),
        { status: 400 },
      );
    };
    await assert.rejects(
      readMeta({
        version: "v25.0",
        path: "me",
        token: "test",
        before: async () => {
          before = true;
        },
        after: async () => {
          after = true;
        },
        fetcher,
      }),
      /META_RECONNECT/,
    );
    assert.equal(after, true);
  },
);
