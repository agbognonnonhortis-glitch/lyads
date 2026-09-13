import { test } from "node:test";
import assert from "node:assert/strict";
const memory = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => memory.set(k, v),
    removeItem: (k: string) => memory.delete(k),
  },
});
const { useApp } =
  require("../src/lib/store") as typeof import("../src/lib/store");
test("écriture bloquée en consultation et connexion interrompue", () => {
  useApp.getState().reset();
  const before = useApp.getState().campaigns[0].budget;
  useApp.getState().patch({ readonly: true });
  assert.equal(useApp.getState().updateBudget("c1", 500), false);
  assert.equal(useApp.getState().campaigns[0].budget, before);
  useApp.getState().patch({ readonly: false, metaConnected: false });
  assert.equal(useApp.getState().applyReco("r1"), false);
  assert.equal(useApp.getState().recommendations[0].status, "pending");
});
test("annulation préserve les éditions ultérieures", () => {
  useApp.getState().reset();
  assert.equal(useApp.getState().applyReco("r1"), true);
  useApp.getState().updateBudget("c1", 999);
  useApp.getState().undoReco("r1");
  assert.equal(
    useApp.getState().campaigns.find((c) => c.id === "c1")?.budget,
    999,
  );
  assert.equal(useApp.getState().recommendations[0].status, "applied");
});
test("crédits insuffisants et coûts invalides ne modifient pas le solde", () => {
  useApp.getState().reset();
  useApp.getState().patch({ credits: 1 });
  assert.equal(useApp.getState().charge(8, "test"), false);
  assert.equal(useApp.getState().charge(-10, "test"), false);
  assert.equal(useApp.getState().credits, 1);
  assert.equal(useApp.getState().charge(1, "test"), true);
  assert.equal(useApp.getState().credits, 0);
});
test("une modification de budget persiste après réhydratation", async () => {
  useApp.getState().reset();
  useApp.getState().updateBudget("c1", 250000);
  await useApp.persist.rehydrate();
  assert.equal(
    useApp.getState().campaigns.find((c) => c.id === "c1")?.budget,
    250000,
  );
  const saved = JSON.parse(memory.get("lyads-local-v1")!);
  assert.equal(
    saved.state.campaigns.find((c: { id: string }) => c.id === "c1").budget,
    250000,
  );
});
test("sélection d’un compte isole les recommandations et les campagnes", () => {
  useApp.getState().reset();
  useApp.getState().switchAccount("act_5508");
  assert.equal(useApp.getState().selectedReco, "");
  assert.equal(useApp.getState().updateBudget("c1", 0), false);
  assert.equal(useApp.getState().applyReco("r1"), false);
  useApp.getState().switchAccount("act_7715");
  assert.equal(useApp.getState().readonly, true);
});
