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
    campaign: "",
    adset: "",
    campaigns: [],
    adSets: [],
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
      ...(state.campaign ? { campaign: state.campaign } : {}),
      ...(state.adset ? { adset: state.adset } : {}),
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
    for (const key of ["campaign", "adset"]) {
      if (state[key]) url.searchParams.set(key, state[key]);
      else url.searchParams.delete(key);
    }
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
  function renderScopePicker(kind, rows, emptyLabel) {
    const selected = rows.find((r) => r.id === state[kind]);
    const dot = (row) =>
      `<span class="dashboard-status-dot ${row.effective_status === "ACTIVE" ? "is-active" : ""}" aria-label="${row.effective_status === "ACTIVE" ? "Active" : "Inactive"}"></span>`;
    all(`[data-scope-label="${kind}"]`).forEach((el) => {
      el.innerHTML = selected
        ? `${dot(selected)}<span class="dashboard-filter-value">${esc(selected.name)}</span>`
        : `<span class="dashboard-filter-value">${esc(emptyLabel)}</span>`;
      el.setAttribute(
        "aria-disabled",
        String(kind === "adset" && !state.campaign),
      );
    });
    all(`[data-scope-picker="${kind}"]`).forEach((picker, index) => {
      if (kind === "adset" && !state.campaign) picker.open = false;
      picker.querySelector(`[data-scope-search]`).value = "";
      picker.querySelector(`[data-scope-options]`).innerHTML =
        `<label><input type="radio" name="${kind}-${index}" data-scope-choice="${kind}" value="" ${!state[kind] ? "checked" : ""}>${esc(emptyLabel)}</label>` +
        rows
          .map(
            (row) =>
              `<label data-scope-row><input type="radio" name="${kind}-${index}" data-scope-choice="${kind}" value="${esc(row.id)}" ${state[kind] === row.id ? "checked" : ""}>${dot(row)}<span>${esc(row.name)}</span></label>`,
          )
          .join("") +
        (!rows.length
          ? `<p class="dashboard-note">${kind === "adset" && !state.campaign ? "Sélectionnez une campagne." : "Aucun élément importé pour cette sélection."}</p>`
          : "");
    });
  }
  async function context(epoch) {
    const c = await api(endpoint("context"));
    if (epoch !== state.epoch) return null;
    state.context = c;
    state.accounts = c.accounts;
    state.ids = c.selected;
    state.campaigns = c.campaigns || [];
    state.adSets = c.adSets || [];
    renderScopePicker("campaign", state.campaigns, "Toutes les campagnes");
    renderScopePicker("adset", state.adSets, "Tous les ensembles");
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
    text(
      "[data-account-picker-label]",
      c.accounts
        .filter((a) => state.ids.includes(a.id))
        .map((a) => `${a.name} (${a.currency})`)
        .join(", ") || "Choisir un compte publicitaire",
    );
    all("[data-account-picker-options]").forEach((el) => {
      el.innerHTML = c.accounts
        .map(
          (a) =>
            `<label><input type="checkbox" data-account-choice value="${esc(a.id)}" ${state.ids.includes(a.id) ? "checked" : ""}>${esc(a.name)} (${esc(a.currency)})</label>`,
        )
        .join("");
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
  const shortDate = (date) =>
    new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(date));
  function targetFor(row = {}) {
    const targets = state.context?.targets || [];
    const id =
      row.ad_account_id ||
      state.campaigns.find((c) => c.id === row.bucket)?.ad_account_id;
    if (id) return targets.find((t) => t.ad_account_id === id) || {};
    const selected = state.ids.map(
      (id) => targets.find((t) => t.ad_account_id === id) || {},
    );
    return Object.fromEntries(
      ["target_roas", "target_cpa", "target_cpl", "target_cpr"].map((key) => [
        key,
        selected.length &&
        selected.every((t) => t[key] != null && t[key] === selected[0][key])
          ? selected[0][key]
          : null,
      ]),
    );
  }
  function performance(row) {
    const target = targetFor(row),
      event = row.result_event || "purchase";
    const costTarget =
      event === "purchase"
        ? target.target_cpa
        : ["lead", "complete_registration"].includes(event)
          ? target.target_cpl
          : target.target_cpr;
    const cost = row.cost_per_result ?? row.cpa;
    const checks = [];
    if (event === "purchase" && target.target_roas != null && row.roas != null)
      checks.push(Number(row.roas) >= Number(target.target_roas));
    if (costTarget != null && cost != null)
      checks.push(Number(cost) <= Number(costTarget));
    return checks.length ? (checks.every(Boolean) ? "good" : "bad") : "neutral";
  }
  function kpis(data) {
    const current = data.rows.find((r) => r.bucket === "current"),
      previous = data.rows.find((r) => r.bucket === "previous");
    for (const key of Object.keys(labels)) {
      text(`[data-metric="${key}"]`, fmt(current?.[key], key, data.currency));
      const delta =
        current?.[key] != null &&
        previous?.[key] != null &&
        Number(previous[key]) !== 0
          ? (Number(current[key]) / Number(previous[key]) - 1) * 100
          : null;
      const tone =
        delta === null ||
        ["spend", "impressions", "clicks"].includes(key) ||
        delta === 0
          ? "neutral"
          : (["cpc", "cpa"].includes(key) ? delta < 0 : delta > 0)
            ? "good"
            : "bad";
      all(`[data-kpi-trend="${key}"]`).forEach((el) => {
        el.dataset.tone = tone;
        el.textContent =
          delta === null
            ? ""
            : `${delta >= 0 ? "▲" : "▼"} ${number(Math.abs(delta))} %`;
      });
      let note =
        current?.[key] == null
          ? connectionProblem()?.message || "Aucune donnée sur cette période"
          : delta === null
            ? "Comparaison indisponible"
            : ["cpa", "roas"].includes(key)
              ? "Achats"
              : `${fmt(current[key], key, data.currency)} exact`;
      const target = targetFor();
      if (key === "cpa" && current?.cpa != null && target.target_cpa != null)
        note = `Cible ${fmt(target.target_cpa, "cpa", data.currency)}`;
      if (key === "roas" && current?.roas != null && target.target_roas != null)
        note = `Cible ${number(target.target_roas)}`;
      if (current && current.accounts_count < state.ids.length)
        note += " · données partielles";
      text(`[data-metric-note="${key}"]`, note);
    }
    all("[data-kpi]").forEach((el) => el.setAttribute("aria-busy", "false"));
    renderSparks();
  }
  function renderSparks() {
    const data = state.data.series;
    if (!data) return;
    const rows = Array.from({ length: data.period.days }, (_, i) =>
      data.rows.find((r) => r.bucket === shift(data.period.since, i)),
    );
    all("[data-kpi-spark]").forEach((el) => {
      el.dataset.tone =
        el.parentElement.querySelector("[data-kpi-trend]")?.dataset.tone ||
        "neutral";
      const key = el.dataset.kpiSpark,
        max = Math.max(0.000001, ...rows.map((r) => Number(r?.[key]) || 0));
      el.innerHTML = rows
        .map(
          (r) =>
            `<span style="height:${r?.[key] == null ? 0 : Math.max(3, (Number(r[key]) / max) * 100)}%;opacity:${r?.[key] == null ? 0 : 0.3 + (Number(r[key]) / max) * 0.7}" title="${esc(r ? `${shortDate(r.bucket)} : ${fmt(r[key], key, data.currency)}` : "Donnée indisponible")}"></span>`,
        )
        .join("");
    });
  }
  function seriesHtml(data) {
    const key = state.metric,
      period = data.period,
      days = period.days;
    const pairs = Array.from({ length: days }, (_, i) => ({
      date: shift(period.since, i),
      previousDate: shift(period.previousSince, i),
      current:
        data.rows.find((r) => r.bucket === shift(period.since, i))?.[key] ??
        null,
      previous:
        data.rows.find((r) => r.bucket === shift(period.previousSince, i))?.[
          key
        ] ?? null,
    }));
    if (!pairs.some((p) => p.current !== null || p.previous !== null))
      return "<p>Aucune donnée disponible pour cette métrique sur les périodes sélectionnées.</p>";
    const maximum = Math.max(
      1,
      ...pairs.flatMap((p) => [
        Number(p.current) || 0,
        Number(p.previous) || 0,
      ]),
    );
    const x = (i) => 54 + (days === 1 ? 500 : (i * 1000) / (days - 1)),
      y = (v) => 230 - (Number(v) / maximum) * 190;
    const path = (field) => {
      let started = false;
      return pairs
        .map((p, i) => {
          if (p[field] === null) {
            started = false;
            return "";
          }
          const c = started ? "L" : "M";
          started = true;
          return `${c}${x(i)},${y(p[field])}`;
        })
        .join(" ");
    };
    const values = pairs.filter((p) => p.current !== null),
      complete = values.length === days;
    const additive = ["spend", "clicks", "impressions"].includes(key);
    const total =
      complete && additive
        ? values.reduce((s, p) => s + Number(p.current), 0)
        : null;
    // Ratios are weighted using the period totals returned by the API, never added.
    const aggregate = additive
      ? total
      : (state.data.kpis?.rows.find((r) => r.bucket === "current")?.[key] ??
        null);
    const avg = complete
      ? values.reduce((sum, p) => sum + Number(p.current), 0) / days
      : null;
    const peak = values.reduce(
      (best, p) =>
        !best || Number(p.current) > Number(best.current) ? p : best,
      null,
    );
    const labelStep = Math.max(1, Math.ceil(days / 7));
    return `<div class="dashboard-chart-legend"><span><i></i>${esc(period.since)} – ${esc(period.until)}</span><span><i></i>${esc(period.previousSince)} – ${esc(period.previousUntil)}</span></div><div class="dashboard-chart-wrap"><svg class="dashboard-graph" viewBox="0 0 1080 270" role="img" aria-label="${esc(labels[key])} : période sélectionnée et période précédente">${Array.from(
      { length: 5 },
      (_, i) => {
        const v = (maximum * i) / 4;
        return `<line x1="54" x2="1054" y1="${y(v)}" y2="${y(v)}" stroke="#E8E3D9" stroke-width="0.6"/><text x="0" y="${y(v) + 4}" fill="#6E6862" font-size="11">${esc(new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(v))}</text>`;
      },
    ).join(
      "",
    )}<path d="${path("previous")}" fill="none" stroke="#A9A196" stroke-width="2" stroke-dasharray="6 5"/><path d="${path("current")}" fill="none" stroke="#B44A26" stroke-width="2.5"/>${pairs.map((p, i) => `${i % labelStep === 0 || i === days - 1 ? `<text x="${x(i)}" y="254" text-anchor="middle" fill="#6E6862" font-size="11">${esc(shortDate(p.date))}</text>` : ""}${p.previous !== null ? `<circle cx="${x(i)}" cy="${y(p.previous)}" r="2.5" fill="#A9A196"/>` : ""}${p.current !== null ? `<circle cx="${x(i)}" cy="${y(p.current)}" r="3.5" fill="#B44A26"/>` : ""}<rect data-chart-point="${i}" x="${Math.max(40, x(i) - Math.max(8, 500 / days))}" y="25" width="${Math.max(16, 1000 / days)}" height="210" fill="transparent" tabindex="0" aria-label="${esc(shortDate(p.date) + ": " + fmt(p.current, key, data.currency))}"><title>${esc(p.date + " : " + fmt(p.current, key, data.currency) + " ; précédente : " + fmt(p.previous, key, data.currency))}</title></rect>`).join("")}</svg><div class="dashboard-chart-tooltip" role="tooltip" hidden></div></div><div class="dashboard-chart-footer"><div><span>${additive ? "Total période" : `${esc(labels[key])} sur la période`}</span><strong>${esc(fmt(aggregate, key, data.currency))}</strong></div><div><span>Moyenne / jour</span><strong>${esc(fmt(avg, key, data.currency))}</strong></div><div><span>Jour le plus élevé${!complete ? " · données disponibles" : ""}</span><strong>${peak ? `${esc(fmt(peak.current, key, data.currency))} · ${esc(shortDate(peak.date))}` : "—"}</strong></div></div>`;
  }
  function bindChart() {
    const data = state.data.series;
    if (!data) return;
    all("[data-chart-point]").forEach((el) => {
      const show = () => {
        const i = Number(el.dataset.chartPoint),
          date = shift(data.period.since, i),
          previousDate = shift(data.period.previousSince, i),
          current =
            data.rows.find((r) => r.bucket === date)?.[state.metric] ?? null,
          previous =
            data.rows.find((r) => r.bucket === previousDate)?.[state.metric] ??
            null;
        const delta =
          current !== null && previous !== null
            ? Number(current) - Number(previous)
            : null;
        const relative =
          delta !== null && Number(previous) !== 0
            ? (delta / Number(previous)) * 100
            : null;
        const tooltip = el
          .closest(".dashboard-chart-wrap")
          .querySelector("[role=tooltip]");
        tooltip.innerHTML = `<strong>${esc(shortDate(date))}</strong><span>Période : ${esc(fmt(current, state.metric, data.currency))}</span><span>Précédente : ${esc(fmt(previous, state.metric, data.currency))}</span><span>Écart : ${esc(fmt(delta, state.metric, data.currency))} · ${relative === null ? "—" : number(relative) + " %"}</span>`;
        tooltip.hidden = false;
      };
      const hide = () => {
        el
          .closest(".dashboard-chart-wrap")
          .querySelector("[role=tooltip]").hidden = true;
      };
      el.addEventListener("mouseenter", show);
      el.addEventListener("focus", show);
      el.addEventListener("mouseleave", hide);
      el.addEventListener("blur", hide);
    });
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
    return `<article class="dashboard-alert-card" data-alert-tone="${tone}" data-alert-kind="${esc(row.kind)}" data-seen="${state.seenAlerts?.has(`${row.kind}:${row.id}:${row.message}`) || false}"><span class="dashboard-alert-badge"><span aria-hidden="true">${style.symbol}</span> ${style.label}</span><div class="dashboard-alert-copy"><h3>${esc(row.title)}</h3><p>${esc(row.message)}</p></div>${action}<i class="ph ph-caret-right dashboard-alert-chevron" aria-hidden="true"></i></article>`;
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
          ? "Renseignez vos objectifs de ROAS et de coût par résultat pour activer les alertes et recommandations correspondantes."
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
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePreview();
  });
  const mediaRequests = new Map();
  function mediaMarkup(media, name) {
    if (!media.length)
      return '<p class="dashboard-note">Aperçu indisponible sur Meta.</p>';
    return media
      .map((m) => {
        const safe = (url) =>
          /^https:\/\//.test(url || "") &&
          !/[?&](access_token|appsecret_proof)=/i.test(url);
        if (m.type === "video")
          return `<div class="dashboard-video">${safe(m.url) ? `<video src="${esc(m.url)}" ${safe(m.poster) ? `poster="${esc(m.poster)}"` : ""} controls playsinline muted preload="none" aria-label="${esc(name)}"><p>Votre navigateur ne peut pas lire cette vidéo.</p></video><button type="button" class="dashboard-video-play" aria-label="Lire la vidéo ${esc(name)}">▶</button>` : `${safe(m.poster) ? `<img src="${esc(m.poster)}" alt="${esc(name)}" loading="lazy">` : ""}<p class="dashboard-note">Meta ne fournit pas de vidéo lisible pour cette publicité.</p>`}</div>`;
        return safe(m.url)
          ? `<a href="${esc(m.url)}" target="_blank" rel="noopener noreferrer"><img src="${esc(m.url)}" alt="${esc(name)}" loading="lazy"></a>`
          : "";
      })
      .join("");
  }
  function bindMedia(container) {
    container.querySelectorAll(".dashboard-video").forEach((box) => {
      const video = box.querySelector("video"),
        play = box.querySelector("button");
      if (!video || !play) return;
      let hovering = false,
        chosen = false;
      const start = async () => {
        try {
          await video.play();
          if ((!hovering && !chosen) || !box.closest("details")?.open)
            video.pause();
        } catch {
          play.hidden = false;
        }
      };
      box.addEventListener("mouseenter", () => {
        if (!chosen) {
          hovering = true;
          video.muted = true;
          start();
        }
      });
      box.addEventListener("mouseleave", () => {
        hovering = false;
        if (!chosen) video.pause();
      });
      play.addEventListener("click", () => {
        chosen = true;
        video.muted = false;
        start();
      });
      video.addEventListener("pointerdown", () => {
        chosen = true;
      });
      video.addEventListener("play", () => {
        play.hidden = true;
      });
      video.addEventListener("pause", () => {
        play.hidden = false;
      });
      video.addEventListener("ended", () => {
        chosen = false;
        play.hidden = false;
      });
      video.addEventListener("error", () => {
        play.hidden = true;
        if (!box.querySelector("[role=status]")) {
          const error = document.createElement("p");
          error.className = "dashboard-note";
          error.setAttribute("role", "status");
          error.textContent =
            "La vidéo n’est plus accessible. Rechargez la page pour réessayer.";
          box.append(error);
        }
      });
    });
  }
  async function loadMedia(row) {
    if (!mediaRequests.has(row.bucket)) {
      mediaRequests.set(
        row.bucket,
        (async () => {
          for (let attempt = 0; attempt < 60; attempt++) {
            const result = await api(
              `/api/ads/${encodeURIComponent(row.bucket)}/media`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "{}",
              },
            );
            if (result.status === "succeeded")
              return mediaMarkup(result.media, row.name || "Publicité");
            if (["failed", "cancelled"].includes(result.status))
              throw new Error(
                result.message ||
                  "Ce média est indisponible. Réessayez plus tard.",
              );
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
          throw new Error(
            "Le média est encore en préparation. Rechargez la page dans quelques instants.",
          );
        })().catch(
          (error) =>
            `<p class="dashboard-note" role="status">${esc(error.message)}</p>`,
        ),
      );
    }
    const html = await mediaRequests.get(row.bucket);
    all("[data-ad-media]")
      .filter((el) => el.dataset.adMedia === row.bucket)
      .forEach((el) => {
        if (el.dataset.mediaReady === "true" || !el.closest("details")?.open)
          return;
        el.innerHTML = html;
        el.dataset.mediaReady = "true";
        bindMedia(el);
      });
  }
  function rankedAdsHtml(data) {
    if (!data.rows.length)
      return "<p>Aucune publicité importée pour cette sélection.</p>";
    const onlyPurchases = data.rows.every((r) => r.result_event === "purchase");
    const table = `<div class="dashboard-ad-table-wrap"><table class="dashboard-ad-table"><thead><tr><th>Publicité</th><th>Dépense</th><th>${onlyPurchases ? "CPA" : "CPR"}</th><th>ROAS</th></tr></thead><tbody>${data.rows
      .map((r) => {
        const tone = performance(r),
          event = r.result_event;
        const eventLabel =
          {
            purchase: "Achat",
            lead: "Lead",
            complete_registration: "Inscription",
            add_to_cart: "Ajout au panier",
            initiate_checkout: "Paiement initié",
          }[event] || "Résultat";
        const safeThumb =
          /^https:\/\//.test(r.thumbnail || "") &&
          !/[?&](access_token|appsecret_proof)=/i.test(r.thumbnail);
        return `<tr data-best-ad="${esc(r.bucket)}"><td><button type="button" class="dashboard-ad-trigger" data-preview-ad="${esc(r.bucket)}" aria-label="Aperçu de ${esc(r.name)}"><span class="dashboard-ad-thumb">${safeThumb ? `<img src="${esc(r.thumbnail)}" alt="" loading="lazy">` : `<i class="ph ${r.media_type === "video" ? "ph-play-circle" : "ph-image"}" aria-hidden="true"></i>`}${r.media_type === "video" && safeThumb ? '<span class="dashboard-thumb-play">▶</span>' : ""}</span><span class="dashboard-ad-caption"><strong>${esc(r.name)}</strong><small>${r.media_type ? `${{ video: "Vidéo", image: "Image", carousel: "Carrousel" }[r.media_type]} · ` : ""}${esc(eventLabel)}${r.results != null ? " · " + number(r.results) + " résultat(s)" : ""}</small></span></button></td><td>${esc(fmt(r.spend, "spend", r.currency))}</td><td title="Coût par ${esc(eventLabel.toLowerCase())}">${esc(fmt(r.cost_per_result, "cpa", r.currency))}</td><td data-tone="${tone}">${esc(number(r.roas))}</td></tr>`;
      })
      .join("")}</tbody></table></div>`;
    return (
      table +
      (data.nextOffset != null
        ? '<button type="button" class="dashboard-more-ads" data-dashboard-action="more-ads">Afficher plus de publicités</button><p class="dashboard-note" data-more-ads-status role="status"></p>'
        : "")
    );
  }
  let preview = null,
    previewTimer = null;
  function closePreview() {
    clearTimeout(previewTimer);
    if (!preview) return;
    preview.box.querySelectorAll("video").forEach((v) => v.pause());
    preview.box.remove();
    preview = null;
  }
  function showPreview(row, trigger, pinned = false) {
    clearTimeout(previewTimer);
    if (preview?.id === row.bucket) {
      preview.pinned ||= pinned;
      return;
    }
    if (preview?.pinned && !pinned) return;
    closePreview();
    const box = document.createElement("details");
    box.open = true;
    box.className = "dashboard-ad-preview";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", `Aperçu de ${row.name}`);
    box.innerHTML = `<summary hidden>Aperçu</summary><div class="dashboard-preview-header"><strong>${esc(row.name)}</strong><button type="button" aria-label="Fermer l’aperçu">×</button></div><div class="dashboard-ad-media" data-ad-media="${esc(row.bucket)}"><p class="dashboard-note" role="status">Chargement du média…</p></div>`;
    document.body.append(box);
    const rect = trigger.getBoundingClientRect(),
      w = Math.min(440, window.innerWidth - 32);
    box.style.width = w + "px";
    box.style.left =
      Math.max(16, Math.min(rect.left + 68, window.innerWidth - w - 16)) + "px";
    box.style.top =
      Math.max(16, Math.min(rect.top, window.innerHeight - 520)) + "px";
    preview = { id: row.bucket, box, pinned };
    box.querySelector("button").onclick = () => {
      closePreview();
      trigger.focus();
    };
    box.addEventListener("mouseenter", () => clearTimeout(previewTimer));
    box.addEventListener("mouseleave", () => {
      if (!preview?.pinned)
        previewTimer = setTimeout(() => {
          if (!preview?.pinned) closePreview();
        }, 250);
    });
    box.addEventListener("pointerdown", () => {
      clearTimeout(previewTimer);
      if (preview) preview.pinned = true;
    });
    loadMedia(row);
  }
  function bindAdRows() {
    all("[data-preview-ad]").forEach((trigger) => {
      const row = state.data.creatives?.rows.find(
        (r) => r.bucket === trigger.dataset.previewAd,
      );
      if (!row) return;
      trigger.addEventListener("mouseenter", () => showPreview(row, trigger));
      trigger.addEventListener("mouseleave", () => {
        if (!preview?.pinned)
          previewTimer = setTimeout(() => {
            if (!preview?.pinned) closePreview();
          }, 250);
      });
      trigger.addEventListener("click", () => showPreview(row, trigger, true));
    });
  }
  function placementName(bucket) {
    const [platform, position] = (bucket || "").split(" / ");
    if (platform === "audience_network") return "Audience Network";
    const name = /reels/.test(position)
      ? "Reels"
      : /stor/.test(position)
        ? "Stories"
        : position === "feed"
          ? "Fil d’actualité"
          : {
              marketplace: "Marketplace",
              search: "Recherche",
              instream_video: "Vidéos intégrées",
              status: "Statut",
              facebook_profile_feed: "Fil de profil",
            }[position] ||
            position ||
            platform;
    return (
      name +
      " · " +
      ({ facebook: "Facebook", instagram: "Instagram", whatsapp: "WhatsApp" }[
        platform
      ] || platform)
    );
  }
  function groupedPlacements(rows) {
    const groups = new Map();
    for (const row of rows) {
      const [platform, position] = String(row.bucket || "").split(" / ");
      const name =
        platform === "audience_network"
          ? "Audience Network"
          : /reels/.test(position)
            ? "Reels"
            : /stor/.test(position)
              ? "Stories"
              : ["feed", "facebook_profile_feed"].includes(position)
                ? "Fil d’actualité"
                : "Autres placements";
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(row);
    }
    const colors = {
      "Fil d’actualité": "#B44A26",
      Reels: "#DE805C",
      Stories: "#EBAD91",
      "Audience Network": "#F3CDBB",
      "Autres placements": "#A9A196",
    };
    return [...groups.entries()]
      .map(([name, items]) => {
        const sum = (key) =>
          items.some((r) => r[key] != null)
            ? items.reduce((v, r) => v + Number(r[key] || 0), 0)
            : null;
        const spend = items.every((r) => r.spend != null) ? sum("spend") : null;
        const revenue = items.some(
          (r) => Number(r.purchases) > 0 && r.revenue == null,
        )
          ? null
          : sum("revenue");
        return {
          bucket: name,
          name,
          currency: items[0].currency,
          spend,
          revenue,
          roas: spend > 0 && revenue != null ? revenue / spend : null,
          color: colors[name],
          breakdown: items
            .map(
              (r) =>
                `${placementName(r.bucket)} : ${fmt(r.spend, "spend", r.currency)}`,
            )
            .join(" · "),
        };
      })
      .sort((a, b) => Number(b.spend) - Number(a.spend));
  }
  function breakdownHtml(zone, data) {
    if (!data.rows.length)
      return "<p>Aucune donnée disponible pour cette période.</p>";
    if (zone === "placements")
      data = { ...data, rows: groupedPlacements(data.rows) };
    const total = data.rows.reduce((sum, r) => sum + Number(r.spend || 0), 0);
    if (zone === "placements")
      return `<div class="dashboard-placement-stack" aria-label="Répartition de la dépense par placement">${data.rows.map((r, i) => `<span style="width:${total ? (Number(r.spend || 0) / total) * 100 : 0}%;background:${r.color}" title="${esc(r.name)} : ${esc(fmt(r.spend, "spend", r.currency))}"></span>`).join("")}</div><div class="dashboard-placement-list">${data.rows.map((r, i) => `<div><span class="dashboard-placement-key" style="background:${r.color}"></span><strong title="${esc(r.breakdown || r.name)}">${esc(r.name)}</strong><span>${esc(fmt(r.spend, "spend", r.currency))}</span><b data-tone="${performance(r)}" title="ROAS">${esc(number(r.roas))}</b></div>`).join("")}</div>`;
    return `<div class="dashboard-campaign-list">${data.rows.map((r) => `<div class="dashboard-campaign-item"><div><strong title="${esc(r.breakdown || r.name)}">${esc(r.name)}</strong><span>${esc(fmt(r.spend, "spend", r.currency))}</span><b data-tone="${performance(r)}" title="ROAS">${esc(number(r.roas))}</b></div><div class="dashboard-campaign-bar"><span data-tone="${performance(r)}" style="width:${total ? (Number(r.spend || 0) / total) * 100 : 0}%"></span></div></div>`).join("")}</div><div class="dashboard-breakdown-legend"><span><i data-tone="good"></i>Au-dessus du seuil</span><span><i data-tone="bad"></i>Sous le seuil</span><span><i data-tone="neutral"></i>Non évalué</span></div>`;
  }
  function recommendationCard(row) {
    const tone = alertTone(row),
      style = alertStyles[tone];
    return `<article class="dashboard-recommendation-card"><div class="dashboard-recommendation-tags"><span>LYADS PROPOSE</span><span data-alert-tone="${tone}">${style.label}</span></div><h3>${esc(row.title)}</h3><p>${esc(row.message)}</p><div class="dashboard-recommendation-actions"><button type="button" data-dashboard-action="alert-detail" data-alert-id="${esc(row.id)}" data-alert-kind="recommendation">Examiner</button><button type="button" data-dashboard-action="defer-recommendation" data-alert-id="${esc(row.id)}">Reporter</button></div></article>`;
  }
  async function moreAds(button) {
    const epoch = state.epoch,
      previous = state.data.creatives;
    if (previous?.nextOffset == null || state.adsLoading) return;
    state.adsLoading = true;
    button.disabled = true;
    try {
      const page = await api(
        `${endpoint("creatives")}&offset=${previous.nextOffset}`,
      );
      if (epoch !== state.epoch || state.data.creatives !== previous) return;
      const known = new Set(previous.rows.map((r) => r.bucket));
      state.data.creatives = {
        ...page,
        rows: [
          ...previous.rows,
          ...page.rows.filter((r) => !known.has(r.bucket)),
        ],
      };
      renderZone("creatives", state.data.creatives);
    } catch (err) {
      if (epoch === state.epoch) text("[data-more-ads-status]", err.message);
    } finally {
      state.adsLoading = false;
      button.disabled = false;
    }
  }
  function renderZone(zone, data) {
    if (zone === "kpis") {
      kpis(data);
      if (state.data.series) renderZone("series", state.data.series);
      return;
    }
    let html = "";
    if (zone === "creatives") html = rankedAdsHtml(data);
    else if (zone === "series") html = seriesHtml(data);
    else if (zone === "alerts" || zone === "recommendations") {
      renderAlerts();
      if (zone === "alerts") return;
      const rows = state.alertRows.filter(
        (r) =>
          r.kind === "recommendation" &&
          !state.deferredRecommendations?.has(String(r.id)),
      );
      html = rows.length
        ? rows.map(recommendationCard).join("")
        : `<p>${esc(data.message)}</p>`;
      text("[data-recommendation-count]", rows.length || "");
    } else html = breakdownHtml(zone, data);
    all(`[data-zone="${zone}"]`).forEach((el) => {
      el.innerHTML = html;
      el.setAttribute("aria-busy", "false");
    });
    if (zone === "creatives") bindAdRows();
    if (zone === "series") {
      bindChart();
      renderSparks();
    }
    if (zone === "kpis" && state.data.series)
      renderZone("series", state.data.series);
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
    closePreview();
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
  async function addAccountDialog() {
    all(".dashboard-account-picker").forEach((el) =>
      el.removeAttribute("open"),
    );
    const d = dialog(
      '<form><h2 id="add-account-title">Ajouter un nouveau compte publicitaire</h2><p data-business-name class="dashboard-note"></p><label>Rechercher un compte<input type="search" data-account-search placeholder="Nom ou identifiant du compte"></label><div data-available-accounts>Chargement des comptes…</div><p role="alert"></p><div class="dashboard-period-actions"><button type="button" data-close>Annuler</button><button type="submit" disabled>Ajouter les comptes sélectionnés</button></div><button type="button" class="dashboard-connect-business" data-connect-business disabled>Connecter un nouveau Business Manager</button></form>',
    );
    d.classList.add("dashboard-period-dialog", "dashboard-accounts-dialog");
    d.setAttribute("aria-labelledby", "add-account-title");
    const form = d.querySelector("form"),
      error = form.querySelector("[role=alert]"),
      list = form.querySelector("[data-available-accounts]"),
      submit = form.querySelector("[type=submit]"),
      connect = form.querySelector("[data-connect-business]");
    let loaded;
    form.querySelector("[data-close]").onclick = () => d.close();
    const selected = () =>
      [...list.querySelectorAll("input:checked:not(:disabled)")].map(
        (el) => el.value,
      );
    list.addEventListener("change", () => {
      submit.disabled = !selected().length;
    });
    form
      .querySelector("[data-account-search]")
      .addEventListener("input", (event) => {
        const q = event.target.value.toLocaleLowerCase("fr");
        list.querySelectorAll("[data-account-search-text]").forEach((el) => {
          el.hidden = !el.dataset.accountSearchText.includes(q);
        });
      });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!loaded || !selected().length) return;
      submit.disabled = true;
      error.textContent = "";
      try {
        await api(
          `/api/organizations/${encodeURIComponent(config.organization)}/accounts/connect`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              revision: loaded.revision,
              accountIds: selected(),
            }),
          },
        );
        d.close();
        await refresh();
      } catch (e) {
        error.textContent = e.message;
        submit.disabled = false;
      }
    });
    connect.onclick = async () => {
      connect.disabled = true;
      error.textContent = "";
      try {
        const result = await api("/api/meta/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId: config.organization }),
        });
        location.assign(result.redirect);
      } catch (e) {
        error.textContent = e.message;
        connect.disabled = false;
      }
    };
    try {
      loaded = await api(
        `/api/organizations/${encodeURIComponent(config.organization)}/accounts/connect`,
      );
      if (!d.isConnected) return;
      form.querySelector("[data-business-name]").textContent =
        loaded.businessName || "Business Manager sélectionné";
      list.innerHTML = loaded.accounts.length
        ? loaded.accounts
            .map((a) => {
              const connected = loaded.connected.includes(a.id);
              return `<label class="dashboard-connect-account" data-account-search-text="${esc((a.name + " " + a.meta_account_id).toLocaleLowerCase("fr"))}"><input type="checkbox" value="${esc(a.id)}" ${connected ? "checked disabled" : !loaded.editable ? "disabled" : ""}><span><strong>${esc(a.name)}</strong><small>${esc(a.meta_account_id)} · ${esc(a.currency)}${connected ? " · Déjà connecté" : ""}</small></span></label>`;
            })
            .join("")
        : "<p>Aucun compte publicitaire accessible trouvé pour ce Business Manager.</p>";
      connect.disabled = !loaded.editable;
      if (!loaded.editable)
        error.textContent =
          "Le propriétaire de l’entreprise doit connecter les nouveaux comptes.";
    } catch (e) {
      list.textContent = "";
      error.textContent = e.message;
    }
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
      `<form><h2>Seuils des alertes</h2><label>Compte publicitaire<select name="account">${accounts.map((a) => `<option value="${esc(a.id)}">${esc(a.name)} (${esc(a.currency)})</option>`).join("")}</select></label><p class="dashboard-note">Renseignez les cibles utiles à votre activité. Le CPR sert de référence lorsqu’aucune cible spécifique n’est renseignée. Lyads gère automatiquement les autres réglages.</p><div data-alert-fields></div><p role="alert"></p><div class="dashboard-period-actions"><button type="button" data-close>Annuler</button><button type="submit" disabled>Enregistrer</button></div></form>`,
    );
    d.classList.add("dashboard-period-dialog", "dashboard-targets-dialog");
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
              `<label>${esc(field.label)}${["target_cpa", "target_cpr", "target_cpl"].includes(key) ? ` (${esc(data.currency)})` : ""}<input name="${esc(key)}" type="number" min="${field.min}" max="${field.max}" step="${field.integer ? "1" : "any"}" value="${esc(data.settings[key] ?? "")}" ${field.value === null ? "" : "required"} ${data.canEdit ? "" : "disabled"}></label>`,
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
        await context(state.epoch);
        await loadWidgets(state.epoch);
      } catch (error) {
        d.querySelector('[role="alert"]').textContent = error.message;
        save.disabled = false;
        account.disabled = false;
      }
    };
    await load();
  }
  function action(name, el) {
    if (name === "alerts-seen") {
      state.seenAlerts = new Set(
        state.alertRows.map((r) => `${r.kind}:${r.id}:${r.message}`),
      );
      renderAlerts();
      return;
    }
    if (name === "defer-recommendation") {
      state.deferredRecommendations ||= new Set();
      state.deferredRecommendations.add(el.dataset.alertId);
      renderZone("recommendations", state.data.recommendations);
      return;
    }
    if (name === "add-account") {
      addAccountDialog();
      return;
    }
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
      } else if (button.dataset.dashboardAction === "more-ads") moreAds(button);
      else action(button.dataset.dashboardAction, button);
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
    if (e.target.matches("[data-scope-choice]")) {
      const kind = e.target.dataset.scopeChoice;
      state[kind] = e.target.value;
      if (kind === "campaign") state.adset = "";
      all("[data-scope-picker]").forEach((el) => {
        el.open = false;
      });
      refresh();
      return;
    }
    if (e.target.matches("[data-account-choice]")) {
      const chosen = e.target.value;
      const ids = e.target.checked
        ? [...new Set([...state.ids, chosen])]
        : state.ids.filter((id) => id !== chosen);
      if (!ids.length) {
        e.target.checked = true;
        message("Sélectionnez au moins un compte publicitaire.");
        return;
      }
      state.ids = ids;
      state.campaign = state.adset = "";
      refresh();
      return;
    }
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
    state.campaign = state.adset = "";
    refresh();
  });
  document.addEventListener("click", (e) => {
    const summary = e.target.closest(
      '[data-scope-label][aria-disabled="true"]',
    );
    if (summary) e.preventDefault();
  });
  document.addEventListener("input", (e) => {
    if (!e.target.matches("[data-scope-search]")) return;
    const term = e.target.value.toLocaleLowerCase("fr").trim();
    e.target
      .closest("[data-scope-picker]")
      .querySelectorAll("[data-scope-row]")
      .forEach((row) => {
        row.hidden = !row.textContent.toLocaleLowerCase("fr").includes(term);
      });
  });
  const q = new URL(location.href).searchParams;
  state.campaign = q.get("campaign") || "";
  state.adset = q.get("adset") || "";
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
