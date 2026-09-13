import { test } from "node:test";
import assert from "node:assert/strict";
// Run against a running local server; never sends email or creates accounts.
const origin = process.env.AUTH_TEST_ORIGIN || "http://127.0.0.1:3000";
const post = (
  action: string,
  body = "{}",
  headers: Record<string, string> = {},
) =>
  fetch(origin + "/api/auth/" + action, {
    method: "POST",
    headers: { origin, "content-type": "application/json", ...headers },
    body,
    redirect: "manual",
  });

test("HTTP auth boundary rejects cross-site and malformed requests without creating a session", async () => {
  for (const [action, body, headers, status] of [
    ["google", "{}", { origin: "https://untrusted.example" }, 403],
    ["google", "{}", { "sec-fetch-site": "cross-site" }, 403],
    ["google", "{}", { "content-type": "text/plain" }, 415],
    ["google", "null", {}, 400],
    ["google", "{", {}, 400],
    ["google", JSON.stringify({ padding: "x".repeat(9000) }), {}, 413],
    ["login", "{}", {}, 400],
    ["signup", "{}", {}, 400],
    ["reset", "{}", {}, 401],
    ["unknown", "{}", {}, 404],
  ] as [string, string, Record<string, string>, number][]) {
    const response = await post(action, body, headers);
    assert.equal(response.status, status, `${action}: ${status}`);
    assert.match(response.headers.get("cache-control") || "", /no-store/);
  }
  for (const path of [
    "/app/tableau-de-bord",
    "/bienvenue",
    "/nouveau-mot-de-passe",
  ]) {
    const response = await fetch(origin + path, { redirect: "manual" });
    assert.equal(response.status, 303);
    assert.equal(new URL(response.headers.get("location")!).origin, origin);
  }
});

test("Both OAuth providers produce PKCE redirects with HttpOnly cookies and reach their authorization servers", async () => {
  for (const provider of ["google", "facebook"]) {
    const response = await post(provider);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.ok, true);
    const url = new URL(result.redirect);
    assert.equal(url.origin, "https://beplqbktgbizhfcoixoi.supabase.co");
    assert.equal(url.pathname, "/auth/v1/authorize");
    assert.equal(url.searchParams.get("provider"), provider);
    assert.equal(url.searchParams.get("code_challenge_method"), "s256");
    assert.ok(url.searchParams.get("code_challenge"));
    assert.equal(
      url.searchParams.get("redirect_to"),
      origin + "/auth/callback?flow=oauth",
    );
    const cookies = response.headers.getSetCookie();
    assert.ok(cookies.length > 0);
    for (const cookie of cookies) {
      assert.match(cookie, /HttpOnly/i);
      assert.match(cookie, /SameSite=lax/i);
    }
    // Does not authenticate a person or accept consent. No tokens are logged.
    const authorize = await fetch(url, { redirect: "manual" });
    assert.equal(authorize.status, 302);
    const external = new URL(authorize.headers.get("location")!);
    assert.ok(
      provider === "google"
        ? external.hostname === "accounts.google.com"
        : external.hostname.endsWith(".facebook.com"),
    );
    assert.equal(
      external.searchParams.get("redirect_uri"),
      "https://beplqbktgbizhfcoixoi.supabase.co/auth/v1/callback",
    );
  }
});
