import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { parseHTML } from "linkedom";
import { renderSource } from "../src/lib/source/render";
import { renderDashboard } from "../src/lib/dashboard/render";
import { renderOrganization } from "../src/lib/onboarding/organization";
const script = readFileSync(
  new URL("../public/source/notifications.js", import.meta.url),
  "utf8",
);
const company = { id: "11111111-1111-4111-8111-111111111111", name: "Test" };
const pause = () => new Promise((r) => setTimeout(r, 15));
function harness(rows: any[], rejectWrite = false) {
  const { document, window } = parseHTML(
    renderOrganization(
      renderDashboard(renderSource("C1.1")!, {
        organization: company,
        displayName: "Test",
      } as any),
      "C1.1",
      company,
      [company],
    ),
  );
  const writes: any[] = [];
  (window.HTMLElement.prototype as any).showModal = function (
    this: HTMLElement,
  ) {
    this.setAttribute("open", "");
  };
  (window.HTMLElement.prototype as any).close = function (this: HTMLElement) {
    this.dispatchEvent(new window.Event("close"));
  };
  window.HTMLElement.prototype.focus = function () {};
  runInNewContext(script, {
    document,
    window,
    Element: window.Element,
    MutationObserver: window.MutationObserver,
    URLSearchParams,
    queueMicrotask,
    setInterval() {},
    fetch: async (url: string, options: any) => {
      if (options.method === "PATCH") {
        const body = JSON.parse(options.body);
        writes.push(body);
        if (rejectWrite)
          return {
            ok: false,
            json: async () => ({
              error: { message: "Enregistrement impossible. Réessayez." },
            }),
          };
        for (const row of rows)
          if (body.all || body.ids.includes(row.id))
            row.read_at = new Date().toISOString();
      }
      return {
        ok: true,
        json: async () => ({
          notifications: rows,
          unreadCount: rows.filter((r) => !r.read_at).length,
          page: 0,
          hasMore: false,
          asOf: new Date().toISOString(),
        }),
      };
    },
  });
  const click = (selector: string) =>
    document
      .querySelector(selector)!
      .dispatchEvent(new window.Event("click", { bubbles: true }));
  return { document, writes, click };
}
const notice = () => ({
  id: "22222222-2222-4222-8222-222222222222",
  kind: "sync.complete",
  message: "Import terminé <img src=x onerror=alert(1)>",
  read_at: null,
  created_at: "2026-09-01T12:00:00Z",
});
test("Bell shows actual unread count, opens escaped notifications and persists read receipts", async () => {
  const rows = [notice()];
  const h = harness(rows);
  await pause();
  assert.equal(
    h.document.querySelector(".notification-badge")!.textContent,
    "1",
  );
  h.click("[data-notification-bell]");
  await pause();
  assert.equal(h.document.querySelector(".notification-panel img"), null);
  assert.match(
    h.document.querySelector(".notification-items")!.textContent,
    /Import terminé <img/,
  );
  h.click("[data-mark-notification]");
  await pause();
  assert.equal(h.writes[0].organization, company.id);
  assert.deepEqual(h.writes[0].ids, [rows[0].id]);
  assert.equal(
    h.document.querySelector(".notification-badge")!.getAttribute("hidden"),
    "",
  );
  h.click("[data-notification-close]");
  await pause();
  h.click("[data-notification-bell]");
  await pause();
  assert.equal(h.document.querySelector("[data-mark-notification]"), null);
  assert.match(
    h.document.querySelector(".notification-items")!.textContent,
    /Lu/,
  );
  h.click("[data-notification-close]");
});
test("Read-all is explicit and failed writes leave unread count unchanged", async () => {
  const h = harness([notice()], true);
  await pause();
  h.click("[data-notification-bell]");
  await pause();
  assert.equal(h.writes.length, 0);
  h.click("[data-notification-all]");
  await pause();
  assert.equal(h.writes[0].all, true);
  assert.ok(h.writes[0].asOf);
  assert.equal(
    h.document.querySelector(".notification-badge")!.textContent,
    "1",
  );
  assert.match(
    h.document.querySelector("[data-notification-status]")!.textContent,
    /Enregistrement impossible/,
  );
  h.click("[data-notification-close]");
});
test("An empty notification feed has no fake badge or example message", async () => {
  const h = harness([]);
  await pause();
  h.click("[data-notification-bell]");
  await pause();
  assert.match(
    h.document.querySelector("[data-notification-status]")!.textContent,
    /Aucune notification/,
  );
  assert.equal(h.document.querySelectorAll(".notification-items li").length, 0);
  h.click("[data-notification-close]");
});
