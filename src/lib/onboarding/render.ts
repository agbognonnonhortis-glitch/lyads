import { parseHTML } from "linkedom";
import { renderSource, catalog } from "../source/render";
import { profileFields, stepPaths } from "./model";
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
function navigation(frame: El, ref: string, completed: boolean, step: number) {
  if (ref === "B2") return;
  const doc = frame.ownerDocument;
  const title = frame.querySelector("h1")?.parentElement;
  const main = title?.parentElement;
  if (!main) return;
  const primaryAction =
    ref === "B7" && step === 5
      ? "analyze-website"
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
        "previous",
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
  if (step > 1) {
    const back = action(
      node(
        doc,
        "button",
        styles.text +
          ";border:0;background:transparent;padding:4px 0;cursor:pointer;display:inline-flex;align-items:center;gap:6px",
        "Retour",
      ),
      "previous",
    );
    back.setAttribute("type", "button");
    const icon = node(doc, "i", "font-size:16px");
    icon.className = "ph ph-arrow-left";
    icon.setAttribute("aria-hidden", "true");
    back.prepend(icon);
    row.append(back);
  }
  if (ref !== "B8") {
    const next = button(
      doc,
      ref === "B11" && completed
        ? "Accéder aux analyses de l’agent"
        : "Suivant",
      primaryAction,
    );
    next.setAttribute("data-onboarding-primary", "");
    row.append(next);
  }
  if (ref === "B5" || ref === "B6") {
    const skip = action(
      node(
        doc,
        "button",
        styles.text +
          ";font-size:12px;border:0;background:transparent;padding:4px 0;cursor:pointer",
        ref === "B5" ? "Continuer sans page" : "Continuer sans pixel",
      ),
      ref === "B5" ? "skip-pages" : "skip-pixels",
    );
    skip.setAttribute("type", "button");
    row.append(skip);
  }
  main.append(row);
}
export function onboardingStep(ref: string, section?: string) {
  if (ref === "B7")
    return [
      "review",
      "market",
      "audience",
      "funnel",
      "history",
      "offer",
    ].includes(section || "")
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
        B8: 6,
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
    "Votre site web",
    "Analyse de votre activité",
    "Votre entreprise",
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
            "Site web",
            "Analyse",
            "Entreprise",
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
            data.connection?.connection_status === "connected" &&
              data.connection?.token_checked_at
              ? "connected"
              : "connect",
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
            "Aucune page accessible chargée pour ce Business Manager. Vous pouvez continuer sans page et la connecter plus tard dans les paramètres.",
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
        `${pages.length} page(s) accessible(s) pour le Business Manager sélectionné. Vous pouvez en choisir plusieurs ou les connecter plus tard.`,
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
    if (["B7", "B8", "B9"].includes(ref)) {
      leaf(frame, "Enregistré · 62 % rempli")?.parentElement?.remove();
      leaf(
        frame,
        "78 % rempli · 4 informations manquantes",
      )?.parentElement?.remove();
      const h = frame.querySelector("h1");
      const title = h.parentElement;
      const main = title.parentElement;
      const stepLabel = h.previousElementSibling?.cloneNode(true);
      title.replaceChildren(
        ...(stepLabel ? [stepLabel] : []),
        h,
        node(doc, "p", styles.text),
      );
      for (const child of [...main.children])
        if (child !== title) child.remove();
      if (ref !== "B8")
        for (const child of [...main.parentElement.children])
          if (child !== main) child.remove();
      // Remove the maquette's duplicate sticky footer; navigation is rendered once.
      for (const el of all(frame, "[data-onboarding-action]"))
        if (
          !main.contains(el) &&
          ["next", "recap", "brain", "previous"].includes(
            el.getAttribute("data-onboarding-action"),
          )
        )
          el.remove();
      const values = state.brain.activity || {};
      const analysis = data.jobs.find(
        (j: any) => j.id === state.analysis_job_id,
      );
      const textAction = (label: string, act: string) =>
        action(
          node(
            doc,
            "button",
            styles.text +
              ";border:0;background:transparent;padding:4px 0;cursor:pointer;align-self:flex-start",
            label,
          ),
          act,
        );
      if (ref === "B7" && step === 5) {
        intro(
          frame,
          "Faisons connaissance avec votre entreprise",
          "Ajoutez le lien de votre site web ou de votre page de vente. Nous analyserons son contenu pour préremplir les informations que vous pourrez ensuite modifier.",
        );
        const box = card(doc, "Votre site web ou page de vente");
        const input = node(doc, "input", styles.input + ";margin-top:14px");
        input.setAttribute("type", "url");
        input.setAttribute(
          "aria-label",
          "Lien du site web ou de la page de vente",
        );
        input.setAttribute("placeholder", "https://votre-site.com");
        input.setAttribute("data-website-url", "");
        input.setAttribute("maxlength", "2048");
        input.setAttribute("value", values.website || "");
        box.append(
          input,
          node(doc, "p", styles.small, "Analyse incluse · 0 crédit"),
        );
        main.append(box);
      } else if (ref === "B8") {
        intro(
          frame,
          "Nous essayons de comprendre votre activité.",
          "Nous lisons votre site et préparons vos informations. Vous pourrez les vérifier et les modifier à l’étape suivante.",
        );
        const wait = card(doc, "Analyse de votre site");
        wait.setAttribute("data-analysis-panel", "");
        const message = node(
          doc,
          "p",
          styles.text,
          analysis?.status === "succeeded"
            ? "Analyse terminée. Ouverture de vos informations…"
            : "Lecture et compréhension du contenu en cours…",
        );
        message.setAttribute("data-analysis-message", "");
        message.setAttribute("role", "status");
        message.setAttribute("aria-live", "polite");
        const progress = node(
          doc,
          "progress",
          "width:100%;accent-color:#B44A26",
        );
        progress.setAttribute("aria-label", "Analyse du site en cours");
        wait.append(
          node(
            doc,
            "div",
            styles.small,
            values.website || "Aucun lien enregistré",
          ),
          progress,
          message,
        );
        main.append(wait);
        const recovery = node(doc, "div", styles.stack);
        recovery.setAttribute("data-analysis-recovery", "");
        recovery.hidden = true;
        recovery.append(
          button(doc, "Suivant", "retry-analysis"),
          textAction("Modifier le lien", "website"),
          textAction("Compléter manuellement", "manual-profile"),
        );
        main.append(recovery);
      } else {
        const review = ref === "B9";
        intro(
          frame,
          review
            ? "Vérifiez les informations de votre entreprise"
            : "Voici ce que nous avons compris de votre activité",
          review
            ? "Vérifiez vos informations avant de confirmer et de choisir votre plan."
            : "Vous pouvez modifier chaque champ directement. Les informations absentes du site restent à compléter.",
        );
        const form = node(
          doc,
          "div",
          styles.card + ";" + styles.stack + ";gap:20px",
        );
        for (const [key, label] of Object.entries(profileFields)) {
          const wrap = node(doc, "label", styles.stack + ";gap:7px");
          wrap.append(
            node(
              doc,
              "span",
              styles.title + ";font-size:14px",
              key === "name" ? `${label} (obligatoire)` : label,
            ),
          );
          if (key === "price")
            wrap.append(
              node(
                doc,
                "span",
                styles.text + ";font-size:12px",
                "Laisser vide si vous vendez plusieurs produits",
              ),
            );
          const input = node(
            doc,
            [
              "description",
              "benefits",
              "problem",
              "products",
              "audience",
            ].includes(key)
              ? "textarea"
              : "input",
            styles.input,
          );
          input.setAttribute("data-section", "activity");
          input.setAttribute("data-field", key);
          input.setAttribute("aria-label", label);
          input.setAttribute("maxlength", key === "name" ? "200" : "4000");
          if (key === "name") input.setAttribute("required", "");
          if (input.tagName === "TEXTAREA") {
            input.setAttribute("rows", "3");
            input.textContent = values[key] || "";
          } else input.setAttribute("value", values[key] || "");
          if (key === "price")
            input.setAttribute("placeholder", "Montant et devise");
          wrap.append(input);
          const source = state.provenance?.activity_fields?.[key];
          const sourceLabel = node(
            doc,
            "span",
            styles.small,
            !values[key]?.trim()
              ? "À remplir par vous"
              : source?.source === "inferred"
                ? "Déduit du site · à vérifier"
                : source?.source === "site"
                  ? "Extrait du site · à vérifier"
                  : "Saisi par vous",
          );
          sourceLabel.setAttribute("data-field-source", key);
          wrap.append(sourceLabel);
          form.append(wrap);
        }
        main.append(
          form,
          textAction("Modifier le lien et relancer l’analyse", "website"),
        );
        if (review) {
          const assets = card(doc, "Ressources sélectionnées");
          assets.append(
            node(
              doc,
              "div",
              styles.text,
              resource("business", state.business_meta_id)?.source_data.name ||
                "Business Manager non sélectionné",
            ),
            ...selectedAccounts.map((a: any) =>
              node(doc, "div", styles.text, a.name),
            ),
            ...(state.pages_skipped
              ? [
                  node(
                    doc,
                    "div",
                    styles.text,
                    "Page Facebook : à connecter plus tard",
                  ),
                ]
              : []),
            ...state.page_ids.map((id: string) =>
              node(
                doc,
                "div",
                styles.text,
                "Page : " +
                  (resource("page", id)?.source_data.name || "Indisponible"),
              ),
            ),
            node(
              doc,
              "div",
              styles.text,
              state.pixels_skipped
                ? "Sans pixel sélectionné"
                : state.pixels
                    .map(
                      (p: any) =>
                        resource("pixel", p.pixel_id)?.source_data.name ||
                        "Pixel indisponible",
                    )
                    .join(", "),
            ),
          );
          main.append(assets);
        }
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
        ...(state.pages_skipped
          ? [
              node(
                doc,
                "div",
                styles.text,
                "Page Facebook : à connecter plus tard",
              ),
            ]
          : []),
        ...(state.pixels_skipped
          ? [node(doc, "div", styles.text, "Pixel : à connecter plus tard")]
          : []),
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
        button(
          doc,
          state.completed_at
            ? "Accéder aux analyses de l’agent"
            : "Reprendre ma configuration",
          state.completed_at ? "dashboard" : "resume",
        ),
      );
    }
    const errorBox = node(
      doc,
      "div",
      styles.text +
        ";background:#FFF4F2;border:1px solid #E9B8AE;border-radius:10px;padding:14px 18px;color:#9C3424",
    );
    errorBox.setAttribute("data-onboarding-error", "");
    errorBox.setAttribute("role", "alert");
    errorBox.setAttribute("tabindex", "-1");
    errorBox.hidden = true;
    frame.querySelector("h1")?.parentElement?.after(errorBox);
    navigation(frame, ref, !!state.completed_at, step);
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
