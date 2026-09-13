import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { renderSource } from "../src/lib/source/render";
import { renderOrganization } from "../src/lib/onboarding/organization";
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
