import { parseHTML } from "linkedom";
import type { OnboardingData } from "../onboarding/data";
import { screens } from "../screens";
import { canSwitchOrganization } from "../onboarding/organization";

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const menu = [
  ["C1.1", "Tableau de bord", "squares-four"],
  ["C2.1", "Agent d’optimisation", "sparkle"],
  ["", "Campagnes", ""],
  ["C3.1", "Gestionnaire de publicités", "megaphone"],
  ["C4.1", "Constructeur de campagne", "rocket-launch"],
  ["", "Créatif", ""],
  ["C5.1", "Studio créatif", "palette"],
  ["C6.1", "Analyse créative", "chart-bar"],
  ["", "Pilotage", ""],
  ["C7.1", "Règles automatisées", "flow-arrow"],
  ["C8.1", "Analyse marché", "globe-hemisphere-west"],
  ["C9.1", "Rapports", "file-text"],
];
export function renderAppShell(
  html: string,
  ref: string,
  data: OnboardingData,
) {
  const doc = parseHTML(html).document;
  const href = (id: string) => screens.find((s) => s.ref === id)!.path;
  const link = (id: string, label: string, icon: string) =>
    `<a class="app-nav-link" href="${href(id)}" title="${escape(label)}" ${ref.split(".")[0] === id.split(".")[0] ? 'aria-current="page"' : ""}><i class="ph ph-${icon}" aria-hidden="true"></i><span class="app-nav-label">${escape(label)}</span></a>`;
  const canSwitch = canSwitchOrganization(data.organizations || []);
  const currencies = [
    ...new Set(
      data.accounts
        .filter((a) => data.state.ad_account_ids.includes(a.id))
        .map((a) => a.currency)
        .filter(Boolean),
    ),
  ];
  const company = `<span class="app-company-avatar">${escape(data.organization.name.slice(0, 2).toUpperCase())}</span><span class="app-company-copy"><strong>${escape(data.organization.name)}</strong><span data-account-currency>${escape(currencies.join(" · "))}</span></span>${canSwitch ? '<i class="ph ph-caret-up-down" aria-hidden="true"></i>' : ""}`;
  const sidebar = doc.createElement("aside");
  sidebar.id = "app-sidebar";
  sidebar.className = "app-sidebar";
  sidebar.setAttribute("aria-label", "Menu principal");
  sidebar.innerHTML = `<div class="app-sidebar-header"><a class="app-brand" href="${href("C1.1")}" aria-label="Lyads — Tableau de bord"><span>L</span><strong class="app-nav-label">Lyads</strong></a><button type="button" data-sidebar-toggle aria-label="Réduire le menu" aria-expanded="true"><i class="ph ph-caret-line-left" aria-hidden="true"></i></button></div><div class="app-company-wrap">${canSwitch ? `<a class="app-company" href="${href("C1.2")}" title="Choisir une entreprise">${company}</a>` : `<div class="app-company" title="${escape(data.organization.name)}">${company}</div>`}</div><nav class="app-sidebar-nav" aria-label="Navigation principale">${menu.map(([id, label, icon]) => (id ? link(id, label, icon) : `<div class="app-nav-section">${label}</div>`)).join("")}</nav><footer class="app-sidebar-footer">${link("C10.1", "Business Brain", "brain")}<a class="app-credits" href="${href("C11.4")}" title="Crédits" aria-label="Crédits"><span class="app-nav-label">Crédits</span><strong data-credit-balance>—</strong></a><a class="app-profile" href="${href("C11.1")}" title="Profil utilisateur" aria-label="Profil utilisateur" ${ref.startsWith("C11.") ? 'aria-current="page"' : ""}><span class="app-profile-avatar">${escape((data.displayName || "Profil").slice(0, 2).toUpperCase())}</span><span class="app-profile-copy"><strong>${escape(data.displayName || "Mon profil")}</strong><span>Mon profil</span></span><i class="ph ph-dots-three" aria-hidden="true"></i></a></footer>`;
  // Keep the shared shell outside the prototype root so a screen remount cannot replace it.
  doc.body.prepend(sidebar);
  doc.body.classList.add("app-shell");
  for (const frame of doc.querySelectorAll("[data-source-width]")) {
    for (const candidate of frame.querySelectorAll("div[style]")) {
      const style = candidate.getAttribute("style") || "";
      if (
        /width:\s*(64|240)px/.test(style) &&
        /border-right:/.test(style) &&
        candidate.querySelector(
          ".ph-sparkle,.ph-rocket-launch,.ph-squares-four",
        )
      )
        candidate.remove();
    }
    const root = frame.firstElementChild;
    root?.setAttribute("data-app-source-layout", "");
    // The mobile prototype's bottom navigation duplicates the common menu.
    if (Number(frame.getAttribute("data-source-width")) < 768)
      for (const child of [...(root?.children || [])])
        if (
          /grid-template-columns:repeat\(5,1fr\)/.test(
            child.getAttribute("style") || "",
          ) &&
          child.querySelector(".ph-squares-four")
        )
          child.remove();
  }
  const style = doc.createElement("link");
  style.rel = "stylesheet";
  style.href = "/source/shell.css";
  doc.head.append(style);
  const context = doc.createElement("script");
  context.type = "application/json";
  context.id = "shell-context";
  context.textContent = JSON.stringify({
    organization: data.organization.id,
    ref,
  }).replaceAll("<", "\\u003c");
  doc.body.append(context);
  const script = doc.createElement("script");
  script.src = "/source/shell.js";
  script.defer = true;
  doc.body.append(script);
  return doc.toString();
}
