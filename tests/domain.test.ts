import { test } from "node:test";
import assert from "node:assert/strict";
import {
  budgetChanges,
  applyToCampaigns,
  undoAllowed,
  conflictingRule,
  Campaign,
  Recommendation,
  campaignTotals,
} from "../src/lib/domain";
import { screens } from "../src/lib/screens";
const campaign = (id: string, budget: number, accountId = "one"): Campaign => ({
  id,
  budget,
  accountId,
  name: id,
  spend: 100,
  purchases: 2,
  roas: 3,
  cpa: 50,
  status: "active",
  active: true,
  source: "utilisateur",
  objective: "Ventes",
});
const r: Recommendation = {
  id: "r",
  accountId: "one",
  title: "Réallocation",
  body: "",
  severity: "Critique",
  confidence: 94,
  kind: "rebalance",
  donorId: "a",
  targetId: "b",
  status: "pending",
};
test("réallocation conserve le budget total et ne touche pas les autres campagnes", () => {
  const cs = [campaign("a", 200000), campaign("b", 0), campaign("c", 75000)];
  const after = applyToCampaigns(cs, r);
  assert.equal(campaignTotals(after).budget, campaignTotals(cs).budget);
  assert.equal(after[0].budget, 100000);
  assert.equal(after[1].budget, 100000);
  assert.equal(after[2], cs[2]);
  assert.equal(cs[0].budget, 200000);
});
test("réallocation interdit les comptes distincts", () => {
  assert.deepEqual(
    budgetChanges([campaign("a", 300), campaign("b", 0, "two")], r),
    [],
  );
});
test("réallocation ne rend pas les budgets négatifs", () => {
  const changes = budgetChanges([campaign("a", 1), campaign("b", 0)], r);
  assert.ok(changes.every((c) => c.after >= 0));
});
test("annulation expire après sept jours", () => {
  const start = 10000;
  assert.equal(undoAllowed(start, start + 7 * 86400000), true);
  assert.equal(undoAllowed(start, start + 7 * 86400000 + 1), false);
});
test("règles contradictoires bloquées seulement sur le même compte", () => {
  const base = {
    id: "one",
    name: "CPA",
    accountId: "one",
    metric: "CPA",
    operator: "supérieur",
    threshold: 100,
    action: "Notifier",
    active: true,
  };
  assert.equal(
    conflictingRule([base], { ...base, id: "two", action: "Mettre en pause" }),
    true,
  );
  assert.equal(
    conflictingRule([base], {
      ...base,
      id: "two",
      accountId: "two",
      action: "Mettre en pause",
    }),
    false,
  );
});
test("tous les écrans ont des références et chemins uniques", () => {
  assert.equal(screens.length, 84);
  assert.equal(new Set(screens.map((s) => s.ref)).size, screens.length);
  assert.equal(new Set(screens.map((s) => s.path)).size, screens.length);
});
