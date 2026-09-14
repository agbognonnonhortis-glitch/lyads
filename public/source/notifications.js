(() => {
  const config = document.getElementById("company-context");
  if (!config) return;
  const organization = JSON.parse(config.textContent).current.id;
  let panel = null,
    trigger = null,
    unread = null,
    page = 0,
    asOf = null,
    epoch = 0,
    loading = false,
    mutating = false;
  const escape = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const types = {
    "meta.reconnect": ["Connexion Meta", "/configuration/meta"],
    "website.complete": [
      "Analyse du site terminée",
      "/configuration/entreprise?section=review",
    ],
    "job.failed": ["Traitement interrompu", null],
    "sync.complete": ["Synchronisation terminée", "/app/tableau-de-bord"],
    "sync.failed": ["Synchronisation interrompue", "/app/tableau-de-bord"],
    "website.failed": [
      "Analyse du site interrompue",
      "/configuration/entreprise?section=review",
    ],
  };
  function bells() {
    return [...document.querySelectorAll("[data-notification-bell]")];
  }
  function bind() {
    for (const icon of document.querySelectorAll("i.ph-bell")) {
      const bell = icon.parentElement;
      if (!bell || bell.hasAttribute("data-notification-ready")) continue;
      bell.dataset.notificationReady = "";
      bell.dataset.notificationBell = "";
      bell.removeAttribute("data-dashboard-action");
      bell.removeAttribute("data-source-go");
      bell.setAttribute("role", "button");
      bell.tabIndex = 0;
      bell.setAttribute("aria-haspopup", "dialog");
      bell.style.position = "relative";
      for (const child of [...bell.children])
        if (child !== icon) child.remove();
      const badge = document.createElement("span");
      badge.className = "notification-badge";
      badge.hidden = true;
      badge.setAttribute("aria-hidden", "true");
      bell.append(badge);
    }
    updateBadges();
  }
  function updateBadges() {
    for (const bell of bells()) {
      const badge = bell.querySelector(".notification-badge");
      if (badge) {
        const value =
          unread === null ? "" : unread > 99 ? "99+" : String(unread);
        if (badge.textContent !== value) badge.textContent = value;
        if (badge.hidden !== !unread) badge.hidden = !unread;
      }
      const label =
        unread === null
          ? "Notifications"
          : `Notifications, ${unread} non lue${unread === 1 ? "" : "s"}`;
      if (bell.getAttribute("aria-label") !== label)
        bell.setAttribute("aria-label", label);
    }
  }
  async function request(url, options = {}) {
    let response, data;
    try {
      response = await fetch(url, { cache: "no-store", ...options });
      data = await response.json();
    } catch {
      throw new Error(
        "Notifications indisponibles. Vérifiez votre connexion et réessayez.",
      );
    }
    if (!response.ok)
      throw new Error(
        data.error?.message ||
          "Impossible de charger les notifications. Réessayez.",
      );
    return data;
  }
  function url(countOnly = false) {
    const q = new URLSearchParams({ organization, page: String(page) });
    if (countOnly) q.set("countOnly", "1");
    else if (asOf) q.set("asOf", asOf);
    return "/api/notifications?" + q;
  }
  function status(message, error = false) {
    if (!panel) return;
    const el = panel.querySelector("[data-notification-status]");
    el.textContent = message;
    el.classList.toggle("notification-error", error);
  }
  async function count() {
    if (panel || document.visibilityState === "hidden") return;
    const ticket = epoch;
    try {
      const data = await request(url(true));
      if (ticket !== epoch || panel) return;
      unread = data.unreadCount;
      updateBadges();
    } catch {
      if (ticket !== epoch || panel) return;
      unread = null;
      updateBadges();
    }
  }
  function render(data) {
    if (!panel) return;
    const list = panel.querySelector("ul");
    list.innerHTML = data.notifications
      .map((n) => {
        const [title, href] = types[n.kind] || ["Notification", null];
        return `<li data-unread="${!n.read_at}"><h3>${escape(title)}</h3><p>${escape(n.message)}</p><time datetime="${escape(n.created_at)}">${escape(new Date(n.created_at).toLocaleString("fr-FR"))}</time>${!n.read_at ? `<button type="button" data-mark-notification="${escape(n.id)}">Marquer comme lue</button>` : "<span>Lu</span>"}${href ? `<a href="${escape(href)}">Voir</a>` : ""}</li>`;
      })
      .join("");
    panel.querySelector("[data-notification-prev]").disabled = page === 0;
    panel.querySelector("[data-notification-next]").disabled = !data.hasMore;
    panel.querySelector("[data-notification-all]").disabled = !data.unreadCount;
    status(
      data.notifications.length ? "" : "Aucune notification pour le moment.",
    );
  }
  async function load() {
    if (!panel) return;
    const ticket = ++epoch;
    loading = true;
    status("Chargement…");
    try {
      const data = await request(url());
      if (ticket !== epoch || !panel) return;
      asOf = data.asOf;
      unread = data.unreadCount;
      updateBadges();
      render(data);
    } catch (error) {
      if (ticket === epoch && panel) status(error.message, true);
    } finally {
      if (ticket === epoch) loading = false;
    }
  }
  function close() {
    if (panel) panel.close();
  }
  function open(bell) {
    if (panel) {
      close();
      return;
    }
    trigger = bell;
    page = 0;
    asOf = null;
    panel = document.createElement("dialog");
    panel.className = "notification-panel";
    panel.setAttribute("aria-labelledby", "notification-title");
    panel.innerHTML =
      '<header><h2 id="notification-title">Notifications</h2><button type="button" data-notification-close aria-label="Fermer les notifications">✕</button></header><div class="notification-controls"><button type="button" data-notification-refresh>Actualiser</button><button type="button" data-notification-all disabled>Tout marquer comme lu</button></div><p class="notification-status" data-notification-status role="status"></p><ul class="notification-items"></ul><div class="notification-footer"><button type="button" data-notification-prev disabled>Précédent</button><button type="button" data-notification-next disabled>Suivant</button></div>';
    document.body.append(panel);
    panel.addEventListener("close", () => {
      epoch++;
      panel.remove();
      panel = null;
      loading = false;
      trigger?.focus();
      count();
    });
    panel.addEventListener("click", (e) => {
      if (e.target === panel) {
        const rect = panel.getBoundingClientRect();
        if (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        )
          close();
      }
    });
    panel.showModal();
    load();
  }
  async function mark(ids, all = false) {
    if (mutating || loading || !panel) return;
    mutating = true;
    const activePanel = panel;
    const navigation = [
      ...panel.querySelectorAll(
        "[data-notification-prev],[data-notification-next]",
      ),
    ].map((b) => [b, b.disabled]);
    activePanel.querySelectorAll("button").forEach((b) => {
      if (!b.hasAttribute("data-notification-close")) b.disabled = true;
    });
    try {
      await request("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization,
          ...(all ? { all: true, asOf } : { ids }),
        }),
      });
      if (panel === activePanel) await load();
    } catch (error) {
      if (panel === activePanel) status(error.message, true);
    } finally {
      mutating = false;
      if (panel === activePanel) {
        for (const [button, disabled] of navigation) button.disabled = disabled;
        panel.querySelector("[data-notification-refresh]").disabled = false;
        panel
          .querySelectorAll("[data-mark-notification]")
          .forEach((b) => (b.disabled = false));
        panel.querySelector("[data-notification-all]").disabled = !unread;
      }
    }
  }
  window.addEventListener(
    "click",
    (e) => {
      if (!(e.target instanceof Element)) return;
      const bell = e.target.closest("[data-notification-bell]");
      if (bell) {
        e.preventDefault();
        e.stopImmediatePropagation();
        open(bell);
        return;
      }
      if (!panel || !panel.contains(e.target)) return;
      const b = e.target.closest("button");
      if (!b) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (b.hasAttribute("data-notification-close")) close();
      else if (b.hasAttribute("data-notification-refresh")) {
        asOf = null;
        page = 0;
        load();
      } else if (b.hasAttribute("data-notification-all")) mark([], true);
      else if (b.dataset.markNotification) mark([b.dataset.markNotification]);
      else if (
        !loading &&
        !mutating &&
        (b.hasAttribute("data-notification-prev") ||
          b.hasAttribute("data-notification-next"))
      ) {
        page += b.hasAttribute("data-notification-prev") ? -1 : 1;
        load();
      }
    },
    true,
  );
  document.addEventListener("keydown", (e) => {
    if (
      (e.key === "Enter" || e.key === " ") &&
      e.target.matches("[data-notification-bell]")
    ) {
      e.preventDefault();
      open(e.target);
    }
  });
  let scheduled = false;
  new MutationObserver(() => {
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        bind();
      });
    }
  }).observe(document.body, { childList: true, subtree: true });
  bind();
  count();
  setInterval(count, 30000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") count();
  });
})();
