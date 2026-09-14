import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultAlertSettings,
  validateAlertSettings,
} from "../src/lib/alerts/settings";
import { formatPerformanceAlert } from "../src/lib/alerts/format";
test("Alert thresholds refuse unsafe volumes, unknown fields and invented targets", () => {
  assert.equal(validateAlertSettings(defaultAlertSettings).target_cpa, null);
  for (const invalid of [
    { min_purchases: 0 },
    { min_days: 2 },
    { target_roas: Infinity },
    { fatigue_ctr_drop: 1 },
    { min_days: 3.5 },
    { unexpected: 1 },
  ]) {
    assert.throws(() =>
      validateAlertSettings({ ...defaultAlertSettings, ...invalid }),
    );
  }
  assert.equal(
    validateAlertSettings({ ...defaultAlertSettings, target_cpa: 25 })
      .target_cpa,
    25,
  );
});
test("Performance alert copy presents evidence using the account currency", () => {
  const row = formatPerformanceAlert({
    detector: "cpa_high",
    currency: "USD",
    entity_name: "Compte réel",
    since: "2026-08-01",
    until: "2026-08-07",
    evidence: {
      observed: 20,
      threshold: 12,
      target: 10,
      spend: 280,
      purchases: 14,
      days: 7,
    },
  });
  assert.match(row.message, /20,00/);
  assert.match(row.message, /US/);
  assert.match(row.message, /14 achats/);
  assert.doesNotMatch(row.message, /FCFA|NaN|undefined/);
});

test("Only four business targets are editable, with no technical tuning fields", () => {
  assert.deepEqual(Object.keys(defaultAlertSettings).sort(), [
    "target_cpa",
    "target_cpl",
    "target_cpr",
    "target_roas",
  ]);
  assert.equal(
    validateAlertSettings({
      ...defaultAlertSettings,
      target_cpl: 3.5,
      target_cpr: 8,
    }).target_cpl,
    3.5,
  );
  for (const target of [
    "target_cpa",
    "target_cpl",
    "target_cpr",
    "target_roas",
  ]) {
    assert.throws(() =>
      validateAlertSettings({ ...defaultAlertSettings, [target]: 0 }),
    );
    assert.throws(() =>
      validateAlertSettings({ ...defaultAlertSettings, [target]: -1 }),
    );
  }
});
test("Lead evidence is shown as registrations, not purchases", () => {
  const row = formatPerformanceAlert({
    detector: "cpl_high",
    currency: "EUR",
    entity_name: "Leads",
    since: "2026-08-01",
    until: "2026-08-07",
    evidence: {
      observed: 20,
      threshold: 12,
      target: 10,
      spend: 280,
      results: 14,
      result_event: "lead",
      days: 7,
    },
  });
  assert.match(row.title, /inscription/);
  assert.match(row.message, /14 inscriptions/);
  assert.doesNotMatch(row.message, /achats|NaN|undefined/);
});
