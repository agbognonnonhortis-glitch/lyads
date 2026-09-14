import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { parseHTML } from "linkedom";
import { renderOnboarding } from "../src/lib/onboarding/render";
import { blankOnboarding, completeness } from "../src/lib/onboarding/model";
const controller = readFileSync(
  new URL("../public/source/onboarding.js", import.meta.url),
  "utf8",
);
function harness(
  ref = "B7",
  initial = {},
  section = "review",
  jobStatus = "succeeded",
) {
  let state: any = {
    ...blankOnboarding("workspace"),
    current_step: 7,
    ...initial,
  };
  const writes: any[] = [];
  const scopes: string[] = [];
  const analyses: any[] = [];
  const destinations: string[] = [];
  const nativeDialogs: string[] = [];
  const data: any = {
    organization: { id: "workspace" },
    organizations: [],
    state,
    connection: null,
    accounts: [],
    resources: [],
    links: [],
    businessAccounts: [],
    jobs: [],
    completeness: completeness({}),
    editable: true,
  };
  const { document, window } = parseHTML(renderOnboarding(ref, data, section));
  runInNewContext(controller, {
    document,
    window: {
      addEventListener() {},
      alert: (text: string) => nativeDialogs.push(text),
    },
    location: {
      href: "http://localhost/configuration/entreprise?section=activity",
      assign: (value: string) => destinations.push(value),
    },
    structuredClone,
    setTimeout,
    clearTimeout,
    sessionStorage: {
      setItem() {},
      getItem() {
        return null;
      },
      removeItem() {},
    },
    fetch: async (_: string, options: any) => {
      if (_.startsWith("/api/jobs/"))
        return {
          ok: true,
          json: async () => ({
            job: {
              status: jobStatus,
              error_code: "WEBSITE_BLOCKED",
              updated_at: "2020-01-01T00:00:00Z",
            },
          }),
        };
      const body = JSON.parse(options.body);
      if (body.action === "analyze-website") {
        analyses.push(body);
        return { ok: true, json: async () => ({ jobId: "analysis" }) };
      }
      if (body.action === "inventory") {
        scopes.push(body.scope);
        return { ok: true, json: async () => ({ jobId: "test-job" }) };
      }
      assert.equal(body.revision, state.revision);
      writes.push(body.changes);
      state = {
        ...state,
        ...body.changes,
        brain: { ...state.brain },
        revision: state.revision + 1,
      };
      for (const [key, value] of Object.entries(body.changes.brain || {}))
        state.brain[key] = { ...state.brain[key], ...(value as any) };
      return {
        ok: true,
        json: async () => ({ state: structuredClone(state) }),
      };
    },
  });
  return {
    document,
    window,
    writes,
    scopes,
    analyses,
    destinations,
    nativeDialogs,
    get errors() {
      const box = document.querySelector<HTMLElement>(
        "[data-onboarding-error]",
      );
      return box && !box.hidden ? [box.textContent] : [];
    },
    get state() {
      return state;
    },
  };
}
test("Business answers mirror responsive variants and flush before navigation", async () => {
  const h = harness();
  const inputs = h.document.querySelectorAll<HTMLInputElement>(
    '[data-section="activity"][data-field="name"]',
  );
  inputs[0].value = "Entreprise saisie";
  inputs[0].dispatchEvent(new h.window.Event("input", { bubbles: true }));
  assert.ok([...inputs].every((i) => i.value === "Entreprise saisie"));
  h.document
    .querySelector('[data-onboarding-action="next"]')!
    .dispatchEvent(
      new h.window.Event("click", { bubbles: true, cancelable: true }),
    );
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(h.state.brain.activity.name, "Entreprise saisie");
  assert.equal(h.state.current_step, 8);
  assert.equal(h.destinations[0], "/configuration/recapitulatif");
  assert.deepEqual(h.errors, []);
});
test("Website submit queues analysis; reload resumes success or offers manual recovery", async () => {
  const h = harness("B7", { current_step: 5 }, "activity");
  const input =
    h.document.querySelector<HTMLInputElement>("[data-website-url]")!;
  input.value = "https://vendor.fr/vente";
  h.document
    .querySelector('[data-onboarding-action="analyze-website"]')!
    .dispatchEvent(new h.window.Event("click", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(h.analyses[0].url, "https://vendor.fr/vente");
  assert.equal(h.destinations[0], "/configuration/analyse-site");
  const done = harness("B8", { current_step: 6, analysis_job_id: "job" });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(
    done.destinations[0],
    "/configuration/entreprise?section=review",
  );
  const failed = harness(
    "B8",
    { current_step: 6, analysis_job_id: "job" },
    "activity",
    "failed",
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(
    failed.document.querySelector<HTMLElement>("[data-analysis-recovery]")!
      .hidden,
    false,
  );
  failed.document
    .querySelector('[data-onboarding-action="manual-profile"]')!
    .dispatchEvent(new failed.window.Event("click", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(
    failed.destinations[0],
    "/configuration/entreprise?section=review",
  );
});

test("Business/account remain required; pages and pixels can be explicitly skipped", async () => {
  for (const [ref, initial] of [
    ["B3", { current_step: 2 }],
    ["B3", { current_step: 2, ad_account_ids: ["account"] }],
    [
      "B5",
      { current_step: 3, business_meta_id: "bm", ad_account_ids: ["account"] },
    ],
  ] as const) {
    const h = harness(ref, initial);
    h.document
      .querySelector('[data-onboarding-action="next"]')!
      .dispatchEvent(new h.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(h.destinations.length, 0);
    assert.equal(h.writes.length, 0);
    assert.equal(h.errors.length, 1);
  }
  const h = harness("B6", {
    current_step: 4,
    business_meta_id: "bm",
    ad_account_ids: ["account"],
    page_ids: ["page"],
  });
  h.document
    .querySelector('[data-onboarding-action="skip-pixels"]')!
    .dispatchEvent(new h.window.Event("click", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(h.state.pixels_skipped, true);
  assert.equal(h.state.current_step, 5);
  assert.deepEqual(h.errors, []);
  assert.equal(h.destinations[0], "/configuration/entreprise?section=activity");
  const pages = harness("B5", { current_step: 3 });
  pages.document
    .querySelector('[data-onboarding-action="skip-pages"]')!
    .dispatchEvent(new pages.window.Event("click", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(pages.state.page_ids, []);
  assert.equal(pages.state.pages_skipped, true);
  assert.equal(pages.state.current_step, 4);
  assert.deepEqual(pages.destinations, ["/configuration/pixel"]);
  assert.deepEqual(pages.errors, []);
});

test("Refreshing business resources fetches both business list and selected business accounts", async () => {
  const h = harness("B3", { current_step: 2, business_meta_id: "bm" });
  h.document
    .querySelector('[data-onboarding-action="refresh"]')!
    .dispatchEvent(new h.window.Event("click", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(h.scopes, ["root", "business"]);
  assert.deepEqual(h.errors, []);
  assert.deepEqual(h.writes, []);
});

test("Optional resource setup returns completed users to settings", async () => {
  for (const action of ["skip-pixels", "next"]) {
    const h = harness("B6", {
      current_step: 10,
      completed_at: "2026-09-14T00:00:00Z",
      pixels: [{ account_id: "account", pixel_id: "pixel", event: null }],
    });
    h.document
      .querySelector(`[data-onboarding-action="${action}"]`)!
      .dispatchEvent(new h.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(h.destinations, ["/app/parametres/meta"]);
    assert.deepEqual(h.errors, []);
    assert.deepEqual(h.analyses, []);
  }
});

test("Back works on every onboarding viewport without validating forward selections", async () => {
  const cases = [
    ["B3", "activity", 2, 1, "/configuration/meta"],
    ["B5", "activity", 3, 2, "/configuration/business-manager"],
    ["B6", "activity", 4, 3, "/configuration/pages"],
    ["B7", "activity", 5, 4, "/configuration/pixel"],
    ["B8", "activity", 6, 5, "/configuration/entreprise?section=activity"],
    ["B7", "review", 7, 5, "/configuration/entreprise?section=activity"],
    ["B9", "review", 8, 7, "/configuration/entreprise?section=review"],
    ["B10", "activity", 9, 8, "/configuration/recapitulatif"],
    ["B11", "activity", 10, 9, "/configuration/plan"],
  ] as const;
  for (const [ref, section, step, previousStep, destination] of cases) {
    for (const width of [375, 768, 1440]) {
      const h = harness(ref, { current_step: step }, section);
      const frame = h.document.querySelector(`[data-source-width="${width}"]`)!;
      const buttons = frame.querySelectorAll(
        '[data-onboarding-action="previous"]',
      );
      assert.equal(buttons.length, 1, `${ref}/${section}/${width}`);
      assert.equal(buttons[0].tagName, "BUTTON");
      // Clicking the arrow must trigger the same action as clicking the label.
      buttons[0]
        .querySelector("i")!
        .dispatchEvent(new h.window.Event("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.deepEqual(
        h.destinations,
        [destination],
        `${ref}/${section}/${width}`,
      );
      assert.equal(h.state.current_step, previousStep);
      assert.deepEqual(h.errors, []);
      assert.deepEqual(h.analyses, []);
    }
  }
});

test("Returning from the editable profile saves pending answers before leaving", async () => {
  const h = harness();
  const input = h.document.querySelector<HTMLInputElement>(
    '[data-field="name"]',
  )!;
  input.value = "Entreprise modifiée";
  input.dispatchEvent(new h.window.Event("input", { bubbles: true }));
  h.document
    .querySelector('[data-onboarding-action="previous"]')!
    .dispatchEvent(new h.window.Event("click", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(h.state.brain.activity.name, "Entreprise modifiée");
  assert.deepEqual(h.destinations, [
    "/configuration/entreprise?section=activity",
  ]);
  assert.deepEqual(h.errors, []);
});

test("Missing company name is shown in-page and next to the field without a native dialog", async () => {
  const h = harness();
  h.document
    .querySelector('[data-onboarding-action="next"]')!
    .dispatchEvent(new h.window.Event("click", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(h.nativeDialogs, []);
  assert.deepEqual(h.destinations, []);
  for (const frame of h.document.querySelectorAll("[data-source-width]")) {
    const box = frame.querySelector<HTMLElement>("[data-onboarding-error]")!;
    assert.equal(box.hidden, false);
    assert.equal(box.getAttribute("role"), "alert");
    assert.match(box.textContent!, /nom de votre entreprise/);
    const input = frame.querySelector('[data-field="name"]')!;
    assert.equal(input.getAttribute("aria-invalid"), "true");
    assert.equal(
      input.getAttribute("aria-describedby"),
      frame.querySelector("[data-onboarding-field-error]")!.id,
    );
  }
  const input = h.document.querySelector<HTMLInputElement>(
    '[data-field="name"]',
  )!;
  input.value = "Entreprise";
  input.dispatchEvent(new h.window.Event("input", { bubbles: true }));
  assert.equal(h.document.querySelectorAll('[aria-invalid="true"]').length, 0);
  assert.equal(
    h.document.querySelectorAll("[data-onboarding-field-error]").length,
    0,
  );
  h.document
    .querySelector('[data-onboarding-action="next"]')!
    .dispatchEvent(new h.window.Event("click", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(h.destinations, ["/configuration/recapitulatif"]);
  assert.deepEqual(h.nativeDialogs, []);
});
