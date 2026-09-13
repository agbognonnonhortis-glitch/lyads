import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { parseHTML } from "linkedom";
import { renderSource } from "../src/lib/source/render";
import { renderDashboard } from "../src/lib/dashboard/render";
import { periodDates } from "../src/lib/dashboard/model";
const controller = readFileSync(
  new URL("../public/source/dashboard.js", import.meta.url),
  "utf8",
);
const wait = () => new Promise((resolve) => setTimeout(resolve, 15));
function harness(fail = false) {
  const { document, window } = parseHTML(
    renderDashboard(renderSource("C1.1")!, {
      organization: { id: "org" },
      displayName: "Test",
    } as any),
  );
  const timers = new Map<number, () => void>();
  let n = 0,
    posts = 0,
    job = "none",
    timestamp = "2026-09-01T12:00:00Z";
  const reads: string[] = [];
  const fetch = async (url: string, options: any) => {
    if (options.method === "POST") {
      posts++;
      job = "running";
      return { ok: true, json: async () => ({ jobId: "job" }) };
    }
    const u = new URL(url, "http://localhost"),
      zone = u.pathname.split("/").at(-1)!;
    reads.push(zone);
    const common = {
      freshness: {
        complete: true,
        lastSynchronizedAt: timestamp,
        accounts: [{ id: "account", lastSynchronizedAt: timestamp }],
      },
      currency: "EUR",
    };
    if (zone === "context")
      return {
        ok: true,
        json: async () => ({
          ...common,
          accounts: [
            {
              id: "account",
              name: "Test",
              currency: "EUR",
              timezone_name: "UTC",
            },
          ],
          selected: ["account"],
          jobs:
            job === "none"
              ? []
              : [{ id: "job", ad_account_id: "account", status: job }],
          credits: { available: "60" },
        }),
      };
    const period = periodDates(
      u.searchParams.get("since")!,
      u.searchParams.get("until")!,
    );
    return {
      ok: true,
      json: async () => ({
        ...common,
        period,
        rows:
          zone === "kpis"
            ? [{ bucket: "current", spend: 100, accounts_count: 1 }]
            : [],
        message: "Aucune donnée",
      }),
    };
  };
  runInNewContext(controller, {
    document,
    URL,
    URLSearchParams,
    Intl,
    Date,
    fetch,
    crypto: { randomUUID: () => String(posts) },
    location: { href: "http://localhost/", assign() {} },
    history: { replaceState() {} },
    setInterval() {},
    setTimeout: (cb: () => void) => {
      timers.set(++n, cb);
      return n;
    },
    clearTimeout: (id: number) => timers.delete(id),
  });
  const click = () =>
    document
      .querySelector('[data-dashboard-action="sync"]')!
      .dispatchEvent(new window.Event("click", { bubbles: true }));
  return {
    document,
    click,
    reads,
    get posts() {
      return posts;
    },
    finish: async () => {
      job = fail ? "failed" : "succeeded";
      if (!fail) timestamp = "2026-09-02T12:00:00Z";
      const pending = [...timers.values()];
      timers.clear();
      for (const cb of pending) await cb();
      await wait();
    },
  };
}
test("Sync debounces clicks, preserves last successful date while running and reloads all widgets after success", async () => {
  const h = harness();
  await wait();
  const before = h.document.querySelector("[data-sync-date]")!.textContent;
  h.click();
  h.click();
  await wait();
  assert.equal(h.posts, 1);
  assert.equal(
    h.document.querySelector("[data-sync-date]")!.textContent,
    before,
  );
  assert.match(
    h.document.querySelector("[data-sync-label]")!.textContent,
    /en cours/,
  );
  const count = h.reads.filter((z) => z === "kpis").length;
  await h.finish();
  assert.notEqual(
    h.document.querySelector("[data-sync-date]")!.textContent,
    before,
  );
  assert.ok(h.reads.filter((z) => z === "kpis").length > count);
  for (const z of [
    "series",
    "campaigns",
    "placements",
    "creatives",
    "alerts",
    "recommendations",
  ])
    assert.ok(h.reads.includes(z));
});
test("A failed sync does not advance the date and explains recovery in French", async () => {
  const h = harness(true);
  await wait();
  const before = h.document.querySelector("[data-sync-date]")!.textContent;
  h.click();
  await wait();
  await h.finish();
  assert.equal(
    h.document.querySelector("[data-sync-date]")!.textContent,
    before,
  );
  assert.match(
    h.document.querySelector("[data-dashboard-status]")!.textContent,
    /échoué.*conservées/,
  );
});
