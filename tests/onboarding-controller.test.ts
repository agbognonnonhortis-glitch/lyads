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
  const errors: string[] = [];
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
      alert: (text: string) => errors.push(text),
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
    errors,
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
    failed.document.querySelector<HTMLElement>("[data-analysis-recovery]")!.hidden,
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

test("Required resources block navigation; only pixel has an explicit skip", async () => {
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
