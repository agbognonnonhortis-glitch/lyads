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
function harness(
  fail = false,
  currency = "EUR",
  href = "http://localhost/",
  scenario = { blocked: false, empty: false },
) {
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
  const navigations: string[] = [];
  const requests: URL[] = [];
  const fetch = async (url: string, options: any) => {
    if (options.method === "POST") {
      posts++;
      job = "running";
      return { ok: true, json: async () => ({ jobId: "job" }) };
    }
    const u = new URL(url, "http://localhost"),
      zone = u.pathname.split("/").at(-1)!;
    reads.push(zone);
    requests.push(u);
    const common = {
      freshness: {
        complete: true,
        lastSynchronizedAt: timestamp,
        accounts: [{ id: "account", lastSynchronizedAt: timestamp }],
      },
      currency,
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
              currency,
              timezone_name: "UTC",
            },
          ],
          selected: ["account"],
          connectionIssues: scenario.blocked
            ? [
                {
                  id: "conn",
                  message:
                    "Connexion Meta non vérifiée. Reconnectez votre Business Manager.",
                },
              ]
            : [],
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
          zone === "kpis" && !scenario.empty
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
    location: {
      href,
      assign(url: string) {
        navigations.push(url);
      },
    },
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
    requests,
    navigations,
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
test("Unverified Meta connection is visible on load and the existing sync button opens reconnection without queueing a doomed sync", async () => {
  const h = harness(false, "USD", "http://localhost/", {
    blocked: true,
    empty: true,
  });
  await wait();
  assert.match(
    h.document.querySelector("[data-dashboard-status]")!.textContent,
    /non vérifiée/,
  );
  assert.equal(
    h.document.querySelector("[data-sync-label]")!.textContent,
    "Reconnecter Meta",
  );
  assert.match(
    h.document.querySelector('[data-metric-note="spend"]')!.textContent,
    /non vérifiée/,
  );
  h.click();
  await wait();
  assert.equal(h.posts, 0);
  assert.deepEqual(h.navigations, ["/configuration/meta"]);
});
test("An empty successful sync never announces that dashboard metrics were updated", async () => {
  const h = harness(false, "USD", "http://localhost/", {
    blocked: false,
    empty: true,
  });
  await wait();
  h.click();
  await wait();
  await h.finish();
  assert.match(
    h.document.querySelector("[data-dashboard-status]")!.textContent,
    /Aucune métrique importée/,
  );
  assert.equal(
    h.document.querySelector('[data-metric="spend"]')!.textContent,
    "—",
  );
});
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

test("Every metric request carries the selected account and exact custom period", async () => {
  const h = harness(
    false,
    "USD",
    "http://localhost/?accounts=account&since=2026-08-01&until=2026-08-11",
  );
  await wait();
  for (const req of h.requests.filter(
    (r) => !r.pathname.endsWith("/context"),
  )) {
    assert.equal(req.searchParams.get("accounts"), "account");
    assert.equal(req.searchParams.get("since"), "2026-08-01");
    assert.equal(req.searchParams.get("until"), "2026-08-11");
  }
  for (const el of h.document.querySelectorAll('[data-metric="spend"]')) {
    assert.match(el.textContent, /100,00.*USD/);
    assert.doesNotMatch(el.textContent, /FCFA|EUR/);
  }
  assert.doesNotMatch(
    h.document.querySelector("#dc-root")!.textContent,
    /FCFA/,
  );
});
test("Monetary figures use the account currency's precision, including zero-decimal JPY", async () => {
  const h = harness(false, "JPY");
  await wait();
  assert.match(
    h.document.querySelector('[data-metric="spend"]')!.textContent,
    /100.*JPY/,
  );
  assert.doesNotMatch(
    h.document.querySelector('[data-metric="spend"]')!.textContent,
    /,00/,
  );
});
