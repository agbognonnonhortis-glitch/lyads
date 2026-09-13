import { parseHTML } from "linkedom";
import { renderSource, catalog } from "../source/render";
import { sections, stepPaths, type Section } from "./model";
import type { OnboardingData } from "./data";
type El = any;
const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const all = (root: El, selector = "div,span,button,a") =>
  [...root.querySelectorAll(selector)] as El[];
const leaf = (root: El, text: string) =>
  all(root).find((e) => !e.children.length && norm(e.textContent) === text);
const named = (root: El, text: string) =>
  all(root).find(
    (e) =>
      norm(e.textContent) === text &&
      ![...e.children].some((c: any) => norm(c.textContent) === text),
  );
const parents = (e: El, n: number) => {
  while (n--) e = e.parentElement;
  return e;
};
const node = (doc: El, tag: string, style: string, text?: string) => {
  const e = doc.createElement(tag);
  if (style) e.setAttribute("style", style);
  if (text !== undefined) e.textContent = text;
  return e;
};
const styles = {
  text: "font:400 13px/1.6 'Figtree',sans-serif;color:#423D37;text-wrap:pretty",
  small: "font:500 11px/1.4 'Space Grotesk',monospace;color:#6E6862",
  title: "font:700 16px/1.3 'Figtree',sans-serif;color:#1B1916",
  stack: "display:flex;flex-direction:column;gap:11px",
  card: "background:#FFFFFF;border:1px solid #E8E3D9;border-radius:14px;padding:18px",
  button:
    "background:#B44A26;color:#FFFFFF;padding:14px 20px;border-radius:10px;font:700 14px/1 'Figtree',sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer",
  input:
    "background:#FFFFFF;border:1px solid #D6CFC2;border-radius:10px;padding:12px;font:400 14px/1.5 'Figtree',sans-serif;color:#1B1916;width:100%;box-sizing:border-box",
};
function action(e: El, name: string, text?: string) {
  e.setAttribute("data-onboarding-action", name);
  e.setAttribute("role", "button");
  e.setAttribute("tabindex", "0");
  if (text !== undefined) {
    const icon = e.querySelector("i")?.cloneNode(true);
    e.replaceChildren(
      ...(icon ? [icon] : []),
      e.ownerDocument.createTextNode(text),
    );
  }
  return e;
}
function card(doc: El, title: string, text?: string) {
  const e = node(doc, "div", styles.card);
  e.append(node(doc, "div", styles.title, title));
  if (text) e.append(node(doc, "div", styles.text + ";margin-top:10px", text));
  return e;
}
function intro(frame: El, title: string, description: string) {
  const h = frame.querySelector("h1");
  if (h) {
    h.textContent = title;
    const p = h.nextElementSibling;
    if (p) {
      p.textContent = description;
      p.setAttribute("data-onboarding-status", "");
    }
  }
}
function button(doc: El, label: string, act: string) {
  return action(node(doc, "div", styles.button, label), act);
}
function placeholder(doc: El, text: string) {
  return node(doc, "div", styles.text + ";padding:14px 0", text);
}
function template(ref: string, width: number, match: string, levels: number) {
  const f =
    catalog[ref].frames.find((f) => f.width === width) ||
    catalog[ref].frames[0];
  const d = parseHTML("<html><body>" + f.html + "</body></html>").document;
  return parents(leaf(d, match), levels);
}
function choice(
  doc: El,
  tpl: El,
  name: string,
  detail: string,
  selected: boolean,
  act: string,
  id: string,
  attrs: Record<string, string> = {},
) {
  const e = tpl.cloneNode(true);
  const title = all(e).find(
    (x) =>
      !x.children.length &&
      /font:700 (?:14|15|16)px/.test(x.getAttribute("style") || ""),
  );
  if (!title) throw new Error("Missing source choice title");
  const info = title.parentElement.parentElement;
  const head = title.cloneNode(true);
  head.textContent = name;
  info.replaceChildren(head, node(doc, "div", styles.small, detail));
  // Remaining direct children contain only selection and source icons.
  action(e, act);
  e.setAttribute("data-id", id);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute("data-" + k, v);
  e.setAttribute("role", "checkbox");
  e.setAttribute("aria-checked", String(selected));
  e.style.background = selected ? "#FDF5F1" : "#FFFFFF";
  e.style.borderColor = selected ? "#B44A26" : "#E8E3D9";
  const check = e.firstElementChild;
  if (check !== info) {
    check.style.background = selected ? "#B44A26" : "#FFFFFF";
    if (check.firstElementChild)
      check.firstElementChild.style.visibility = selected
        ? "visible"
        : "hidden";
  }
  return e;
}
function setFooter(frame: El, step: number) {
  for (const e of all(frame)) {
    const t = norm(e.textContent);
    if (
      t === "Terminer plus tard" ||
      t === "Configurer plus tard" ||
      t === "Passer cette étape" ||
      t === "Passer"
    )
      action(e, "leave", "Reprendre plus tard");
    if (t === "Retour au formulaire") action(e, "brain");
    if (t === "Compléter plus tard") action(e, "leave");
    if (t === "Continuer sans pixel") action(e, "skip-pixels");
    if (t === "Voir le récapitulatif") action(e, "recap");
    if (t === "Retour" || t === "Section précédente")
      action(e, "previous", "Retour");
  }
  const candidates = all(frame).filter(
    (e) =>
      !e.querySelector("h1") &&
      /^(Continuer(?: avec.*)?|Section suivante.*|Valider et choisir un plan|Aller au tableau de bord|Compléter les 2 étapes|Compléter maintenant · 2 min)$/.test(
        norm(e.textContent),
      ) &&
      ![...e.children].some(
        (c: any) => norm(c.textContent) === norm(e.textContent),
      ),
  );
  for (const e of candidates)
    if (step !== 1)
      action(
        e,
        step === 10 ? "dashboard" : "next",
        step === 8
          ? "Valider et choisir un plan"
          : step === 10
            ? "Aller au tableau de bord"
            : "Continuer",
      );
}
function navigation(frame: El, ref: string, completed: boolean) {
  if (ref === "B2") return;
  const doc = frame.ownerDocument;
  const title = frame.querySelector("h1")?.parentElement;
  const main = title?.parentElement;
  if (!main) return;
  const primaryAction =
    ref === "B8"
      ? "recap"
      : ref === "B10"
        ? "free"
        : ref === "B11"
          ? completed
            ? "dashboard"
            : "resume"
          : "next";
  for (const el of all(frame, "[data-onboarding-action]")) {
    const act = el.getAttribute("data-onboarding-action");
    if (
      [
        "next",
        "free",
        "dashboard",
        "resume",
        "refresh",
        "skip-pages",
        "skip-pixels",
      ].includes(act) ||
      act === primaryAction
    ) {
      el.remove();
    } else if (
      [
        "previous",
        "leave",
        "brain",
        "recap",
        "add-product",
        "remove-product",
        "paid",
      ].includes(act)
    ) {
      el.setAttribute(
        "style",
        styles.text +
          ";cursor:pointer;display:inline-flex;align-items:center;gap:6px",
      );
    }
  }
  if (["B3", "B5", "B6"].includes(ref)) {
    const label =
      ref === "B3"
        ? "Actualiser les Business Managers et comptes"
        : ref === "B5"
          ? "Actualiser les pages"
          : "Actualiser les pixels et événements";
    const refresh = action(
      node(
        doc,
        "button",
        styles.text +
          ";border:0;background:transparent;padding:0;cursor:pointer;display:inline-flex;align-items:center;gap:6px;align-self:flex-start",
        label,
      ),
      "refresh",
    );
    refresh.setAttribute("type", "button");
    const icon = node(doc, "i", "font-size:16px");
    icon.className = "ph ph-arrow-clockwise";
    icon.setAttribute("aria-hidden", "true");
    refresh.prepend(icon);
    title.after(refresh);
  }
  const row = node(
    doc,
    "div",
    "display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:12px",
  );
  row.setAttribute("data-onboarding-navigation", "");
  const next = button(doc, "Suivant", primaryAction);
  next.setAttribute("data-onboarding-primary", "");
  row.append(next);
  if (ref === "B6") {
    const skip = action(
      node(
        doc,
        "button",
        styles.text +
          ";font-size:12px;border:0;background:transparent;padding:4px 0;cursor:pointer",
        "Continuer sans pixel",
      ),
      "skip-pixels",
    );
    skip.setAttribute("type", "button");
    row.append(skip);
  }
  main.append(row);
}
export function onboardingStep(ref: string, section?: string) {
  if (ref === "B7")
    return section === "market" || section === "audience"
      ? 6
      : section === "funnel" || section === "history"
        ? 7
        : 5;
  return (
    (
      {
        B1: 1,
        B2: 1,
        B3: 2,
        B4: 2,
        B5: 3,
        B6: 4,
        B8: 7,
        B9: 8,
        B10: 9,
        B11: 10,
      } as Record<string, number>
    )[ref] || 1
  );
}
export function renderOnboarding(
  ref: string,
  data: OnboardingData,
  section = "activity",
) {
  if (ref === "B1") ref = "B2";
  if (ref === "B4") ref = "B3";
  const step = onboardingStep(ref, section);
  const doc = parseHTML(renderSource(ref)!).document;
  const state = data.state;
  // The original runtime renders sample state again on mount. These screens now
  // use their original static markup with the live controller only.
  for (const script of all(doc, "script")) script.remove();
  const resources = (kind: string) =>
    data.resources.filter((r: any) => r.kind === kind);
  const selectedAccounts = data.accounts.filter((a: any) =>
    state.ad_account_ids.includes(a.id),
  );
  const resource = (kind: string, id: string) =>
    resources(kind).find((r: any) => r.meta_id === id);
  const titles = [
    "Connexion publicitaire",
    "Business Manager et comptes",
    "Pages Facebook",
    "Pixels et événements",
    "Activité et offre",
    "Marché et audience",
    "Tunnel et historique",
    "Récapitulatif",
    "Choix du plan",
    "Configuration enregistrée",
  ];
  for (const frame of all(doc, "[data-source-width]")) {
    for (const e of all(frame, "[style]")) {
      const s = e.getAttribute("style");
      if (/width:(62|78)%/.test(s || ""))
        e.setAttribute(
          "style",
          s.replace(/width:(62|78)%/g, `width:${data.completeness.percent}%`),
        );
    }
    const width = Number(frame.getAttribute("data-source-width"));
    for (const e of all(frame, "[style]")) {
      const value = e.getAttribute("style") || "";
      if (value.includes("conic-gradient"))
        e.setAttribute(
          "style",
          value.replace(/(?:62|78)%/g, data.completeness.percent + "%"),
        );
      if (
        value.includes("height:100%;background:#B44A26") &&
        /\d+\/10/.test(parents(e, 3).textContent)
      )
        e.style.width = step * 10 + "%";
    }

    for (const e of all(frame))
      if (!e.children.length) {
        const t = norm(e.textContent);
        if (/^Étape \d+ —/.test(t))
          e.textContent = `Étape ${step} — ${titles[step - 1]}`;
        if (/^\d+\/10$/.test(t)) e.textContent = `${step}/10`;
        if (/^Étape \d+ sur 4/.test(t) || t === "Dernière étape · Plan")
          e.textContent = `Étape ${step} sur 10 · ${titles[step - 1]}`;
      }
    const progress = all(frame).find(
      (e) =>
        e.children.length === 10 &&
        [...e.children].every((c: any) =>
          c.firstElementChild
            ?.getAttribute("style")
            ?.includes("width:22px;height:22px"),
        ),
    );
    if (progress) {
      const active =
        [...progress.children]
          .find((e: any) => e.children.length === 3)
          ?.children[1]?.cloneNode(true) || node(doc, "div", styles.title);
      [...progress.children].forEach((item: any, index: number) => {
        const circle = item.firstElementChild;
        const current = index + 1 === step;
        circle.style.background = current
          ? "#B44A26"
          : index + 1 < step
            ? "#146B4A"
            : "#FFFFFF";
        circle.style.borderColor = current
          ? "#B44A26"
          : index + 1 < step
            ? "#146B4A"
            : "#D6CFC2";
        circle.replaceChildren(
          node(
            doc,
            "div",
            styles.small +
              ";font-size:10px;color:" +
              (index + 1 <= step ? "#FFFFFF" : "#A9A196"),
            String(index + 1),
          ),
        );
        for (const child of [...item.children].slice(1))
          if (!child.getAttribute("style")?.includes("height:2px"))
            child.remove();
        if (current) {
          const label = active.cloneNode(true);
          label.textContent = [
            "Connexion",
            "Business Manager",
            "Pages",
            "Pixel",
            "Activité",
            "Marché",
            "Tunnel",
            "Récapitulatif",
            "Plan",
            "Fin",
          ][index];
          circle.after(label);
          item.setAttribute("aria-current", "step");
        } else item.removeAttribute("aria-current");
      });
    }
    setFooter(frame, step);
    if (ref === "B2") {
      for (const permission of [
        "ads_read",
        "ads_management",
        "pages_show_list",
        "business_management",
      ])
        leaf(frame, permission)?.remove();
      const validationNotice = leaf(
        frame,
        "Ce que Lyads ne fera jamais sans votre validation explicite",
      );
      if (validationNotice) parents(validationNotice, 2).remove();
      intro(
        frame,
        "Connectez votre compte publicitaire",
        "Autorisez Lyads à lire vos ressources Meta. Vous choisirez ensuite votre Business Manager, vos comptes publicitaires, vos pages et vos pixels.",
      );
      for (const e of all(frame))
        if (
          [
            "Continuer avec Facebook",
            "Continuer avec Meta",
            "Connecter Meta",
          ].includes(norm(e.textContent)) &&
          ![...e.children].some(
            (c: any) => norm(c.textContent) === norm(e.textContent),
          )
        )
          action(
            e,
            data.connection ? "connected" : "connect",
            "Connecter mon Business Manager",
          );
      const connectButtons = all(
        frame,
        '[data-onboarding-action="connect"], [data-onboarding-action="connected"]',
      );
      const primaryConnect = connectButtons[0];
      if (primaryConnect) {
        while (primaryConnect.nextElementSibling)
          primaryConnect.nextElementSibling.remove();
      }
      // The mobile maquette repeats the connection action in a bottom bar.
      for (const duplicate of connectButtons.slice(1))
        duplicate.parentElement.remove();
      const skipNotice = leaf(
        frame,
        "Vous pouvez visiter le produit sans compte connecté. Sans Meta, aucune donnée réelle : ni performances, ni recommandations, ni publication.",
      );
      if (skipNotice) parents(skipNotice, 2).remove();
    }
    if (ref === "B3") {
      const search = leaf(frame, "Chercher par nom ou identifiant");
      if (search) {
        const input = node(
          doc,
          "input",
          (search.getAttribute("style") || styles.input) +
            ";border:0;background:transparent;outline:0;min-width:0;width:100%",
        );
        input.setAttribute("placeholder", "Chercher par nom ou identifiant");
        input.setAttribute("aria-label", "Rechercher un Business Manager");
        input.setAttribute("data-resource-search", "business");
        search.replaceWith(input);
      }
      const results = leaf(frame, "3 résultats");
      if (results) {
        results.textContent = resources("business").length + " résultat(s)";
        results.setAttribute("data-resource-results", "");
      }
      const name = leaf(frame, "Kola Distribution");
      const row = parents(name, 3);
      const list = row.parentElement;
      const tpl = row.cloneNode(true);
      list.replaceChildren();
      for (const bm of resources("business")) {
        const count = data.businessAccounts.filter(
          (l: any) => l.business_meta_id === bm.meta_id,
        ).length;
        list.append(
          choice(
            doc,
            tpl,
            bm.source_data.name,
            `${bm.meta_id} · ${count} compte(s) accessible(s)`,
            state.business_meta_id === bm.meta_id,
            "business",
            bm.meta_id,
          ),
        );
      }
      if (!list.children.length)
        list.append(
          placeholder(
            doc,
            "Aucun Business Manager disponible. Actualisez les ressources ou vérifiez les autorisations Meta.",
          ),
        );
      const info = named(
        frame,
        "Un seul Business Manager ? L’étape est passée automatiquement",
      );
      if (info) {
        let p = info;
        while (p.parentElement !== list.parentElement && p.parentElement)
          p = p.parentElement;
        p.replaceChildren(
          placeholder(
            doc,
            "Sélectionnez un Business Manager pour afficher ses comptes publicitaires ci-dessous.",
          ),
        );
      }
      const accountBlock = card(doc, "Comptes publicitaires");
      const accounts = node(doc, "div", styles.stack + ";margin-top:12px");
      accountBlock.append(accounts);
      list.after(accountBlock);
      const links = data.businessAccounts
        .filter((l: any) => l.business_meta_id === state.business_meta_id)
        .map((l: any) => l.ad_account_id);
      const available = data.accounts.filter((a: any) => links.includes(a.id));
      const atpl = template("B4", width, "Kola Distribution — Sénégal", 3);
      for (const a of available)
        accounts.append(
          choice(
            doc,
            atpl,
            a.name,
            `${a.meta_account_id} · ${a.currency} · ${a.timezone_name}`,
            state.ad_account_ids.includes(a.id),
            "account",
            a.id,
          ),
        );
      if (!available.length)
        accounts.append(
          placeholder(
            doc,
            state.business_meta_id
              ? "Aucun compte accessible chargé pour ce Business Manager. La recherche peut encore être en cours."
              : "Choisissez d’abord un Business Manager.",
          ),
        );
      intro(
        frame,
        "Quel Business Manager voulez-vous piloter ?",
        `${resources("business").length} Business Manager(s) disponible(s). Choisissez-en un, puis sélectionnez un ou plusieurs de ses comptes publicitaires.`,
      );
      accountBlock.append(button(doc, "Actualiser les ressources", "refresh"));
    }
    if (ref === "B5") {
      const row = parents(leaf(frame, "Kola Distribution"), 3);
      const tpl = row.cloneNode(true);
      const list = row.parentElement;
      list.replaceChildren();
      const ids = data.links
        .filter(
          (l: any) =>
            l.kind === "page" &&
            l.scope_type === "business" &&
            l.scope_id === state.business_meta_id,
        )
        .map((l: any) => l.meta_id);
      const pages = resources("page").filter((p: any) =>
        ids.includes(p.meta_id),
      );
      for (const p of pages)
        list.append(
          choice(
            doc,
            tpl,
            p.source_data.name,
            p.meta_id,
            state.page_ids.includes(p.meta_id),
            "page",
            p.meta_id,
          ),
        );
      if (!pages.length)
        list.append(
          placeholder(
            doc,
            "Aucune page accessible chargée pour ce Business Manager. Actualisez la recherche ou vérifiez les accès à vos pages dans Meta. Une page est obligatoire pour continuer.",
          ),
        );
      const note = list.nextElementSibling;
      if (note)
        note.replaceChildren(
          placeholder(
            doc,
            "Choisissez les pages que vous utilisez pour vos publicités. Les informations Instagram indisponibles ne sont pas déduites.",
          ),
        );
      list.after(button(doc, "Actualiser les pages", "refresh"));
      intro(
        frame,
        "Quelles pages utilisez-vous pour vos publicités ?",
        `${pages.length} page(s) accessible(s) pour le Business Manager sélectionné. Vous pouvez en choisir plusieurs.`,
      );
    }
    if (ref === "B6") {
      const pixelNotice = leaf(
        frame,
        "Aucun pixel sur votre compte ? Ce cas est prévu",
      );
      if (pixelNotice) parents(pixelNotice, 2).remove();
      const title = frame.querySelector("h1").parentElement;
      const main = title.parentElement;
      // Reuse the original pixel and event cards inside the original content column.
      const ptpl = parents(leaf(frame, "Pixel Kola Distribution"), 3).cloneNode(
        true,
      );
      const etpl = parents(leaf(frame, "Achat"), 2).cloneNode(true);
      for (const child of [...main.children])
        if (child !== title) child.remove();
      const pixelsBlock = card(doc, "Pixels des comptes sélectionnés");
      const plist = node(doc, "div", styles.stack + ";margin-top:12px");
      pixelsBlock.append(plist);
      main.append(pixelsBlock);
      for (const a of selectedAccounts) {
        plist.append(node(doc, "div", styles.title, a.name));
        const ids = data.links
          .filter(
            (l: any) =>
              l.kind === "pixel" &&
              l.scope_type === "account" &&
              l.scope_id === a.id,
          )
          .map((l: any) => l.meta_id);
        const ps = resources("pixel").filter((p: any) =>
          ids.includes(p.meta_id),
        );
        if (!ps.length)
          plist.append(
            placeholder(doc, "Aucun pixel accessible chargé pour ce compte."),
          );
        for (const p of ps) {
          const picked = state.pixels.find(
            (v: any) => v.account_id === a.id && v.pixel_id === p.meta_id,
          );
          const detail = p.source_data.last_fired_time
            ? `${p.meta_id} · dernier événement : ${p.source_data.last_fired_time}`
            : p.meta_id + " · activité indisponible";
          plist.append(
            choice(
              doc,
              ptpl,
              p.source_data.name,
              detail,
              !!picked,
              "pixel",
              p.meta_id,
              { account: a.id },
            ),
          );
          if (picked) {
            const events = resources("conversion_event").filter(
              (r: any) => r.source_data.pixel_id === p.meta_id,
            );
            const eb = card(doc, "Événement de conversion principal");
            if (!events.length)
              eb.append(
                placeholder(
                  doc,
                  "Aucun volume d’événements disponible. Vous pouvez conserver le pixel sans choisir d’événement.",
                ),
              );
            for (const event of events) {
              const e = etpl.cloneNode(true);
              const n = leaf(e, "Achat");
              n.textContent = event.source_data.event_name;
              leaf(e, "Purchase").textContent = "Meta";
              leaf(e, "1 284").textContent = String(event.source_data.count_7d);
              action(e, "event");
              e.setAttribute("data-id", event.source_data.event_name);
              e.setAttribute("data-account", a.id);
              e.setAttribute("data-pixel", p.meta_id);
              e.setAttribute(
                "aria-pressed",
                String(picked.event === event.source_data.event_name),
              );
              e.style.background =
                picked.event === event.source_data.event_name
                  ? "#FDF5F1"
                  : "#FFFFFF";
              e.style.borderColor =
                picked.event === event.source_data.event_name
                  ? "#B44A26"
                  : "#E8E3D9";
              eb.append(e);
            }
            plist.append(eb);
          }
        }
      }
      main.append(
        button(doc, "Actualiser les pixels et événements", "refresh"),
        button(doc, "Continuer", "next"),
        button(doc, "Continuer sans pixel", "skip-pixels"),
      );
      intro(
        frame,
        "Quels pixels et événements voulez-vous utiliser ?",
        "Les pixels ci-dessous appartiennent aux comptes sélectionnés. Les volumes disponibles viennent de Meta ; aucune estimation ne remplace une donnée absente.",
      );
    }
    if (ref === "B7") {
      const main = frame.querySelector("h1").parentElement.parentElement;
      const list = parents(leaf(frame, "Argument principal"), 7);
      const first = list.firstElementChild;
      const ct = first.cloneNode(true);
      const labelTemplate = leaf(frame, "Argument principal")?.cloneNode(true);
      // The original field shell, rather than maquette placeholder values, supplies styling.
      const originalField = labelTemplate
        ? parents(leaf(frame, "Argument principal"), 2)
        : null;
      const fieldStyle =
        originalField?.lastElementChild?.getAttribute("style") || styles.input;
      list.replaceChildren();
      for (const [key, definition] of Object.entries(sections)) {
        const c = ct.cloneNode(true);
        const head = c.firstElementChild;
        const heading = all(head).find(
          (e) => !e.children.length && norm(e.textContent) === "Mon activité",
        );
        if (heading) {
          heading.textContent = definition.title;
          const subtitle = heading.nextElementSibling;
          if (subtitle) subtitle.textContent = "Informations saisies par vous";
        }
        for (const e of all(head))
          if (!e.children.length && e.textContent === "Complète")
            e.textContent = "";
        c.setAttribute("data-section", key);
        const form = node(doc, "div", styles.stack + ";padding:16px 18px");
        const values = state.brain[key] || {};
        const field = (
          name: string,
          label: string,
          value: unknown,
          index?: number,
        ) => {
          const wrap = node(doc, "label", styles.stack + ";gap:6px");
          wrap.append(
            node(doc, "span", styles.title + ";font-size:13px", label),
          );
          const input = node(
            doc,
            name === "argument" || name === "objections" ? "textarea" : "input",
            fieldStyle + ";width:100%;box-sizing:border-box;outline-offset:3px",
          );
          input.setAttribute("data-field", name);
          input.setAttribute("data-section", key);
          if (index !== undefined)
            input.setAttribute("data-product", String(index));
          input.setAttribute(
            "aria-label",
            label + (index !== undefined ? " " + (index + 1) : ""),
          );
          input.setAttribute("maxlength", "4000");
          input.setAttribute("placeholder", label);
          if (input.tagName === "TEXTAREA")
            input.textContent = typeof value === "string" ? value : "";
          else
            input.setAttribute("value", typeof value === "string" ? value : "");
          wrap.append(input);
          return wrap;
        };
        if (key === "offer") {
          const products = Array.isArray(values.products)
            ? values.products
            : [];
          for (const [i, product] of products.entries()) {
            const productCard = card(
              doc,
              product.name || `Produit ou service ${i + 1}`,
            );
            for (const [name, label] of Object.entries(definition.fields))
              productCard.append(field(name, label, product[name], i));
            const remove = button(doc, "Retirer ce produit", "remove-product");
            remove.setAttribute("data-product", String(i));
            productCard.append(remove);
            form.append(productCard);
          }
          form.append(
            button(doc, "Ajouter un produit ou un service", "add-product"),
          );
        } else
          for (const [name, label] of Object.entries(definition.fields))
            form.append(field(name, label, values[name]));
        form.hidden = key !== section;
        action(head, "toggle-section");
        head.setAttribute("aria-expanded", String(key === section));
        for (const i of all(head, "i.ph-check")) i.style.visibility = "hidden";
        c.append(form);
        list.append(c);
      }
      intro(
        frame,
        "Ce que l’agent doit savoir de votre activité",
        "Renseignez vos informations réelles. Les champs laissés vides restent manquants ; chaque modification est enregistrée dans votre espace.",
      );
      for (const e of all(frame))
        if (!e.children.length) {
          const t = norm(e.textContent);
          if (
            t ===
            "Sauvegarde continue : une connexion perdue ne fait rien perdre."
          )
            e.textContent =
              "Les modifications sont conservées après confirmation de leur enregistrement.";
          if (t === "62") e.textContent = String(data.completeness.percent);
          if (
            /62 %|À 62 %|deux déjà remplies|2 produits enregistrés|4 secondes|2 champs sur 5|3 champs/.test(
              t,
            )
          )
            e.textContent = t.startsWith("À")
              ? "La complétude dépend uniquement des champs renseignés."
              : t.includes("Enregistré")
                ? "Enregistré dans votre espace"
                : `${data.completeness.percent} % rempli`;
          if (t.startsWith("Enregistré ·"))
            e.textContent = `Enregistré · ${data.completeness.percent} % rempli`;
        }
      for (const e of all(frame))
        if (
          norm(e.textContent).startsWith("Section suivante") &&
          !e.querySelector("[data-field]")
        )
          action(e, "next", "Continuer");
      for (const [key, definition] of Object.entries(sections))
        for (const e of all(frame))
          if (
            !e.children.length &&
            norm(e.textContent) === definition.title &&
            !e.closest("[data-section]")
          ) {
            action(e, "open-section");
            e.setAttribute("data-target", key);
            const circle = e.parentElement.firstElementChild;
            if (
              circle !== e &&
              circle.getAttribute("style")?.includes("width:20px")
            ) {
              circle.replaceChildren(
                node(
                  doc,
                  "div",
                  styles.small + ";font-size:9px",
                  String(Object.keys(sections).indexOf(key) + 1),
                ),
              );
              circle.style.background = key === section ? "#FDF5F1" : "#FFFFFF";
              circle.style.borderColor =
                key === section ? "#B44A26" : "#D6CFC2";
              e.style.color = key === section ? "#B44A26" : "#423D37";
              e.style.fontWeight = key === section ? "700" : "500";
            }
          }
      if (!main.querySelector('[data-onboarding-action="next"]'))
        main.append(button(doc, "Continuer", "next"));
    }
    if (ref === "B8") {
      const title = frame.querySelector("h1").parentElement;
      const main = title.parentElement;
      for (const child of [...main.children])
        if (child !== title) child.remove();
      intro(
        frame,
        "Analyse de votre site",
        "Aucune analyse automatique n’a été exécutée. Vos informations métier restent celles que vous avez saisies.",
      );
      main.append(
        card(
          doc,
          "Site renseigné",
          state.brain.activity?.website || "Aucun site renseigné.",
        ),
        card(
          doc,
          "Saisie manuelle disponible",
          "Le moteur d’analyse automatique du site n’est pas encore raccordé. Aucune offre, aucun prix et aucune audience ne sont inventés.",
        ),
        button(doc, "Continuer avec mes informations", "recap"),
        button(doc, "Compléter le formulaire", "brain"),
      );
    }
    if (ref === "B9") {
      const n = leaf(frame, "Nom de l’entreprise");
      const row = n.parentElement;
      const rowTpl = row.cloneNode(true);
      const group = parents(leaf(frame, "Mon activité"), 3);
      const list = group.parentElement;
      const groupTpl = group.cloneNode(true);
      list.replaceChildren();
      for (const [key, definition] of Object.entries(sections)) {
        const g = groupTpl.cloneNode(true);
        const heading = leaf(g, "Mon activité");
        heading.textContent = definition.title;
        const badge = leaf(g, "Complète");
        if (badge) badge.textContent = "Saisi par vous";
        const nr = leaf(g, "Nom de l’entreprise");
        const rows = nr.parentElement.parentElement;
        rows.replaceChildren();
        const records =
          key === "offer"
            ? state.brain.offer?.products || []
            : [state.brain[key] || {}];
        for (const record of records.length ? records : [{}])
          for (const [name, label] of Object.entries(definition.fields)) {
            const r = rowTpl.cloneNode(true);
            leaf(r, "Nom de l’entreprise").textContent = label;
            leaf(r, "Kola Distribution").textContent =
              record[name] || "Non renseigné";
            const source = named(r, "Saisi par vous");
            if (source)
              source.textContent = record[name] ? "Saisi par vous" : "Manquant";
            rows.append(r);
          }
        list.append(g);
      }
      // Replace sample deductions with the actual selected assets, preserving the card shell.
      const deductions = all(frame).find(
        (e) =>
          !e.children.length &&
          norm(e.textContent) === "Les déductions sont des propositions",
      );
      if (deductions) {
        const box = parents(deductions, 2);
        box.replaceChildren(
          node(doc, "div", styles.title, "Ressources sélectionnées"),
          node(
            doc,
            "div",
            styles.text,
            resource("business", state.business_meta_id)?.source_data.name ||
              "Business Manager non sélectionné",
          ),
          ...selectedAccounts.map((a: any) =>
            node(doc, "div", styles.text, a.name + " · " + a.currency),
          ),
          ...state.page_ids.map((id: string) =>
            node(
              doc,
              "div",
              styles.text,
              "Page : " +
                (resource("page", id)?.source_data.name || "Indisponible"),
            ),
          ),
          ...state.pixels.map((p: any) =>
            node(
              doc,
              "div",
              styles.text,
              "Pixel : " +
                (resource("pixel", p.pixel_id)?.source_data.name ||
                  "Indisponible") +
                (p.event ? " · " + p.event : ""),
            ),
          ),
        );
      }
      intro(
        frame,
        "Vérifiez les informations de votre activité",
        "Ce récapitulatif reprend vos sélections Meta et les réponses enregistrées. Revenez au formulaire pour les corriger avant de confirmer.",
      );
      for (const e of all(frame))
        if (!e.children.length) {
          const t = norm(e.textContent);
          if (/78 %/.test(t))
            e.textContent = `${data.completeness.percent} % rempli · ${data.completeness.missing.length} champs manquants`;
        }
      const counts = leaf(frame, "24 informations · 9 déduites · 4 manquantes");
      if (counts)
        counts.textContent = `${data.completeness.filled} champs renseignés · ${data.completeness.missing.length} champs manquants`;
      const missing = leaf(frame, "Ce qui manque, et ce que ça limite");
      if (missing) {
        const block = parents(missing, 2);
        block.replaceChildren(
          node(doc, "div", styles.title, "Informations manquantes"),
          ...data.completeness.missing.map((m) =>
            node(doc, "div", styles.text, `${m.label} — ${m.affects}`),
          ),
        );
      }
      const percent = leaf(frame, "Complétude du Business Brain");
      if (percent) {
        const block = parents(percent, 3);
        block.replaceChildren(
          node(doc, "div", styles.title, "Complétude du Business Brain"),
          node(
            doc,
            "div",
            styles.text,
            `${data.completeness.percent} % · ${data.completeness.filled} champs renseignés sur ${data.completeness.total}. Ce score ne mesure pas la fiabilité des performances publicitaires.`,
          ),
        );
      }
    }
    if (ref === "B10") {
      intro(
        frame,
        "Choisissez votre plan",
        "Le plan gratuit donne 60 crédits mensuels et permet de connecter un compte publicitaire. Les offres payantes affichées seront disponibles après raccordement du paiement.",
      );
      for (const e of all(frame))
        if (
          !e.children.length &&
          norm(e.textContent).startsWith("Les crédits non consommés expirent")
        )
          e.textContent =
            "Les crédits non consommés expirent à l’échéance mensuelle. Le rachat de crédits n’est pas encore disponible.";

      const currency = leaf(frame, "FCFA");
      if (currency && currency.parentElement.textContent === "FCFAEURUSD")
        currency.parentElement.replaceChildren(
          node(doc, "div", styles.small, "Tarifs affichés en FCFA"),
        );
      const pay = leaf(frame, "Moyen de paiement");
      if (pay) {
        const box = parents(pay, 3);
        const parent = box.parentElement;
        parent.replaceChildren(
          card(
            doc,
            "Paiement",
            "Les paiements par carte et Mobile Money ne sont pas encore disponibles. Aucun moyen de paiement ni abonnement payant n’est enregistré. Vous pouvez activer le plan gratuit.",
          ),
        );
      }
      for (const e of all(frame)) {
        const t = norm(e.textContent);
        if (
          [
            "Commencer gratuitement",
            "Continuer avec l’offre gratuite",
          ].includes(t) &&
          ![...e.children].some((c: any) => norm(c.textContent) === t)
        )
          action(
            e,
            "free",
            state.completed_at
              ? "Voir ma configuration"
              : "Activer le plan gratuit",
          );
        if (/^Choisir (Essentiel|Pro|Agence)$/.test(t)) {
          action(e, "paid", "Paiement bientôt disponible");
          e.setAttribute("aria-disabled", "true");
        }
        if (/^Payer avec Wave/.test(t) && t.length < 100) {
          e.textContent = "Aucun paiement disponible";
          e.removeAttribute("data-onboarding-action");
        }
      }
    }
    if (ref === "B11") {
      const title = frame.querySelector("h1").parentElement;
      const main = title.parentElement;
      for (const child of [...main.children])
        if (child !== title) child.remove();
      intro(
        frame,
        state.completed_at
          ? "Votre configuration est enregistrée."
          : "Votre configuration reste à terminer.",
        state.completed_at
          ? "Vos sélections Meta et vos informations métier sont conservées dans votre espace."
          : "Vérifiez les informations et choisissez votre plan pour terminer l’onboarding.",
      );
      const summary = card(doc, "Ce qui est enregistré");
      summary.append(
        node(
          doc,
          "div",
          styles.text,
          "Business Manager : " +
            (resource("business", state.business_meta_id)?.source_data.name ||
              "Non renseigné"),
        ),
        ...selectedAccounts.map((a: any) =>
          node(
            doc,
            "div",
            styles.text,
            "Compte : " + a.name + " · " + a.currency,
          ),
        ),
        ...state.page_ids.map((id: string) =>
          node(
            doc,
            "div",
            styles.text,
            "Page : " +
              (resource("page", id)?.source_data.name || "Indisponible"),
          ),
        ),
        ...state.pixels.map((p: any) =>
          node(
            doc,
            "div",
            styles.text,
            "Pixel : " +
              (resource("pixel", p.pixel_id)?.source_data.name ||
                "Indisponible"),
          ),
        ),
        node(
          doc,
          "div",
          styles.text,
          `Business Brain : ${data.completeness.percent} % renseigné`,
        ),
        node(
          doc,
          "div",
          styles.text,
          state.completed_at && state.plan_key === "free"
            ? "Plan gratuit · 60 crédits mensuels"
            : "Plan non activé",
        ),
      );
      main.append(
        summary,
        card(
          doc,
          "Synchronisation des données",
          data.jobs.some(
            (j: any) => j.kind === "meta.sync" && j.status === "succeeded",
          )
            ? "Un import Meta a terminé. La fraîcheur est consultable par compte."
            : "La synchronisation des comptes sélectionnés sera lancée en arrière-plan. Aucun scan ni recommandation n’est annoncé comme terminé.",
        ),
        button(
          doc,
          state.completed_at
            ? "Aller au tableau de bord"
            : "Reprendre ma configuration",
          state.completed_at ? "dashboard" : "resume",
        ),
      );
    }
    navigation(frame, ref, !!state.completed_at);
  }
  const visibility = doc.createElement("style");
  visibility.textContent = "[hidden]{display:none!important}";
  doc.head.append(visibility);
  const payload = {
    ref,
    step,
    section,
    data,
    loadedAt: new Date().toISOString(),
  };
  const config = doc.createElement("script");
  config.id = "onboarding-data";
  config.type = "application/json";
  config.textContent = JSON.stringify(payload).replaceAll("<", "\\u003c");
  doc.body.append(config);
  const script = doc.createElement("script");
  script.src = "/source/onboarding.js";
  script.defer = true;
  doc.body.append(script);
  return doc.toString();
}
