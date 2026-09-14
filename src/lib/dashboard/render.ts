import { parseHTML } from "linkedom";
import { screens } from "../screens";
import type { OnboardingData } from "../onboarding/data";
export function renderDashboard(html: string, data: OnboardingData) {
  const doc = parseHTML(html).document;
  const norm = (v: string) => v.replace(/\s+/g, " ").trim();
  const leaf = (root: any, text: string) =>
    [...root.querySelectorAll("div,span,h1,h2,h3")].find(
      (e: any) => !e.children.length && norm(e.textContent) === text,
    );
  const card = (el: any) => {
    let n = el?.parentElement;
    while (
      n &&
      !(
        /border-radius:/.test(n.getAttribute("style") || "") &&
        /padding:/.test(n.getAttribute("style") || "") &&
        /background:#(?:FFFFFF|EDEFFC)/i.test(n.getAttribute("style") || "")
      )
    )
      n = n.parentElement;
    return n;
  };
  const control = (el: any, action: string) => {
    if (!el) return;
    el.setAttribute("data-dashboard-action", action);
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.style.cursor = "pointer";
  };
  const metrics = [
    ["spend", "Dépense", "2,64 M"],
    ["impressions", "Impressions", "1,28 M"],
    ["clicks", "Clics", "15 320"],
    ["cpc", "CPC", "172"],
    ["cpa", "CPA", "11 340"],
    ["roas", "ROAS", "2,84"],
  ];
  for (const frame of doc.querySelectorAll("[data-source-width]")) {
    for (const [key, label, sample] of metrics) {
      const value = leaf(frame, sample);
      const box =
        frame.getAttribute("data-source-width") === "375" &&
        ["cpc", "clicks", "impressions"].includes(key)
          ? value?.parentElement
          : card(value);
      if (!box) continue;
      const title =
        leaf(box, label)?.cloneNode(true) || doc.createElement("div");
      title.textContent = label;
      const display = value.cloneNode(true);
      display.textContent = "—";
      display.setAttribute("data-metric", key);
      const note = doc.createElement("div");
      note.className = "dashboard-note";
      note.setAttribute("data-metric-note", key);
      note.textContent = "Chargement…";
      box.replaceChildren(title, display, note);
      box.setAttribute("data-kpi", key);
      box.setAttribute("aria-busy", "true");
      if (key === "cpa" || key === "roas")
        box.title =
          "Calculé à partir des achats retournés par Meta. Aucune estimation.";
    }
    const zones = [
      ["alerts", "Alertes actives"],
      ["series", "Évolution"],
      ["creatives", "Meilleures publicités"],
      [
        "recommendations",
        Number(frame.getAttribute("data-source-width")) === 1440
          ? "Recommandations du jour"
          : "Recommandations",
      ],
      [
        "campaigns",
        Number(frame.getAttribute("data-source-width")) === 1440
          ? "Performance par campagne"
          : "Par campagne",
      ],
      [
        "placements",
        Number(frame.getAttribute("data-source-width")) === 1440
          ? "Performance par placement"
          : "Par placement",
      ],
    ];
    for (const [zone, title] of zones) {
      const heading = leaf(frame, title);
      if (!heading) continue;
      const box =
        zone === "alerts" ||
        (zone === "recommendations" &&
          frame.getAttribute("data-source-width") === "1440")
          ? heading.parentElement.parentElement
          : card(heading);
      if (!box) continue;
      const header = doc.createElement("div");
      header.className = "dashboard-heading";
      const h = heading.cloneNode(true);
      h.removeAttribute("data-source-go");
      if (
        frame.getAttribute("data-source-width") === "375" &&
        zone === "campaigns"
      ) {
        header.innerHTML =
          '<button type="button" data-dashboard-action="campaigns" aria-pressed="true">Par campagne</button><button type="button" data-dashboard-action="placements" aria-pressed="false">Par placement</button>';
        box.setAttribute("data-mobile-breakdowns", "");
      } else header.append(h);
      const content = doc.createElement("div");
      content.setAttribute("data-zone", zone);
      content.setAttribute("aria-live", "polite");
      content.className = "dashboard-content";
      content.textContent = "Chargement…";
      box.replaceChildren(header, content);
      if (zone === "alerts") {
        box.setAttribute("data-dashboard-alerts", "");
        box.setAttribute("hidden", "");
        const count = doc.createElement("span");
        count.className = "dashboard-alert-count";
        count.setAttribute("data-alert-count", "");
        header.append(count);
      }
      if (zone === "series") {
        const tabs = doc.createElement("div");
        tabs.className = "dashboard-tabs";
        for (const key of ["spend", "roas", "cpa", "clicks", "impressions"]) {
          const b = doc.createElement("button");
          b.type = "button";
          b.dataset.dashboardMetric = key;
          b.setAttribute("aria-pressed", String(key === "spend"));
          b.textContent = metrics.find((m) => m[0] === key)![1];
          tabs.append(b);
        }
        header.append(tabs);
      }
    }
    for (const el of frame.querySelectorAll("div,span")) {
      if (el.children.length) continue;
      const text = norm(el.textContent);
      if (text.startsWith("Synchronisé il y a")) {
        el.textContent = "Synchroniser";
        el.setAttribute("data-sync-label", "");
        let box = el.parentElement;
        if (frame.getAttribute("data-source-width") === "1440")
          box = box!.parentElement;
        control(box, "sync");
        box!.setAttribute(
          "aria-label",
          "Synchroniser les données du tableau de bord",
        );
      }
      if (text === "2 août, 09:14 · source Meta") {
        el.textContent = "Dernière synchronisation : chargement…";
        el.setAttribute("data-sync-date", "");
      }
      if (text === "7 derniers jours" || text === "7 j") {
        control(el.parentElement, "period");
        el.setAttribute("data-period-label", "");
      }
      if (text === "Aminata Diallo") el.textContent = data.displayName;
      if (text === "AD")
        el.textContent = data.displayName.slice(0, 2).toUpperCase();
      if (text === "Administratrice") el.textContent = "";
      if (text === "FCFA · Actif") {
        el.textContent = "";
        el.setAttribute("data-account-currency", "");
      }
      if (text === "38 / 200" || text === "38") {
        el.textContent = "—";
        el.setAttribute("data-credit-balance", "");
        control(el, "credits");
      }
      if (text === "7") {
        el.textContent = "";
        el.setAttribute("data-recommendation-count", "");
      }
      if (text === "Racheter") control(el, "credits");
      if (text === "Voir les courbes ▾") control(el, "chart");
      if (
        text.startsWith("Le glyphe") ||
        text === "Évolution favorable" ||
        text === "Évolution défavorable"
      )
        el.remove();
    }
    for (const e of frame.querySelectorAll("div")) {
      const t = norm(e.textContent);
      if (
        t === "Évolution favorable" ||
        t === "Évolution défavorable" ||
        t.startsWith("Sans jugement —")
      )
        e.remove();
    }
    const low = [...frame.querySelectorAll("div")].find(
      (e) => norm(e.textContent) === "Solde faible · Racheter",
    );
    if (low) {
      low.textContent = "Voir les crédits";
      control(low, "credits");
      const bar = low.previousElementSibling;
      if (bar?.getAttribute("style")?.includes("height:")) bar.remove();
    }
    const sync = frame.querySelector('[data-dashboard-action="sync"]');
    if (sync && !frame.querySelector("[data-sync-date]")) {
      const d = doc.createElement("div");
      d.className = "dashboard-note";
      d.dataset.syncDate = "";
      sync.after(d);
    }
    const alerts = frame.querySelector('[data-zone="alerts"]')?.parentElement;
    if (alerts) {
      const toolbar = doc.createElement("div");
      toolbar.className = "dashboard-toolbar";
      toolbar.innerHTML =
        '<label>Comptes publicitaires <select data-dashboard-accounts aria-label="Comptes publicitaires" multiple></select></label><p class="dashboard-note" data-dashboard-status role="status"></p><p class="dashboard-note" data-alert-status role="status"></p><button type="button" data-dashboard-action="alert-settings">Régler les seuils d’alerte</button>';
      alerts.before(toolbar);
    }
    for (const [icon, ref] of [
      ["ph-squares-four", "C1.1"],
      ["ph-sparkle", "C2.1"],
      ["ph-megaphone", "C3.1"],
      ["ph-rocket-launch", "C4.1"],
      ["ph-palette", "C5.1"],
      ["ph-chart-bar", "C6.1"],
      ["ph-flow-arrow", "C7.1"],
      ["ph-globe-hemisphere-west", "C8.1"],
      ["ph-file-text", "C9.1"],
      ["ph-brain", "C10.1"],
      ["ph-dots-three", "C11.1"],
      ["ph-dots-three-circle", "C11.1"],
    ]) {
      for (const iconNode of frame.querySelectorAll(`i.${icon}`)) {
        const target = iconNode.parentElement!;
        target.setAttribute("data-source-go", ref);
        target.setAttribute("role", "button");
        target.setAttribute("tabindex", "0");
        target.setAttribute(
          "aria-label",
          screens.find((s) => s.ref === ref)?.title || ref,
        );
      }
    }
    for (const [icon, action] of [
      ["ph-bell", "alerts"],
      ["ph-question", "help"],
      ["ph-caret-line-left", "sidebar"],
    ])
      for (const i of frame.querySelectorAll(`i.${icon}`)) {
        control(i.parentElement, action);
        if (icon === "ph-bell") i.parentElement?.querySelector("div")?.remove();
      }
  }
  for (const s of doc.querySelectorAll(
    'script[data-dc-script],script[src="/source/support.js"]',
  ))
    s.remove();
  const root = doc.querySelector("x-dc");
  if (root) {
    const div = doc.createElement("div");
    div.id = "dc-root";
    div.innerHTML = root.innerHTML;
    root.replaceWith(div);
  }
  const style = doc.createElement("link");
  style.rel = "stylesheet";
  style.href = "/source/dashboard.css";
  doc.head.append(style);
  const config = doc.createElement("script");
  config.id = "dashboard-context";
  config.type = "application/json";
  config.textContent = JSON.stringify({
    organization: data.organization.id,
  }).replaceAll("<", "\\u003c");
  doc.body.append(config);
  const script = doc.createElement("script");
  script.src = "/source/dashboard.js";
  script.defer = true;
  doc.body.append(script);
  return doc.toString();
}
