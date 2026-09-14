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
    alertPoll: null,
    jobs: [],
    context: null,
    alertRows: [],
    alertError: null,
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
  const connectionProblem = () => state.context?.connectionIssues?.[0];
  function loadedMessage() {
    if (connectionProblem()) return connectionProblem().message;
    if (!state.ids?.length)
      return "Connectez un compte publicitaire pour afficher ses données.";
    if (!state.data.kpis)
      return "Les métriques n’ont pas pu être chargées. Utilisez Réessayer dans les zones concernées.";
    if (!state.data.kpis.rows.some((row) => row.bucket === "current"))
      return "Aucune métrique importée pour cette période. Vérifiez le compte et les dates sélectionnés, puis lancez une synchronisation.";
    return "Données du tableau de bord chargées · cliquez sur Synchronisé pour lancer une nouvelle synchronisation.";
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
    if (zone === "alerts") {
      state.alertError = {
        id: "alerts-unavailable",
        kind: "technical",
        severity: "medium",
        title: "Impossible de charger les alertes",
        message: err.message,
      };
      renderAlerts();
      return;
    }
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
      connectionProblem()
        ? "Reconnecter Meta"
        : state.busy
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
      e.setAttribute(
        "aria-disabled",
        String(!connectionProblem() && (state.busy || !!pending.length)),
      );
      e.setAttribute(
        "data-sync-active",
        String(state.busy || !!pending.length),
      );
      e.title = c.freshness.accounts
        .map(
          (a) =>
            `${c.accounts.find((x) => x.id === a.id)?.name || ""} : ${a.lastSynchronizedAt ? new Date(a.lastSynchronizedAt).toLocaleString("fr-FR") : "jamais synchronisé"}`,
        )
        .join("\n");
    });
  }
  function syncProgress() {
    const active = state.jobs.filter((j) =>
      ["queued", "running"].includes(j.status),
    );
    const failed = state.jobs.filter((j) =>
      ["failed", "cancelled"].includes(j.status),
    );
    const shown = [...active, ...failed];
    all("[data-sync-progress]").forEach((panel) => {
      panel.hidden = !shown.length && !state.busy;
      panel.dataset.syncState =
        failed.length && !active.length ? "failed" : "running";
      if (panel.hidden) return;
      const heading =
        active.length || state.busy
          ? "Synchronisation Meta en cours"
          : "Synchronisation interrompue";
      panel.innerHTML =
        `<div class="dashboard-sync-heading"><i class="ph ph-arrows-clockwise" aria-hidden="true"></i><strong>${heading}</strong></div>` +
        (active.length
          ? "<p>Les données apparaissent au fur et à mesure. L’import continue en arrière-plan ; les chiffres et comparaisons peuvent encore être incomplets.</p>"
          : "") +
        shown
          .map((j) => {
            const p = j.result?.sync_progress;
            const name =
              state.accounts.find((a) => a.id === j.ad_account_id)?.name ||
              "Compte publicitaire";
            if (["failed", "cancelled"].includes(j.status))
              return `<p><strong>${esc(name)}</strong> — ${connectionProblem() ? esc(connectionProblem().message) : "L’import n’a pas pu se terminer. Les données déjà reçues sont conservées. Relancez-le avec le bouton Synchroniser."}</p>`;
            const phase =
              {
                campaigns: "Campagnes",
                adsets: "Ensembles de publicités",
                ads: "Publicités et créatives",
                metrics: "Performances et répartitions",
              }[p?.phase] || "Préparation de l’import";
            const known =
              Number.isInteger(p?.total_slices) && p.total_slices > 0;
            const completed = known
              ? Math.min(p.total_slices, p.completed_slices || 0)
              : 0;
            return `<div class="dashboard-sync-account"><strong>${esc(name)}</strong><span>${phase} · ${number(j.progress_done || 0)} éléments traités${known ? ` · ${completed}/${p.total_slices} lots terminés` : ""}</span><progress aria-label="Progression de l’import de ${esc(name)}" ${known ? `value="${completed}" max="${p.total_slices}"` : ""}></progress></div>`;
          })
          .join("");
    });
  }
  const syncFingerprint = () =>
    state.jobs
      .map((j) =>
        [
          j.id,
          j.status,
          j.progress_done,
          j.updated_at,
          j.result?.sync_progress?.published_at,
        ].join(":"),
      )
      .join(",");
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
    syncProgress();
    return c;
  }
  function kpis(data) {
    const current = data.rows.find((r) => r.bucket === "current"),
      previous = data.rows.find((r) => r.bucket === "previous");
    for (const key of Object.keys(labels)) {
      text(`[data-metric="${key}"]`, fmt(current?.[key], key, data.currency));
      let note =
        connectionProblem()?.message || "Aucune donnée sur cette période";
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
  const alertStyles = {
    critical: { label: "Critique", symbol: "▼", rank: 0 },
    high: { label: "Élevée", symbol: "◆", rank: 1 },
    medium: { label: "Moyenne", symbol: "●", rank: 2 },
    recommendation: { label: "Recommandation", symbol: "✦", rank: 3 },
  };
  function alertTone(row) {
    return Object.hasOwn(alertStyles, row.severity)
      ? row.severity
      : row.kind === "recommendation"
        ? "recommendation"
        : "medium";
  }
  function alertCard(row) {
    const tone = alertTone(row),
      style = alertStyles[tone];
    const action =
      row.kind === "connection"
        ? '<a class="dashboard-alert-action dashboard-alert-primary" href="/configuration/meta">Reconnecter Meta</a>'
        : row.id === "alerts-unavailable"
          ? '<button type="button" class="dashboard-alert-action" data-retry-zone="alerts">Réessayer</button>'
          : `<button type="button" class="dashboard-alert-action" data-dashboard-action="alert-detail" data-alert-id="${esc(row.id)}" data-alert-kind="${esc(row.kind)}">${row.kind === "performance" ? "Voir l’analyse" : row.kind === "recommendation" ? "Voir la recommandation" : "Voir le détail"}</button>`;
    return `<article class="dashboard-alert-card" data-alert-tone="${tone}" data-alert-kind="${esc(row.kind)}"><span class="dashboard-alert-badge"><span aria-hidden="true">${style.symbol}</span> ${style.label}</span><div class="dashboard-alert-copy"><h3>${esc(row.title)}</h3><p>${esc(row.message)}</p></div>${action}<i class="ph ph-caret-right dashboard-alert-chevron" aria-hidden="true"></i></article>`;
  }
  function renderAlerts() {
    const alerts = state.data.alerts;
    // Delivery statuses are never a source for this view. Only qualified
    // performance results, technical issues and agent recommendations belong here.
    const rows = [
      ...(alerts?.rows || []).filter(
        (r) =>
          ["connection", "technical", "recommendation"].includes(r.kind) ||
          (r.kind === "performance" && r.sufficientData === true),
      ),
      ...(state.data.recommendations?.rows || []).map((r) => ({
        ...r,
        kind: "recommendation",
      })),
      ...(state.alertError ? [state.alertError] : []),
    ];
    const seen = new Set();
    state.alertRows = rows
      .filter((r) => {
        const key = `${r.kind}:${r.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort(
        (a, b) =>
          alertStyles[alertTone(a)].rank - alertStyles[alertTone(b)].rank ||
          (Number(b.priority) || 0) - (Number(a.priority) || 0),
      );
    all("[data-dashboard-alerts]").forEach((section) => {
      section.hidden = !state.alertRows.length;
      section.querySelector("[data-alert-count]").textContent = String(
        state.alertRows.length,
      );
      const content = section.querySelector('[data-zone="alerts"]');
      content.innerHTML = state.alertRows.map(alertCard).join("");
      content.setAttribute("aria-busy", "false");
    });
    text(
      "[data-alert-status]",
      [
        alerts?.message,
        alerts?.needsTargets
          ? "Renseignez vos cibles CPA et ROAS pour activer les alertes correspondantes."
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
  }
  function alertDetail(id, kind) {
    const row = state.alertRows.find(
      (r) => String(r.id) === id && r.kind === kind,
    );
    if (!row) return;
    const account = state.accounts.find((a) => a.id === row.account_id);
    const source =
      row.kind === "performance"
        ? "Analyse de performance Lyads"
        : row.kind === "recommendation"
          ? "Agent Lyads"
          : "Diagnostic technique Lyads";
    const d = dialog(
      `<form method="dialog"><h2 id="dashboard-alert-title">${esc(row.title)}</h2><p class="dashboard-note">${esc(source)}${account ? ` · ${esc(account.name)} (${esc(account.currency)})` : ""}</p><p>${esc(row.message)}</p>${row.since && row.until ? `<p class="dashboard-note">Période analysée : ${esc(row.since)} – ${esc(row.until)}</p>` : ""}<div class="dashboard-period-actions">${row.kind === "performance" ? '<button type="button" data-edit-thresholds>Régler les seuils</button>' : ""}<button type="submit">Fermer</button></div></form>`,
    );
    d.classList.add("dashboard-period-dialog");
    d.setAttribute("aria-labelledby", "dashboard-alert-title");
    d.querySelector("[data-edit-thresholds]")?.addEventListener("click", () => {
      d.close();
      alertSettingsDialog();
    });
  }
  function renderZone(zone, data) {
    if (zone === "kpis") {
      kpis(data);
      return;
    }
    let html = "";
    if (zone === "series") html = seriesHtml(data);
    else if (zone === "alerts" || zone === "recommendations") {
      renderAlerts();
      if (zone === "alerts") return;
      const rows = state.alertRows.filter((r) => r.kind === "recommendation");
      html = rows.length
        ? rows.map(alertCard).join("")
        : `<p>${esc(data.message)}</p>`;
      text("[data-recommendation-count]", rows.length || "");
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
      if (data.rows.length)
        html += `<p class="dashboard-note">${zone === "creatives" ? "Publicités classées par dépense." : zone === "campaigns" ? "Campagnes classées par dépense (50 maximum)." : "Répartition des dépenses remontées par Meta."}</p>`;
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
      if (zone === "alerts") state.alertError = null;
      renderZone(zone, data);
      if (zone === "alerts") {
        clearTimeout(state.alertPoll);
        if (data.pending)
          state.alertPoll = setTimeout(() => {
            if (epoch === state.epoch) loadZone("alerts", epoch);
          }, 4000);
      }
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
        const old = syncFingerprint();
        const c = await context(epoch);
        if (!c) return;
        const changed = old !== syncFingerprint();
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
          if (!failed && !pending) message(loadedMessage());
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
    state.alertError = null;
    state.alertRows = [];
    all("[data-dashboard-alerts]").forEach((section) => {
      section.hidden = true;
    });
    text("[data-alert-status]", "");
    clearTimeout(state.alertPoll);
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
      message(loadedMessage());
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
    if (connectionProblem()) {
      message(connectionProblem().message);
      location.assign("/configuration/meta");
      return;
    }
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
    syncProgress();
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
      `<form><h2 id="dashboard-period-title">Choisir la période</h2><label>Raccourci<select name="preset"><option value="">Personnalisée</option><option value="today">Aujourd’hui</option><option value="yesterday">Hier</option><option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="90">90 derniers jours</option></select></label><div class="dashboard-period-dates"><label>Du<input type="date" name="since" value="${state.since}" max="${accountToday()}" required></label><label>Au<input type="date" name="until" value="${state.until}" max="${accountToday()}" required></label></div><p class="dashboard-note" role="alert"></p><div class="dashboard-period-actions"><button type="button" data-close>Annuler</button><button type="submit">Appliquer</button></div></form>`,
    );
    d.classList.add("dashboard-period-dialog");
    d.setAttribute("aria-labelledby", "dashboard-period-title");
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
  async function alertSettingsDialog() {
    const accounts = state.accounts.filter((a) => state.ids.includes(a.id));
    if (!accounts.length) return;
    const d = dialog(
      `<form><h2>Seuils des alertes</h2><label>Compte publicitaire<select name="account">${accounts.map((a) => `<option value="${esc(a.id)}">${esc(a.name)} (${esc(a.currency)})</option>`).join("")}</select></label><p class="dashboard-note">Les cibles CPA et ROAS sont facultatives. Les autres détecteurs fonctionnent sans cible. CPA et achats utilisent les conversions « purchase » de Meta.</p><div data-alert-fields></div><p role="alert"></p><div class="dashboard-period-actions"><button type="button" data-close>Annuler</button><button type="submit" disabled>Enregistrer</button></div></form>`,
    );
    d.classList.add("dashboard-period-dialog");
    const form = d.querySelector("form"),
      account = form.elements.namedItem("account"),
      save = d.querySelector('[type="submit"]');
    let fields = {},
      generation = 0;
    const load = async () => {
      const request = ++generation;
      save.disabled = true;
      d.querySelector("[data-alert-fields]").textContent = "Chargement…";
      d.querySelector('[role="alert"]').textContent = "";
      try {
        const data = await api(`/api/accounts/${account.value}/alert-settings`);
        if (request !== generation) return;
        fields = data.fields;
        d.querySelector("[data-alert-fields]").innerHTML = Object.entries(
          fields,
        )
          .map(
            ([key, field]) =>
              `<label>${esc(field.label)}${["target_cpa", "min_spend"].includes(key) ? ` (${esc(data.currency)})` : ""}<input name="${esc(key)}" type="number" min="${field.min}" max="${field.max}" step="${field.integer ? "1" : "any"}" value="${esc(data.settings[key] ?? "")}" ${field.value === null ? "" : "required"} ${data.canEdit ? "" : "disabled"}></label>`,
          )
          .join("");
        save.disabled = !data.canEdit;
        if (!data.canEdit)
          d.querySelector('[role="alert"]').textContent =
            "Seuls les membres autorisés à modifier ce compte peuvent changer ses seuils.";
      } catch (error) {
        if (request === generation)
          d.querySelector('[role="alert"]').textContent = error.message;
      }
    };
    account.onchange = load;
    d.querySelector("[data-close]").onclick = () => d.close();
    form.onsubmit = async (event) => {
      event.preventDefault();
      save.disabled = true;
      account.disabled = true;
      try {
        const values = Object.fromEntries(
          Object.keys(fields).map((key) => [
            key,
            form.elements.namedItem(key).value === ""
              ? null
              : Number(form.elements.namedItem(key).value),
          ]),
        );
        await api(`/api/accounts/${account.value}/alert-settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        d.close();
        await loadZone("alerts");
      } catch (error) {
        d.querySelector('[role="alert"]').textContent = error.message;
        save.disabled = false;
        account.disabled = false;
      }
    };
    await load();
  }
  function action(name, el) {
    if (name === "sync") sync();
    else if (name === "period") periodDialog();
    else if (name === "alert-settings") alertSettingsDialog();
    else if (name === "alert-detail")
      alertDetail(el.dataset.alertId, el.dataset.alertKind);
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
