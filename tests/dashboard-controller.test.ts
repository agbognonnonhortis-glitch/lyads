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
    media?: boolean;
    paginatedAds?: boolean;
    zoneRows?: Record<string, any[]>;
    targets?: any[];
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
    if (url.startsWith("/api/ads/"))
      return {
        ok: true,
        json: async () => ({
          status: "succeeded",
          media: [
            {
              type: "video",
              url: "https://video.xx.fbcdn.net/real.mp4",
              poster: "https://x.fbcdn.net/poster.jpg",
            },
          ],
        }),
      };
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
          campaigns: [
            {
              id: "campaign-a",
              name: "Campagne active",
              effective_status: "ACTIVE",
            },
            {
              id: "campaign-b",
              name: "Campagne arrêtée",
              effective_status: "PAUSED",
            },
          ],
          adSets:
            u.searchParams.get("campaign") === "campaign-a"
              ? [
                  {
                    id: "set-a",
                    name: "Ensemble A",
                    effective_status: "ACTIVE",
                  },
                ]
              : [],
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
          targets: scenario.targets || [],
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
        nextOffset:
          scenario.paginatedAds &&
          zone === "creatives" &&
          !u.searchParams.has("offset")
            ? 5
            : null,
        rows:
          scenario.zoneRows?.[zone] ??
          (zone === "kpis" && !scenario.empty
            ? [{ bucket: "current", spend: 100, accounts_count: 1 }]
            : zone === "alerts"
              ? scenario.alerts || []
              : zone === "recommendations"
                ? scenario.recommendations || []
                : zone === "creatives" && scenario.paginatedAds
                  ? Array.from(
                      { length: u.searchParams.has("offset") ? 1 : 5 },
                      (_, i) => ({
                        bucket: `ad-${i + Number(u.searchParams.get("offset") || 0)}`,
                        name: `Annonce ${i + Number(u.searchParams.get("offset") || 0)}`,
                        result_event: "purchase",
                        rank: i + 1 + Number(u.searchParams.get("offset") || 0),
                        bar_ratio: 0.5,
                        sufficient_data: true,
                      }),
                    )
                  : zone === "creatives" && scenario.media
                    ? [
                        {
                          bucket: "ad",
                          name: "Video test",
                          spend: 10,
                          currency,
                          result_event: "purchase",
                          rank: 1,
                          results: 20,
                          cost_per_result: 0.5,
                          roas: 4,
                        },
                      ]
                    : []),
        message: "Aucune donnée",
      }),
    };
  };
  runInNewContext(controller, {
    document,
    window: { innerWidth: 1200, innerHeight: 800 },
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
    window,
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

test("Real media renders a player, hover previews muted, click keeps playback after leaving", async () => {
  const h = harness(false, "EUR", "http://localhost/", {
    blocked: false,
    empty: false,
    media: true,
  });
  await wait();
  assert.equal(h.document.querySelector(".dashboard-video"), null);
  const trigger = h.document.querySelector("[data-preview-ad]")! as any;
  trigger.getBoundingClientRect = () => ({ left: 100, top: 200 });
  trigger.dispatchEvent(new h.window.Event("mouseenter"));
  await wait();
  const box = h.document.querySelector(".dashboard-video")!;
  const video = box.querySelector("video")! as any;
  assert.equal(
    video.getAttribute("src"),
    "https://video.xx.fbcdn.net/real.mp4",
  );
  assert.equal(video.hasAttribute("controls"), true);
  let plays = 0,
    pauses = 0;
  video.play = async () => {
    plays++;
  };
  video.pause = () => {
    pauses++;
  };
  box.dispatchEvent(new h.window.Event("mouseenter"));
  await wait();
  assert.equal(plays, 1);
  assert.equal(video.muted, true);
  box.dispatchEvent(new h.window.Event("mouseleave"));
  assert.equal(pauses, 1);
  box
    .querySelector("button")!
    .dispatchEvent(new h.window.Event("click", { bubbles: true }));
  await wait();
  assert.equal(plays, 2);
  assert.equal(video.muted, false);
  box.dispatchEvent(new h.window.Event("mouseleave"));
  assert.equal(pauses, 1);
  h.document.dispatchEvent(
    Object.assign(new h.window.Event("keydown"), { key: "Escape" }),
  );
  assert.equal(pauses, 2);
});

test("Ads use the maquette table, load five at a time, and defer the full media until preview", async () => {
  const h = harness(
    false,
    "EUR",
    "http://localhost/?since=2026-09-01&until=2026-09-07",
    { blocked: false, empty: false, paginatedAds: true },
  );
  await wait();
  const zone = h.document.querySelector('[data-zone="creatives"]')!;
  assert.equal(zone.querySelectorAll("[data-best-ad]").length, 5);
  assert.equal(zone.querySelectorAll("[data-best-ad][open]").length, 0);
  assert.equal(zone.querySelectorAll("video").length, 0);
  assert.equal(zone.querySelectorAll("tbody tr").length, 5);
  assert.equal(zone.querySelectorAll("details").length, 0);
  zone
    .querySelector('[data-dashboard-action="more-ads"]')!
    .dispatchEvent(new h.window.Event("click", { bubbles: true }));
  await wait();
  assert.equal(zone.querySelectorAll("[data-best-ad]").length, 6);
  assert.equal(zone.querySelector('[data-dashboard-action="more-ads"]'), null);
  const request = h.requests.find(
    (u: URL) => u.searchParams.get("offset") === "5",
  )!;
  assert.equal(request.searchParams.get("accounts"), "account");
  assert.equal(request.searchParams.get("since"), "2026-09-01");
  assert.equal(request.searchParams.get("until"), "2026-09-07");
});

test("Campaign and ad set filters scope every widget and reset child selections", async () => {
  const h = harness(
    false,
    "EUR",
    "http://localhost/?since=2026-09-01&until=2026-09-07",
  );
  await wait();
  assert.equal(
    h.document
      .querySelector('[data-scope-label="adset"]')!
      .getAttribute("aria-disabled"),
    "true",
  );
  const choose = async (kind: string, value: string) => {
    const input = h.document.querySelector(
      `[data-scope-choice="${kind}"][value="${value}"]`,
    )!;
    assert.ok(input);
    input.dispatchEvent(new h.window.Event("change", { bubbles: true }));
    await wait();
  };
  const verify = (campaign: string | null, adset: string | null) => {
    for (const zone of [
      "kpis",
      "series",
      "creatives",
      "campaigns",
      "placements",
      "alerts",
      "recommendations",
    ]) {
      const request = h.requests
        .filter((u: URL) => u.pathname.endsWith("/" + zone))
        .at(-1)!;
      assert.equal(request.searchParams.get("campaign"), campaign, zone);
      assert.equal(request.searchParams.get("adset"), adset, zone);
    }
  };
  assert.ok(
    h.document
      .querySelector('[value="campaign-a"]')!
      .parentElement!.querySelector(".is-active"),
  );
  assert.equal(
    h.document
      .querySelector('[value="campaign-b"]')!
      .parentElement!.querySelector(".is-active"),
    null,
  );
  await choose("campaign", "campaign-a");
  verify("campaign-a", null);
  await choose("adset", "set-a");
  verify("campaign-a", "set-a");
  await choose("campaign", "campaign-b");
  verify("campaign-b", null);
  await choose("campaign", "");
  verify(null, null);
  await choose("campaign", "campaign-a");
  const account = h.document.querySelector("[data-account-choice]")! as any;
  account.checked = true;
  account.dispatchEvent(new h.window.Event("change", { bubbles: true }));
  await wait();
  verify(null, null);
});

test("Restored scope is preserved when loading more ads; no event headings or volume warnings", async () => {
  const h = harness(
    false,
    "EUR",
    "http://localhost/?campaign=campaign-a&adset=set-a&since=2026-09-01&until=2026-09-07",
    { blocked: false, empty: false, paginatedAds: true },
  );
  await wait();
  h.clickElement('[data-dashboard-action="more-ads"]');
  await wait();
  const request = h.requests.find((u: URL) => u.searchParams.has("offset"))!;
  assert.equal(request.searchParams.get("campaign"), "campaign-a");
  assert.equal(request.searchParams.get("adset"), "set-a");
  const zone = h.document.querySelector('[data-zone="creatives"]')!;
  assert.equal(zone.querySelector(".dashboard-best-event"), null);
  assert.doesNotMatch(
    zone.textContent,
    /non classées|Tri :|Données insuffisantes/,
  );
});

test("Chart footer uses actual daily totals and preserves missing days and weighted period ratios", async () => {
  const h = harness(
    false,
    "EUR",
    "http://localhost/?since=2026-09-01&until=2026-09-02",
    {
      blocked: false,
      empty: false,
      zoneRows: {
        kpis: [{ bucket: "current", spend: 100, roas: 2.8, accounts_count: 1 }],
        series: [
          { bucket: "2026-09-01", spend: 10, roas: 10 },
          { bucket: "2026-09-02", spend: 90, roas: 2 },
          { bucket: "2026-08-30", spend: 5, roas: 4 },
          { bucket: "2026-08-31", spend: 45, roas: 1 },
        ],
      },
    },
  );
  await wait();
  const zone = h.document.querySelector('[data-zone="series"]')!;
  assert.match(
    zone.querySelector(".dashboard-chart-footer")!.textContent,
    /100,00.*50,00.*90,00/s,
  );
  const point = zone.querySelector('[data-chart-point="0"]')!;
  point.dispatchEvent(new h.window.Event("mouseenter"));
  assert.match(
    zone.querySelector('[role="tooltip"]')!.textContent,
    /5,00.*100 %/s,
  );
  h.clickElement('[data-dashboard-metric="roas"]');
  assert.match(
    zone.querySelector(".dashboard-chart-footer")!.textContent,
    /ROAS sur la période2,8/,
  );
  assert.doesNotMatch(
    zone.querySelector(".dashboard-chart-footer")!.textContent,
    /Total période12/,
  );
  const missing = harness(
    false,
    "EUR",
    "http://localhost/?since=2026-09-01&until=2026-09-02",
    {
      blocked: false,
      empty: false,
      zoneRows: { series: [{ bucket: "2026-09-01", spend: 10 }] },
    },
  );
  await wait();
  assert.match(
    missing.document.querySelector(".dashboard-chart-footer")!.textContent,
    /Total période—Moyenne \/ jour—/,
  );
});

test("Placement families sum spend and weight ROAS; performance badges require configured targets", async () => {
  const h = harness(
    false,
    "EUR",
    "http://localhost/?since=2026-09-01&until=2026-09-02",
    {
      blocked: false,
      empty: false,
      targets: [{ ad_account_id: "account", target_roas: 3, target_cpa: 10 }],
      zoneRows: {
        placements: [
          {
            bucket: "facebook / feed",
            spend: 10,
            revenue: 100,
            purchases: 2,
            currency: "EUR",
          },
          {
            bucket: "instagram / feed",
            spend: 90,
            revenue: 180,
            purchases: 2,
            currency: "EUR",
          },
          {
            bucket: "facebook / facebook_reels",
            spend: 20,
            revenue: null,
            purchases: null,
            currency: "EUR",
          },
        ],
        creatives: [
          {
            bucket: "one",
            name: "Vente",
            ad_account_id: "account",
            result_event: "purchase",
            roas: 4,
            cost_per_result: 5,
            currency: "EUR",
          },
          {
            bucket: "two",
            name: "Lead",
            ad_account_id: "account",
            result_event: "lead",
            cost_per_result: 5,
            currency: "EUR",
          },
        ],
      },
    },
  );
  await wait();
  const placements = h.document.querySelector('[data-zone="placements"]')!;
  assert.equal(
    placements.querySelectorAll(".dashboard-placement-list>div").length,
    2,
  );
  assert.match(placements.textContent, /Fil d’actualité100,00.*2,8/);
  assert.match(placements.textContent, /Reels20,00.*—/);
  const badges = h.document
    .querySelector('[data-zone="creatives"]')!
    .querySelectorAll(".dashboard-performance-badge");
  assert.equal(badges[0].getAttribute("data-tone"), "good");
  assert.equal(badges[1].getAttribute("data-tone"), "neutral");
});
