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
