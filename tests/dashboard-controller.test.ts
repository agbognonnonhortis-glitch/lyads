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
  scenario: {
    blocked: boolean;
    empty: boolean;
    alerts?: any[];
    recommendations?: any[];
  } = { blocked: false, empty: false },
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
    progress = 0,
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
              : [
                  {
                    id: "job",
                    ad_account_id: "account",
                    status: job,
                    progress_done: progress,
                    result: {
                      sync_progress: {
                        phase: "metrics",
                        completed_slices: progress,
                        total_slices: 12,
                        published_at: String(progress),
                      },
                    },
                  },
                ],
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
            : zone === "alerts"
              ? scenario.alerts || []
              : zone === "recommendations"
                ? scenario.recommendations || []
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
  const clickElement = (selector: string) =>
    document
      .querySelector(selector)!
      .dispatchEvent(new window.Event("click", { bubbles: true }));
  const click = () =>
    document
      .querySelector('[data-dashboard-action="sync"]')!
      .dispatchEvent(new window.Event("click", { bubbles: true }));
  return {
    document,
    click,
    clickElement,
    reads,
    requests,
    navigations,
    get posts() {
      return posts;
    },
    advance: async () => {
      progress++;
      const pending = [...timers.values()];
      timers.clear();
      for (const cb of pending) await cb();
      await wait();
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

test("Alert cards combine only allowed sources, exclude insufficient performance, and prioritize real severity", async () => {
  const h = harness(false, "USD", "http://localhost/", {
    blocked: false,
    empty: false,
    alerts: [
      { id: "ad", kind: "ad", title: "Excluded delivery status" },
      {
        id: "insufficient",
        kind: "performance",
        sufficientData: false,
        title: "Excluded low volume",
      },
      {
        id: "perf",
        kind: "performance",
        sufficientData: true,
        severity: "high",
        title: '<img src=x onerror="bad()">',
        message: "CPA observé : 20 USD ; cible : 10 USD.",
      },
      {
        id: "conn",
        kind: "connection",
        severity: "critical",
        title: "Connexion expirée",
        message: "Reconnectez Meta.",
      },
    ],
    recommendations: [
      {
        id: "rec",
        title: "Proposition de l’agent",
        message: "Justification disponible.",
      },
    ],
  });
  await wait();
  for (const section of h.document.querySelectorAll(
    "[data-dashboard-alerts]",
  )) {
    assert.equal(section.hasAttribute("hidden"), false);
    assert.equal(section.querySelector("[data-alert-count]")!.textContent, "3");
    assert.equal(section.querySelectorAll("details").length, 0);
    assert.equal(section.querySelectorAll("img").length, 0);
    assert.doesNotMatch(section.textContent, /Excluded/);
    assert.deepEqual(
      [...section.querySelectorAll("article")].map((el) =>
        el.getAttribute("data-alert-tone"),
      ),
      ["critical", "high", "recommendation"],
    );
    assert.equal(
      section.querySelector("a")!.getAttribute("href"),
      "/configuration/meta",
    );
    assert.match(section.textContent, /Voir l’analyse/);
    assert.match(section.textContent, /Voir la recommandation/);
  }
  // The detail button shows the actual explanation, never triggers a Meta write.
  const create = h.document.createElement.bind(h.document);
  h.document.createElement = ((tag: string) => {
    const el = create(tag);
    if (tag === "dialog")
      (el as any).showModal = () => el.setAttribute("open", "");
    return el;
  }) as any;
  h.clickElement('[data-alert-id="perf"]');
  assert.match(
    h.document.querySelector("dialog")!.textContent,
    /CPA observé : 20 USD/,
  );
  assert.equal(h.posts, 0);
});

test("No active alerts leaves no reserved space; threshold settings remain accessible", async () => {
  const h = harness();
  await wait();
  for (const section of h.document.querySelectorAll(
    "[data-dashboard-alerts]",
  )) {
    assert.equal(section.hasAttribute("hidden"), true);
    assert.equal(section.querySelectorAll("article").length, 0);
  }
  assert.ok(
    h.document.querySelector(
      '.dashboard-toolbar [data-dashboard-action="alert-settings"]',
    ),
  );
});

test("Sync progress stays visible and refreshes metrics when a slice arrives before the job finishes", async () => {
  const h = harness();
  await wait();
  h.click();
  await wait();
  const count = h.reads.filter((z) => z === "kpis").length;
  await h.advance();
  const panel = h.document.querySelector("[data-sync-progress]")!;
  assert.equal(panel.hasAttribute("hidden"), false);
  assert.match(panel.textContent, /Synchronisation Meta en cours/);
  assert.match(panel.textContent, /1\/12 lots terminés/);
  assert.equal(
    h.document
      .querySelector('[data-dashboard-action="sync"]')!
      .getAttribute("data-sync-active"),
    "true",
  );
  assert.ok(h.reads.filter((z) => z === "kpis").length > count);
  await h.finish();
  assert.equal(panel.hasAttribute("hidden"), true);
});
