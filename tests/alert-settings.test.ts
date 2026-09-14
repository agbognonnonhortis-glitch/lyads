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
