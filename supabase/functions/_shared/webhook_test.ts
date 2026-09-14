import assert from "node:assert/strict";
import { handle } from "../lyads-meta-webhook/handler.ts";
import {
  boundedBody,
  sameToken,
  verifySignature,
  webhookAccounts,
} from "./webhook.ts";
const encoder = new TextEncoder();
Deno.test("Webhook HTTP verification requires consent token and acknowledges only durable signed deliveries", async () => {
  let received = 0;
  const config = {
    appId: "123",
    appSecret: "a".repeat(32),
    verifyToken: "b".repeat(32),
    receive: async (_hash: string, ids: string[]) => {
      received++;
      assert.deepEqual(ids, ["act_789"]);
    },
  };
  const url =
    "https://fixture.invalid?hub.mode=subscribe&hub.challenge=123&hub.verify_token=";
  assert.equal((await handle(new Request(url + "wrong"), config)).status, 403);
  const verification = await handle(
    new Request(url + config.verifyToken),
    config,
  );
  assert.equal(verification.status, 200);
  assert.equal(await verification.text(), "123");
  assert.equal(
    (await handle(new Request(url), { ...config, verifyToken: "" })).status,
    503,
  );
  const body = JSON.stringify({
    object: "ad_account",
    entry: [{ id: "789", changes: [{ field: "ads" }] }],
  });
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(config.appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = "sha256=" +
    [
      ...new Uint8Array(
        await crypto.subtle.sign("HMAC", key, encoder.encode(body)),
      ),
    ].map((b) => b.toString(16).padStart(2, "0")).join("");
  const request = () =>
    new Request("https://fixture.invalid", {
      method: "POST",
      body,
      headers: { "x-hub-signature-256": signature },
    });
  assert.equal(
    (await handle(
      new Request("https://fixture.invalid", { method: "POST", body }),
      config,
    )).status,
    401,
  );
  assert.equal(received, 0);
  assert.equal((await handle(request(), config)).status, 200);
  assert.equal(received, 1);
  const unavailable = await handle(request(), {
    ...config,
    receive: async () => {
      throw new Error("PRIVATE DATABASE DETAIL");
    },
  });
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.text()).includes("PRIVATE"), false);
});
Deno.test("Webhooks authenticate the exact raw body and reject tampering or missing signatures", async () => {
  const body = encoder.encode('{"object":"ad_account","entry":[]}');
  const secret = "fixture-only-secret";
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = "sha256=" +
    [...new Uint8Array(await crypto.subtle.sign("HMAC", key, body))].map((b) =>
      b.toString(16).padStart(2, "0")
    ).join("");
  assert.equal(await verifySignature(body, signature, secret), true);
  assert.equal(
    await verifySignature(encoder.encode("{}"), signature, secret),
    false,
  );
  assert.equal(await verifySignature(body, signature, "wrong"), false);
  assert.equal(await verifySignature(body, null, secret), false);
  assert.equal(await verifySignature(body, "sha256=1234", secret), false);
  assert.equal(await sameToken("expected", "expected"), true);
  assert.equal(await sameToken("different", "expected"), false);
  assert.equal(await sameToken("", ""), false);
});
Deno.test("Webhook routing only accepts ad-account changes and bounds streamed bodies", async () => {
  assert.deepEqual(
    webhookAccounts({ object: "page", entry: [{ id: "123" }] }),
    [],
  );
  assert.deepEqual(
    webhookAccounts({
      object: "ad_account",
      entry: [{ id: "123", changes: [{ field: "ads" }] }, {
        id: "act_123",
        changes: [{}],
      }],
    }),
    ["act_123"],
  );
  assert.throws(() =>
    webhookAccounts({
      object: "ad_account",
      entry: [{ id: "https://example.com", changes: [{}] }],
    })
  );
  assert.throws(() =>
    webhookAccounts({ object: "ad_account", entry: new Array(201).fill({}) })
  );
  assert.equal(
    new TextDecoder().decode(
      await boundedBody(
        new Request("https://fixture.invalid", { method: "POST", body: "123" }),
        4,
      ),
    ),
    "123",
  );
  await assert.rejects(
    boundedBody(
      new Request("https://fixture.invalid", { method: "POST", body: "12345" }),
      4,
    ),
    /BODY_TOO_LARGE/,
  );
});
