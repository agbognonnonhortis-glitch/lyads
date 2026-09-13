(() => {
  const config = JSON.parse(
    document.getElementById("dashboard-context").textContent,
  );
  const paths = JSON.parse(
    document.getElementById("source-config").textContent,
  ).paths;
  const all = (s) => [...document.querySelectorAll(s)],
    text = (s, v) => all(s).forEach((e) => (e.textContent = v));
  const state = {
    ids: null,
    accounts: [],
    since: "",
    until: "",
    epoch: 0,
    metric: "spend",
    data: {},
    busy: false,
    poll: null,
    jobs: [],
    context: null,
  };
  const labels = {
    spend: "Dépense",
    impressions: "Impressions",
    clicks: "Clics",
    cpc: "CPC",
    cpa: "CPA (achats)",
    roas: "ROAS",
  };
  function accountToday() {
    const timezone =
      state.accounts.find((a) => state.ids?.includes(a.id))?.timezone_name ||
      "UTC";
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const part = (type) => parts.find((p) => p.type === type).value;
    return `${part("year")}-${part("month")}-${part("day")}`;
  }
  const shift = (date, n) =>
    new Date(Date.parse(date) + n * 86400000).toISOString().slice(0, 10);
  const esc = (v) =>
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
  const number = (v) =>
    v == null
      ? "—"
      : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(
          Number(v),
        );
  const monetary = (key) => ["spend", "cpa", "cpc"].includes(key);
  const fmt = (value, key, currency) => {
    if (value == null) return "—";
    if (!monetary(key)) return number(value);
    if (!/^[A-Z]{3}$/.test(currency || "")) return "—";
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      currencyDisplay: "code",
    }).format(Number(value));
  };
  function message(value) {
    text("[data-dashboard-status]", value);
  }
  function params() {
    return new URLSearchParams({
      organization: config.organization,
      ...(state.ids?.length ? { accounts: state.ids.join(",") } : {}),
      since: state.since,
      until: state.until,
    });
  }
  async function api(url, options = {}) {
    let r, d;
    try {
      r = await fetch(url, { cache: "no-store", ...options });
      d = await r.json();
    } catch {
      throw new Error(
        "Connexion au serveur interrompue. Vérifiez votre connexion et réessayez.",
      );
    }
    if (!r.ok) {
      const err = new Error(
        d.error?.message || "Réessayez dans quelques instants.",
      );
      err.code = d.error?.code;
      throw err;
    }
    return d;
  }
  const endpoint = (z) => "/api/dashboard/" + z + "?" + params();
  function errorBox(zone, err) {
    all(`[data-zone="${zone}"]`).forEach((el) => {
      el.innerHTML = `<p>${esc(err.message)}</p><button type="button" data-retry-zone="${zone}">Réessayer</button>`;
    });
    if (zone === "kpis") {
      text("[data-metric]", "—");
      text("[data-metric-note]", err.message);
      all("[data-kpi]").forEach((el) => el.setAttribute("aria-busy", "false"));
    }
  }
  function persist() {
    const url = new URL(location.href);
    url.searchParams.set("accounts", state.ids.join(","));
    url.searchParams.set("since", state.since);
    url.searchParams.set("until", state.until);
    history.replaceState(null, "", url);
  }
  function syncLabel() {
    const c = state.context;
    if (!c) return;
    const pending = state.jobs.filter((j) =>
      ["queued", "running"].includes(j.status),
    );
    const at = c.freshness.lastSynchronizedAt;
    const minutes = at
      ? Math.max(0, Math.floor((Date.now() - Date.parse(at)) / 60000))
      : null;
    text(
      "[data-sync-label]",
      state.busy
        ? "Synchronisation…"
        : pending.length
          ? `Synchronisation en cours (${pending.length})`
          : at
            ? `Synchronisé ${minutes < 1 ? "à l’instant" : minutes < 60 ? "il y a " + minutes + " min" : "le " + new Date(at).toLocaleDateString("fr-FR")}`
            : "Synchroniser",
    );
    text(
      "[data-sync-date]",
      at
        ? new Date(at).toLocaleString("fr-FR") + " · source Meta"
        : "Aucune synchronisation complète",
    );
    all('[data-dashboard-action="sync"]').forEach((e) => {
      e.setAttribute("aria-disabled", String(state.busy || !!pending.length));
      e.title = c.freshness.accounts
        .map(
          (a) =>
            `${c.accounts.find((x) => x.id === a.id)?.name || ""} : ${a.lastSynchronizedAt ? new Date(a.lastSynchronizedAt).toLocaleString("fr-FR") : "jamais synchronisé"}`,
        )
        .join("\n");
    });
  }
  async function context(epoch) {
    const c = await api(endpoint("context"));
    if (epoch !== state.epoch) return null;
    state.context = c;
    state.accounts = c.accounts;
    state.ids = c.selected;
    // Only the latest job for each account controls the sync state.
    state.jobs = c.selected
      .map((id) => c.jobs.find((j) => j.ad_account_id === id))
      .filter(Boolean);
    if (!state.since) {
      state.until = accountToday();
      state.since = shift(state.until, -6);
    }
    all("[data-dashboard-accounts]").forEach((select) => {
      select.innerHTML = c.accounts
        .map(
          (a) =>
            `<option value="${esc(a.id)}" ${state.ids.includes(a.id) ? "selected" : ""}>${esc(a.name)} (${esc(a.currency)})</option>`,
        )
        .join("");
      select.size = Math.min(3, Math.max(1, c.accounts.length));
    });
    text("[data-credit-balance]", number(c.credits?.available));
    text(
      "[data-account-currency]",
      [
        ...new Set(
          c.accounts
            .filter((a) => state.ids.includes(a.id))
            .map((a) => a.currency),
        ),
      ].join(" / "),
    );
    syncLabel();
    return c;
  }
  function kpis(data) {
    const current = data.rows.find((r) => r.bucket === "current"),
      previous = data.rows.find((r) => r.bucket === "previous");
    for (const key of Object.keys(labels)) {
      text(`[data-metric="${key}"]`, fmt(current?.[key], key, data.currency));
      let note = "Aucune donnée sur cette période";
      if (current?.[key] != null) {
        note =
          previous?.[key] != null && Number(previous[key]) !== 0
            ? `${number((Number(current[key]) / Number(previous[key]) - 1) * 100)} % par rapport à la période précédente`
            : "Comparaison indisponible";
        if (["cpa", "roas"].includes(key)) note += " · achats";
      } else if (["cpa", "roas"].includes(key) && current)
        note = "Achats ou valeur des achats indisponibles";
      if (current && current.accounts_count < state.ids.length)
        note +=
          " · données partielles : " +
          current.accounts_count +
          "/" +
          state.ids.length +
          " comptes";
      text(`[data-metric-note="${key}"]`, note);
    }
    all("[data-kpi]").forEach((e) => e.setAttribute("aria-busy", "false"));
  }
  function seriesHtml(data) {
    const key = state.metric,
      period = data.period;
    const rows = data.rows;
    const days = period.days;
    const pairs = Array.from({ length: days }, (_, i) => {
      const date = shift(period.since, i),
        previousDate = shift(period.previousSince, i);
      return {
        date,
        previousDate,
        current: rows.find((r) => r.bucket === date)?.[key] ?? null,
        previous: rows.find((r) => r.bucket === previousDate)?.[key] ?? null,
      };
    });
    if (!pairs.some((p) => p.current !== null || p.previous !== null))
      return "<p>Aucune donnée disponible pour cette métrique sur les périodes sélectionnées.</p>";
    const maximum = Math.max(
      1,
      ...pairs.flatMap((p) => [
        Number(p.current) || 0,
        Number(p.previous) || 0,
      ]),
    );
    const x = (i) => 45 + (days === 1 ? 0 : (i * 650) / (days - 1)),
      y = (v) => 225 - (Number(v) / maximum) * 190;
    const path = (field) => {
      let started = false;
      return pairs
        .map((p, i) => {
          if (p[field] === null) {
            started = false;
            return "";
          }
          const command = started ? "L" : "M";
          started = true;
          return `${command}${x(i)},${y(p[field])}`;
        })
        .join(" ");
    };
    return `<p class="dashboard-note">${esc(period.since)} – ${esc(period.until)} · comparaison ${esc(period.previousSince)} – ${esc(period.previousUntil)}</p><svg class="dashboard-graph" viewBox="0 0 730 255" role="img" aria-label="${esc(labels[key])} : période sélectionnée et période précédente"><text x="4" y="28" fill="#6e6862" font-size="11">${esc(fmt(maximum, key, data.currency))}</text><text x="20" y="230" fill="#6e6862" font-size="11">0</text><path d="M45 30V225H710" fill="none" stroke="#e8e3d9"/><path d="${path("previous")}" fill="none" stroke="#a9a196" stroke-width="2" stroke-dasharray="6 5"/><path d="${path("current")}" fill="none" stroke="#b44a26" stroke-width="3"/>${pairs.map((p, i) => (p.current === null ? "" : `<circle cx="${x(i)}" cy="${y(p.current)}" r="4" fill="#b44a26"><title>${esc(p.date + " : " + fmt(p.current, key, data.currency) + " ; précédente : " + fmt(p.previous, key, data.currency))}</title></circle>`)).join("")}</svg><p class="dashboard-note">Orange : période sélectionnée · pointillés : période précédente. Les jours sans données restent vides.</p><details><summary>Voir les valeurs par jour</summary><div class="dashboard-table-wrap"><table><thead><tr><th>Date</th><th>${esc(labels[key])}</th><th>Période précédente</th></tr></thead><tbody>${pairs.map((p) => `<tr><td>${p.date}</td><td>${esc(fmt(p.current, key, data.currency))}</td><td>${esc(fmt(p.previous, key, data.currency))}</td></tr>`).join("")}</tbody></table></div></details>`;
  }
  function renderZone(zone, data) {
    if (zone === "kpis") {
      kpis(data);
      return;
    }
    let html = "";
    if (zone === "series") html = seriesHtml(data);
    else if (zone === "alerts" || zone === "recommendations") {
      html = data.rows.length
        ? data.rows
            .map(
              (r) =>
                `<details class="dashboard-row"><summary>${esc(r.title)}</summary><p>${esc(r.message)}</p>${r.kind === "connection" ? `<a href="${paths["C11.2"]}">Reconnecter Meta</a>` : ""}</details>`,
            )
            .join("")
        : "<p>" +
          (zone === "alerts"
            ? data.freshness?.complete
              ? "Aucune alerte de diffusion remontée."
              : "Synchronisez vos comptes pour connaître les alertes de diffusion."
            : esc(data.message)) +
          "</p>";
      if (zone === "alerts")
        html += `<p class="dashboard-note">${esc(data.message)}</p>`;
      text("[data-recommendation-count]", "");
    } else {
      const total = data.rows.reduce((sum, r) => sum + Number(r.spend || 0), 0);
      html = data.rows.length
        ? data.rows
            .map(
              (r) =>
                `<details class="dashboard-row"><summary>${esc(r.name || r.bucket)}</summary>${zone === "creatives" && /^https:\/\//.test(r.thumbnail || "") ? `<a href="${esc(r.thumbnail)}" target="_blank" rel="noopener noreferrer"><img src="${esc(r.thumbnail)}" alt="${esc(r.name)}" loading="lazy"></a>` : ""}<dl>${Object.keys(
                  labels,
                )
                  .map(
                    (key) =>
                      `<dt>${esc(labels[key])}</dt><dd>${esc(fmt(r[key], key, r.currency))}</dd>`,
                  )
                  .join(
                    "",
                  )}</dl></details><div class="dashboard-bar" title="Part de dépense parmi les résultats affichés"><span style="width:${total ? (Number(r.spend || 0) / total) * 100 : 0}%"></span></div>`,
            )
            .join("")
        : "<p>Aucune donnée disponible pour cette période.</p>";
      html += `<p class="dashboard-note">${zone === "creatives" ? "Cinq publicités avec les dépenses les plus élevées. Aucun classement de rentabilité sans seuil configuré." : zone === "campaigns" ? "Campagnes classées par dépense (50 maximum)." : "Répartition des dépenses remontées par Meta."}</p>`;
    }
    all(`[data-zone="${zone}"]`).forEach((el) => {
      el.innerHTML = html;
      el.setAttribute("aria-busy", "false");
    });
  }
  async function loadZone(zone, epoch = state.epoch) {
    try {
      const data = await api(endpoint(zone));
      if (epoch !== state.epoch) return;
      state.data[zone] = data;
      renderZone(zone, data);
    } catch (err) {
      if (epoch === state.epoch) errorBox(zone, err);
    }
  }
  function schedulePoll() {
    clearTimeout(state.poll);
    if (!state.jobs.some((j) => ["queued", "running"].includes(j.status)))
      return;
    state.poll = setTimeout(async () => {
      const epoch = state.epoch;
      try {
        const old = state.jobs.map((j) => j.id + ":" + j.status).join(",");
        const c = await context(epoch);
        if (!c) return;
        const changed =
          old !== state.jobs.map((j) => j.id + ":" + j.status).join(",");
        if (changed) {
          const failed = state.jobs.some((j) =>
            ["failed", "cancelled"].includes(j.status),
          );
          const pending = state.jobs.some((j) =>
            ["queued", "running"].includes(j.status),
          );
          message(
            failed
              ? "La synchronisation a échoué. Les dernières données réussies sont conservées. Réessayez ou vérifiez votre connexion Meta."
              : pending
                ? "Synchronisation en cours…"
                : "Synchronisation terminée. Actualisation des données…",
          );
          await loadWidgets(epoch);
          if (epoch !== state.epoch) return;
          if (!failed && !pending)
            message("Données du tableau de bord actualisées.");
        }
        schedulePoll();
      } catch (err) {
        if (epoch === state.epoch) {
          message(
            err.message + " Nouvelle vérification dans quelques secondes.",
          );
          state.poll = setTimeout(() => schedulePoll(), 5000);
        }
      }
    }, 4000);
  }
  async function loadWidgets(epoch) {
    await Promise.all(
      [
        "kpis",
        "series",
        "campaigns",
        "placements",
        "creatives",
        "alerts",
        "recommendations",
      ].map((z) => loadZone(z, epoch)),
    );
  }
  async function refresh() {
    const epoch = ++state.epoch;
    clearTimeout(state.poll);
    state.data = {};
    text("[data-metric]", "—");
    text("[data-metric-note]", "Chargement…");
    all("[data-zone]").forEach((e) => {
      e.textContent = "Chargement…";
      e.setAttribute("aria-busy", "true");
    });
    message("Chargement des données…");
    try {
      const c = await context(epoch);
      if (!c) return;
      persist();
      text(
        "[data-period-label]",
        `${Math.round((Date.parse(state.until) - Date.parse(state.since)) / 86400000) + 1} jours`,
      );
      all("[data-period-label]").forEach(
        (e) => (e.title = state.since + " – " + state.until),
      );
      await loadWidgets(epoch);
      if (epoch !== state.epoch) return;
      message(
        state.ids.length
          ? "Données enregistrées dans Meta · cliquez sur Synchronisé pour lancer une nouvelle synchronisation."
          : "Connectez un compte publicitaire pour afficher ses données.",
      );
      schedulePoll();
    } catch (err) {
      if (epoch !== state.epoch) return;
      message(err.message);
      for (const z of [
        "kpis",
        "series",
        "campaigns",
        "placements",
        "creatives",
        "alerts",
        "recommendations",
      ])
        errorBox(z, err);
    }
  }
  async function sync() {
    if (
      state.busy ||
      state.jobs.some((j) => ["queued", "running"].includes(j.status))
    )
      return;
    if (!state.ids?.length) {
      message("Connectez un compte publicitaire avant de synchroniser.");
      return;
    }
    state.busy = true;
    syncLabel();
    const epoch = state.epoch;
    const ids = [...state.ids];
    message("Demande de synchronisation envoyée à Meta…");
    const results = await Promise.allSettled(
      ids.map((id) =>
        api(`/api/accounts/${id}/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestKey: crypto.randomUUID() }),
        }),
      ),
    );
    state.busy = false;
    if (epoch !== state.epoch) {
      syncLabel();
      return;
    }
    const errors = results
      .filter((r) => r.status === "rejected")
      .map((r) => r.reason.message);
    await refresh();
    message(
      errors.length
        ? errors.join(" ")
        : "Synchronisation en cours. Les cartes se mettront à jour automatiquement à la fin.",
    );
    syncLabel();
  }
  function dialog(html) {
    const d = document.createElement("dialog");
    d.className = "dashboard-dialog";
    d.innerHTML = html;
    document.body.append(d);
    d.addEventListener("close", () => d.remove());
    d.showModal();
    return d;
  }
  function periodDialog() {
    const d = dialog(
      `<form><strong>Choisir la période</strong><label>Raccourci<select name="preset"><option value="">Personnalisée</option><option value="today">Aujourd’hui</option><option value="yesterday">Hier</option><option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="90">90 derniers jours</option></select></label><label>Du<input type="date" name="since" value="${state.since}" max="${accountToday()}" required></label><label>Au<input type="date" name="until" value="${state.until}" max="${accountToday()}" required></label><p class="dashboard-note" role="alert"></p><button type="submit">Appliquer</button><button type="button" data-close>Annuler</button></form>`,
    );
    const f = d.querySelector("form");
    f.elements.namedItem("preset").addEventListener("change", () => {
      const preset = f.elements.namedItem("preset").value;
      if (!preset) return;
      const today = accountToday();
      f.elements.namedItem("until").value =
        preset === "yesterday" ? shift(today, -1) : today;
      f.elements.namedItem("since").value = ["today", "yesterday"].includes(
        preset,
      )
        ? f.elements.namedItem("until").value
        : shift(today, 1 - Number(preset));
    });
    d.querySelector("[data-close]").onclick = () => d.close();
    f.onsubmit = (e) => {
      e.preventDefault();
      const days =
        (Date.parse(f.elements.namedItem("until").value) -
          Date.parse(f.elements.namedItem("since").value)) /
          86400000 +
        1;
      if (!Number.isFinite(days) || days < 1 || days > 90) {
        d.querySelector("[role=alert]").textContent =
          "Choisissez une période de 1 à 90 jours.";
        return;
      }
      state.since = f.elements.namedItem("since").value;
      state.until = f.elements.namedItem("until").value;
      d.close();
      refresh();
    };
  }
  function action(name, el) {
    if (name === "sync") sync();
    else if (name === "period") periodDialog();
    else if (name === "credits") location.assign(paths["C11.4"]);
    else if (name === "chart" || name === "alerts")
      el.closest("[data-source-width]")
        .querySelector(
          `[data-zone="${name === "chart" ? "series" : "alerts"}"]`,
        )
        ?.scrollIntoView({ behavior: "smooth" });
    else if (name === "campaigns" || name === "placements") {
      const card = el.closest("[data-mobile-breakdowns]");
      card.querySelector("[data-zone]").dataset.zone = name;
      card
        .querySelectorAll("button")
        .forEach((b) =>
          b.setAttribute(
            "aria-pressed",
            String(b.dataset.dashboardAction === name),
          ),
        );
      state.data[name] ? renderZone(name, state.data[name]) : loadZone(name);
    } else if (name === "help") {
      const d = dialog(
        '<form method="dialog"><strong>Votre tableau de bord</strong><p>Sélectionnez les comptes et la période. Le bouton Synchronisé lance un import Meta en arrière-plan ; la date représente le dernier import réussi. Les tirets indiquent des données indisponibles. Les ratios CPA et ROAS reposent sur les achats retournés par Meta.</p><button>Fermer</button></form>',
      );
    } else if (name === "sidebar") {
      const sidebar = el.closest("[data-source-width]").firstElementChild
        .firstElementChild;
      sidebar.style.width = sidebar.style.width === "80px" ? "240px" : "80px";
      sidebar.style.flexBasis = sidebar.style.width;
      sidebar.style.overflow = "hidden";
    }
  }
  document.addEventListener(
    "click",
    (e) => {
      const button = e.target.closest(
        "[data-dashboard-action],[data-dashboard-metric],[data-retry-zone]",
      );
      if (!button) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (button.dataset.dashboardMetric) {
        state.metric = button.dataset.dashboardMetric;
        all("[data-dashboard-metric]").forEach((b) =>
          b.setAttribute(
            "aria-pressed",
            String(b.dataset.dashboardMetric === state.metric),
          ),
        );
        if (state.data.series) renderZone("series", state.data.series);
      } else if (button.dataset.retryZone) {
        if (!state.context) refresh();
        else loadZone(button.dataset.retryZone);
      } else action(button.dataset.dashboardAction, button);
    },
    true,
  );
  document.addEventListener("keydown", (e) => {
    if (
      (e.key === "Enter" || e.key === " ") &&
      e.target.matches("[data-dashboard-action]")
    ) {
      e.preventDefault();
      e.target.click();
    }
  });
  document.addEventListener("change", (e) => {
    if (!e.target.matches("[data-dashboard-accounts]")) return;
    const ids = [...e.target.selectedOptions].map((o) => o.value);
    if (!ids.length) {
      message("Sélectionnez au moins un compte publicitaire.");
      e.target
        .querySelectorAll("option")
        .forEach((o) => (o.selected = state.ids.includes(o.value)));
      return;
    }
    state.ids = ids;
    refresh();
  });
  const q = new URL(location.href).searchParams;
  if (q.get("accounts")) state.ids = q.get("accounts").split(",");
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(q.get("since") || "") &&
    /^\d{4}-\d{2}-\d{2}$/.test(q.get("until") || "")
  ) {
    state.since = q.get("since");
    state.until = q.get("until");
  }
  setInterval(syncLabel, 60000);
  refresh();
})();
