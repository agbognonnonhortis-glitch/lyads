import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { renderSource } from "../src/lib/source/render";
import { renderDashboard } from "../src/lib/dashboard/render";
import {
  freshness,
  periodDates,
  connectionIssues,
} from "../src/lib/dashboard/model";
test("Dashboard flags unverified tokens, missing ads access and data-access expiry without hiding valid partial page grants", () => {
  const valid = {
    id: "conn",
    connection_status: "connected",
    token_checked_at: "2026-09-01T00:00:00Z",
    expires_at: null,
    data_access_expires_at: null,
    revoked_at: null,
    granted_scopes: ["ads_read"],
  };
  assert.deepEqual(connectionIssues([valid]), []);
  assert.deepEqual(
    connectionIssues([{ ...valid, connection_status: "partial" }]),
    [],
  );
  assert.match(
    connectionIssues([{ ...valid, token_checked_at: null }])[0].message,
    /vérifiée/,
  );
  assert.match(
    connectionIssues([
      { ...valid, data_access_expires_at: "2000-01-01T00:00:00Z" },
    ])[0].message,
    /ne permet plus/,
  );
  assert.match(
    connectionIssues([{ ...valid, granted_scopes: ["pages_show_list"] }])[0]
      .message,
    /autorisation/,
  );
});
test("Dashboard replaces source examples in all sizes and exposes working widget hooks", () => {
  const document = parseHTML(
    renderDashboard(renderSource("C1.1")!, {
      organization: { id: "11111111-1111-4111-8111-111111111111" },
      displayName: "Client réel",
    } as any),
  ).document;
  assert.equal(document.querySelector("script[data-dc-script]"), null);
  for (const frame of document.querySelectorAll("[data-source-width]")) {
    assert.equal(frame.querySelectorAll("[data-kpi]").length, 6);
    assert.ok(frame.querySelector('[data-dashboard-action="sync"]'));
    assert.ok(frame.querySelector("[data-sync-date]"));
    assert.ok(frame.querySelector('[data-dashboard-action="period"]'));
    for (const z of [
      "series",
      "creatives",
      "campaigns",
      "alerts",
      "recommendations",
    ])
      assert.ok(frame.querySelector(`[data-zone="${z}"]`), z);
    assert.doesNotMatch(
      frame.textContent,
      /2,64|2,84|Tabaski|Aminata|180 000|12 000|31 juillet|12 min|2 août|87 %|377 486/,
    );
  }
});
test("Last sync is the oldest successful selected account and never fabricated for missing accounts", () => {
  assert.equal(
    freshness([
      { id: "a", synchronized_at: "2026-09-01T12:00:00Z" },
      { id: "b", synchronized_at: "2026-09-02T12:00:00Z" },
    ]).lastSynchronizedAt,
    "2026-09-01T12:00:00Z",
  );
  assert.equal(
    freshness([{ id: "a", synchronized_at: null }]).lastSynchronizedAt,
    null,
  );
  assert.equal(freshness([]).complete, false);
});
test("Previous period has equal calendar duration across month/year boundaries", () => {
  assert.deepEqual(periodDates("2026-01-01", "2026-01-07"), {
    since: "2026-01-01",
    until: "2026-01-07",
    days: 7,
    previousSince: "2025-12-25",
    previousUntil: "2025-12-31",
  });
  for (const pair of [
    ["2026-02-30", "2026-03-01"],
    ["2026-09-10", "2026-09-01"],
    ["2026-01-01", "2026-12-31"],
  ])
    assert.throws(() => periodDates(...(pair as [string, string])));
});
