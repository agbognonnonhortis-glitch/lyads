import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { renderSource } from "../src/lib/source/render";
import {
  canSwitchOrganization,
  renderOrganization,
} from "../src/lib/onboarding/organization";
test("Dashboard and business picker use stored company labels and only accessible organizations", () => {
  const company = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Entreprise <script> de test",
  };
  for (const ref of ["C1.1", "C1.2"]) {
    const d = parseHTML(
      renderOrganization(renderSource(ref)!, ref, company, [company]),
    ).document;
    for (const frame of d.querySelectorAll("[data-source-width]")) {
      if (ref === "C1.2") {
        const choices = frame.querySelectorAll("[data-company-id]");
        assert.equal(choices.length, 1);
        assert.equal(choices[0].textContent, company.name);
        assert.equal(choices[0].getAttribute("data-company-id"), company.id);
        assert.doesNotMatch(
          frame.textContent,
          /Kola Test|Sahel Mode|act_402881/,
        );
      } else {
        assert.match(frame.textContent, /Entreprise <script> de test/);
        assert.doesNotMatch(frame.textContent, /Kola Distribution/);
      }
    }
    assert.equal(d.querySelectorAll("script:not([src]):not([type])").length, 0);
  }
});

test("Company switching requires two distinct accessible companies, including after a sidebar remount", async () => {
  const first = { id: "first", name: "Première entreprise" };
  const second = { id: "second", name: "Deuxième entreprise" };
  assert.equal(canSwitchOrganization([]), false);
  assert.equal(canSwitchOrganization([first, first]), false);
  const script = readFileSync("public/source/organization.js", "utf8");
  for (const organizations of [[first], [first, second]]) {
    const canSwitch = organizations.length >= 2;
    const { document, window } = parseHTML(
      renderOrganization(renderSource("C1.1")!, "C1.1", first, organizations),
    );
    const navigations: string[] = [];
    runInNewContext(script, {
      document,
      window,
      MutationObserver: window.MutationObserver,
      location: { assign: (path: string) => navigations.push(path) },
      fetch: () => {
        throw new Error("No selection request expected");
      },
    });
    const assertControl = (control: any) => {
      assert.ok(control);
      assert.equal(control.getAttribute("role"), canSwitch ? "button" : null);
      assert.equal(control.getAttribute("tabindex"), canSwitch ? "0" : null);
      control.dispatchEvent(new window.Event("click", { bubbles: true }));
    };
    assertControl(
      document.querySelector(
        canSwitch ? "[data-company-picker]" : "[data-company-static]",
      ),
    );
    const remount = document.createElement("div");
    remount.innerHTML =
      '<div style="border-radius:12px"><div>KD</div><div><span>Kola Distribution</span></div><i class="ph-caret-up-down"></i></div>';
    document.body.append(remount);
    await new Promise((resolve) => setTimeout(resolve, 10));
    assertControl(remount.firstElementChild);
    if (!canSwitch) {
      assert.equal(document.querySelector("[data-company-picker]"), null);
      assert.equal(remount.querySelector(".ph-caret-up-down"), null);
    }
    assert.deepEqual(
      navigations,
      canSwitch ? ["/app/comptes", "/app/comptes"] : [],
    );
  }
});

test("The picker offers both accessible companies when switching is enabled", () => {
  const organizations = [
    { id: "first", name: "Première" },
    { id: "second", name: "Deuxième" },
  ];
  const doc = parseHTML(
    renderOrganization(
      renderSource("C1.2")!,
      "C1.2",
      organizations[0],
      organizations,
    ),
  ).document;
  for (const frame of doc.querySelectorAll("[data-source-width]")) {
    assert.deepEqual(
      [...frame.querySelectorAll("[data-company-id]")].map((row) =>
        row.getAttribute("data-company-id"),
      ),
      ["first", "second"],
    );
  }
});
