import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { catalog, renderSource } from "../src/lib/source/render";
import { renderAppShell } from "../src/lib/shell/render";
const data = {
  organization: { id: "org", name: "Mon entreprise <test>" },
  organizations: [{ id: "org", name: "Mon entreprise <test>" }],
  displayName: "Alice <test>",
  accounts: [{ id: "account", currency: "EUR" }],
  state: { ad_account_ids: ["account"] },
} as any;
test("Every application screen shares one sidebar, outside prototype remounts, with the correct current module", () => {
  let reference: string[] | undefined;
  for (const ref of Object.keys(catalog).filter((ref) => ref.startsWith("C"))) {
    const doc = parseHTML(
      renderAppShell(renderSource(ref)!, ref, data),
    ).document;
    const sidebar = doc.querySelector("#app-sidebar")!;
    assert.equal(doc.querySelectorAll("#app-sidebar").length, 1, ref);
    assert.equal(sidebar.closest("x-dc,#dc-root"), null, ref);
    const links = [...sidebar.querySelectorAll("nav a")].map((a) =>
      a.getAttribute("href")!,
    );
    reference ||= links;
    assert.deepEqual(links, reference, ref);
    const active = sidebar.querySelector("[aria-current=page]");
    assert.ok(active, ref);
    assert.match(sidebar.textContent, /Mon entreprise <test>/);
    assert.match(sidebar.textContent, /Alice <test>/);
    assert.match(sidebar.textContent, /EUR/);
    assert.equal(sidebar.querySelector("test"), null);
    assert.equal(sidebar.querySelectorAll("footer .app-profile").length, 1);
    assert.equal(sidebar.querySelector(".app-company")?.tagName, "DIV");
    for (const frame of doc.querySelectorAll("[data-source-width]")) {
      for (const candidate of frame.querySelectorAll("div[style]")) {
        const style = candidate.getAttribute("style") || "";
        if (/width:\s*(64|240)px/.test(style) && /border-right:/.test(style))
          assert.equal(
            candidate.querySelector(
              ".ph-sparkle,.ph-rocket-launch,.ph-squares-four",
            ),
            null,
            ref,
          );
      }
    }
  }
});
test("The shared company control opens selection only with multiple organizations", () => {
  const doc = parseHTML(
    renderAppShell(renderSource("C4.1")!, "C4.1", {
      ...data,
      organizations: [...data.organizations, { id: "second", name: "Autre" }],
    }),
  ).document;
  assert.equal(
    doc.querySelector("#app-sidebar .app-company")?.getAttribute("href"),
    "/app/comptes",
  );
  assert.equal(
    doc.querySelector("[aria-current=page]")?.textContent,
    "Constructeur de campagne",
  );
});
