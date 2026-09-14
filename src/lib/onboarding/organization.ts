import { parseHTML } from "linkedom";
type Organization = { id: string; name: string };
export function canSwitchOrganization(organizations: Organization[]) {
  return new Set(organizations.map((org) => org.id)).size >= 2;
}
export function renderOrganization(
  html: string,
  ref: string,
  current: Organization,
  organizations: Organization[],
) {
  const doc = parseHTML(html).document;
  const canSwitch = canSwitchOrganization(organizations);
  const norm = (v: string) => v.replace(/\s+/g, " ").trim();
  for (const frame of doc.querySelectorAll("[data-source-width]")) {
    for (const label of frame.querySelectorAll("div,span"))
      if (
        !label.children.length &&
        norm(label.textContent) === "Kola Distribution"
      ) {
        label.textContent = current.name;
        label.setAttribute("data-company-name", "");
        const card = label.parentElement?.parentElement;
        if (card?.getAttribute("style")?.includes("border-radius:12px")) {
          card.setAttribute("data-company-picker", "");
          card.setAttribute("role", "button");
          card.setAttribute("tabindex", "0");
          const avatar = card.firstElementChild;
          if (avatar?.textContent.trim() === "KD")
            avatar.textContent = current.name.slice(0, 2).toUpperCase();
        }
      }
    for (const avatar of frame.querySelectorAll("div,span"))
      if (!avatar.children.length && avatar.textContent.trim() === "KD") {
        avatar.textContent = current.name.slice(0, 2).toUpperCase();
        avatar.setAttribute("aria-label", current.name);
        avatar.setAttribute("title", current.name);
        avatar.setAttribute("data-company-picker", "");
        avatar.setAttribute("role", "button");
        avatar.setAttribute("tabindex", "0");
      }
    if (ref === "C1.1" && !frame.querySelector("[data-company-name]")) {
      const heading = [...frame.querySelectorAll("div,span,h1")]
        .filter(
          (e) =>
            !e.children.length && norm(e.textContent) === "Tableau de bord",
        )
        .at(-1);
      if (heading) {
        const label = doc.createElement("span");
        label.textContent = current.name;
        label.setAttribute("data-company-name", "");
        label.setAttribute(
          "style",
          "font:500 12px 'Figtree',sans-serif;color:#6E6862",
        );
        heading.parentElement!.append(label);
      }
    }
    if (ref === "C1.2") {
      const search = [...frame.querySelectorAll("div,span")].find(
        (e) =>
          !e.children.length &&
          e.textContent.startsWith("Rechercher un compte"),
      );
      if (!search) continue;
      const mobile = frame.getAttribute("data-source-width") === "375";
      let panel: any = search;
      for (let i = 0; i < (mobile ? 3 : 4); i++) panel = panel.parentElement;
      const header = doc.createElement("div");
      header.setAttribute(
        "style",
        "padding:18px;border-bottom:1px solid #E8E3D9;font:700 16px 'Figtree',sans-serif",
      );
      header.textContent = "Choisir une entreprise";
      const filter = doc.createElement("input");
      filter.setAttribute("aria-label", "Rechercher une entreprise");
      filter.setAttribute("placeholder", "Rechercher une entreprise");
      filter.setAttribute("data-company-search", "");
      filter.setAttribute(
        "style",
        "margin-top:12px;padding:12px;width:100%;box-sizing:border-box;border:1px solid #D6CFC2;border-radius:10px;font:400 14px 'Figtree',sans-serif",
      );
      header.append(filter);
      const list = doc.createElement("div");
      list.setAttribute("style", "overflow:auto;flex:1");
      for (const org of organizations) {
        const row = doc.createElement("button");
        row.setAttribute("type", "button");
        row.setAttribute("data-company-id", org.id);
        row.setAttribute("aria-pressed", String(org.id === current.id));
        row.setAttribute(
          "style",
          `width:100%;text-align:left;padding:18px;border:0;border-bottom:1px solid #E8E3D9;background:${org.id === current.id ? "#FDF5F1" : "#FFFFFF"};color:#1B1916;font:700 14px 'Figtree',sans-serif;cursor:pointer`,
        );
        row.textContent = org.name;
        list.append(row);
      }
      panel.replaceChildren(header, list);
      for (const script of doc.querySelectorAll('script[type="text/x-dc"]'))
        script.remove();
    }
  }
  if (!canSwitch) {
    for (const picker of doc.querySelectorAll("[data-company-picker]")) {
      picker.removeAttribute("role");
      picker.removeAttribute("tabindex");
      picker.setAttribute("data-company-static", "");
      picker.removeAttribute("data-company-picker");
      picker.setAttribute(
        "style",
        `${picker.getAttribute("style") || ""};cursor:default`,
      );
      picker.querySelector(".ph-caret-up-down")?.remove();
    }
  }
  for (const icon of doc.querySelectorAll("i.ph-bell")) {
    const bell = icon.parentElement!;
    bell.removeAttribute("data-dashboard-action");
    bell.setAttribute("data-notification-bell", "");
    bell.setAttribute("role", "button");
    bell.setAttribute("tabindex", "0");
    bell.setAttribute("aria-label", "Notifications");
    bell.setAttribute("aria-haspopup", "dialog");
    for (const child of [...bell.children]) if (child !== icon) child.remove();
  }
  const notificationStyle = doc.createElement("link");
  notificationStyle.rel = "stylesheet";
  notificationStyle.href = "/source/notifications.css";
  doc.head.append(notificationStyle);
  const notificationScript = doc.createElement("script");
  notificationScript.src = "/source/notifications.js";
  notificationScript.defer = true;
  doc.body.append(notificationScript);
  const context = doc.createElement("script");
  context.type = "application/json";
  context.id = "company-context";
  context.textContent = JSON.stringify({ current, canSwitch }).replaceAll(
    "<",
    "\\u003c",
  );
  doc.body.append(context);
  const script = doc.createElement("script");
  script.src = "/source/organization.js";
  script.defer = true;
  doc.body.append(script);
  return doc.toString();
}
