import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import {
  blankOnboarding,
  brainPatch,
  completeness,
} from "../src/lib/onboarding/model";
import { renderOnboarding } from "../src/lib/onboarding/render";
const workspace = "11111111-1111-4111-8111-111111111111";
const fixture = (brain = {}) =>
  ({
    organization: {
      id: workspace,
      name: "Entreprise de test",
      owner_id: "owner",
    },
    organizations: [],
    state: { ...blankOnboarding(workspace), brain },
    connection: null,
    accounts: [],
    resources: [],
    links: [],
    businessAccounts: [],
    jobs: [],
    displayName: "",
    completeness: completeness(brain),
    editable: true,
  }) as any;
test("Every onboarding variant excludes source examples before JavaScript executes", () => {
  for (const ref of [
    "B1",
    "B2",
    "B3",
    "B4",
    "B5",
    "B6",
    "B7",
    "B8",
    "B9",
    "B10",
    "B11",
  ]) {
    const html = renderOnboarding(ref, fixture());
    const doc = parseHTML(html).document;
    const visible = doc.body.textContent.replace(
      doc.querySelector("#onboarding-data")!.textContent,
      "",
    );
    assert.doesNotMatch(
      visible,
      /Kola|Aminata|Cartable Pro|Trousse garnie|Pack rentrée|kola\.sn|77 812 44 42|58\s*%|62\s*%|78\s*%|3 résultats|24 informations|9 déduites|Analyse de marchécomplet|12 500|4 850 000|demain matin,? 8/i,
      ref,
    );
    assert.equal(doc.querySelectorAll("[data-source-width]").length, 3, ref);
    assert.equal(
      doc.querySelectorAll('script[src="/source/support.js"]').length,
      0,
      ref,
    );
  }
});
test("Business/account selection is filtered by verified associations and untrusted names are escaped", () => {
  const f = fixture();
  f.state.business_meta_id = "bm1";
  f.connection = { id: "conn" };
  f.resources = [
    {
      kind: "business",
      meta_id: "bm1",
      source_data: { name: "Business réel" },
    },
    {
      kind: "business",
      meta_id: "bm2",
      source_data: { name: "Autre Business" },
    },
  ];
  f.businessAccounts = [
    { business_meta_id: "bm1", ad_account_id: "a1" },
    { business_meta_id: "bm2", ad_account_id: "a2" },
  ];
  f.accounts = [
    {
      id: "a1",
      name: "<script>alert(1)</script>",
      meta_account_id: "act_1",
      currency: "EUR",
      timezone_name: "Europe/Paris",
    },
    { id: "a2", name: "Autre compte", meta_account_id: "act_2" },
  ];
  const doc = parseHTML(renderOnboarding("B3", f)).document;
  assert.equal(
    doc.querySelectorAll('[data-onboarding-action="account"]').length,
    3,
  );
  assert.equal(
    doc.querySelectorAll('[data-onboarding-action="account"][data-id="a2"]')
      .length,
    0,
  );
  assert.equal(doc.querySelectorAll("script").length, 2);
});
test("Business form starts blank, preserves values and rejects invented fields/provenance", () => {
  assert.equal(completeness({}).percent, 0);
  assert.equal(brainPatch({ activity: { name: "Entreprise réelle" } }), true);
  assert.equal(brainPatch({ activity: { source: "meta" } }), false);
  assert.equal(
    brainPatch({
      offer: { products: [{ name: "Un produit", price: "25.50" }] },
    }),
    true,
  );
  const f = fixture({
    activity: { name: "Entreprise réelle" },
    offer: { products: [{ name: "Un produit", price: "25.50" }] },
  });
  const doc = parseHTML(renderOnboarding("B7", f)).document;
  assert.equal(
    doc
      .querySelector('input[data-field="name"][data-section="activity"]')
      ?.getAttribute("value"),
    "Entreprise réelle",
  );
  assert.equal(
    doc.querySelector('input[data-field="price"]')?.getAttribute("value"),
    "25.50",
  );
});

test("Advertising authorization buttons survive footer wiring in every viewport", () => {
  for (const connected of [false, true]) {
    const data = fixture();
    if (connected) data.connection = { id: "connection" };
    const doc = parseHTML(renderOnboarding("B2", data)).document;
    assert.equal(
      doc.querySelectorAll(
        '[data-onboarding-action="' +
          (connected ? "connected" : "connect") +
          '"]',
      ).length,
      3,
    );
    assert.equal(
      doc.querySelectorAll('[data-onboarding-action="next"]').length,
      0,
    );
  }
});

test("Populated resources render without maquette values at all three widths", () => {
  const f = fixture();
  f.state.business_meta_id = "bm1";
  f.state.ad_account_ids = ["a1"];
  f.state.page_ids = ["p1"];
  f.state.pixels = [{ account_id: "a1", pixel_id: "px1", event: "Purchase" }];
  f.accounts = [
    {
      id: "a1",
      name: "Compte réel",
      meta_account_id: "act_123",
      currency: "EUR",
      timezone_name: "UTC",
    },
  ];
  f.resources = [
    {
      kind: "business",
      meta_id: "bm1",
      source_data: { name: "Entreprise réelle" },
    },
    { kind: "page", meta_id: "p1", source_data: { name: "Page réelle" } },
    { kind: "pixel", meta_id: "px1", source_data: { name: "Pixel réel" } },
    {
      kind: "conversion_event",
      meta_id: "px1:Purchase",
      source_data: { event_name: "Purchase", pixel_id: "px1", count_7d: 37 },
    },
  ];
  f.links = [
    { kind: "page", meta_id: "p1", scope_type: "business", scope_id: "bm1" },
    { kind: "pixel", meta_id: "px1", scope_type: "account", scope_id: "a1" },
  ];
  f.businessAccounts = [{ business_meta_id: "bm1", ad_account_id: "a1" }];
  for (const ref of ["B3", "B5", "B6", "B9", "B11"]) {
    const d = parseHTML(renderOnboarding(ref, f)).document;
    for (const frame of d.querySelectorAll("[data-source-width]")) {
      assert.doesNotMatch(
        frame.textContent,
        /Kola|1 284|2 minutes|24 informations|9 déduites/,
      );
      if (ref === "B6") {
        assert.match(frame.textContent, /37/);
        assert.equal(
          frame.querySelectorAll('[data-onboarding-action="pixel"]').length,
          1,
        );
      }
    }
  }
});
