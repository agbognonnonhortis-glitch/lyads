/* Live Meta bindings. Cards, fonts and artwork are cloned from the maquettes. */
(() => {
  const config = JSON.parse(
    document.getElementById("source-config").textContent,
  );
  if (!["B2", "B4"].includes(config.ref)) return;
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  const leaf = (root, text) =>
    [...root.querySelectorAll("div,span")].find(
      (el) => !el.children.length && norm(el.textContent) === text,
    );
  const selected = new Set();
  let orgId = null,
    busy = false,
    lastPayload = null;
  const views = [];
  const messages = {
    META_RECONNECT: "La connexion Meta a expiré. Reconnectez le compte.",
    META_PERMISSION_REQUIRED:
      "Accordez les autorisations publicitaires depuis Meta, puis reconnectez le compte.",
    META_RATE_LIMIT:
      "Meta limite temporairement les appels. La synchronisation reprendra automatiquement.",
  };
  async function api(path, body) {
    const response = await fetch(path, {
      credentials: "same-origin",
      cache: "no-store",
      ...(body
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        data.error?.message || "Le service est indisponible. Réessayez.",
      );
    return data;
  }
  async function organization() {
    if (orgId) return orgId;
    const { organizations } = await api("/api/organizations");
    if (!organizations.length)
      throw new Error("Reconnectez-vous pour initialiser votre espace.");
    const previous = sessionStorage.getItem("lyads.organization");
    orgId = (organizations.find((o) => o.id === previous) || organizations[0])
      .id;
    sessionStorage.setItem("lyads.organization", orgId);
    return orgId;
  }
  function action(el, name) {
    el.dataset.metaAction = name;
    el.dataset.authManaged = "meta";
    el.tabIndex = 0;
    el.setAttribute("role", "button");
  }
  function label(el, value) {
    const text = [...el.childNodes].find(
      (n) => n.nodeType === Node.TEXT_NODE && norm(n.textContent),
    );
    if (text) text.textContent = value;
    else el.textContent = value;
  }
  function status(text) {
    for (const view of views) view.description.textContent = text;
  }
  function selectedState() {
    for (const el of document.querySelectorAll("[data-meta-account]")) {
      const on = selected.has(el.dataset.metaAccount);
      el.setAttribute("aria-checked", String(on));
      el.style.background = on ? "#FDF5F1" : "#FFFFFF";
      el.style.borderColor = on ? "#B44A26" : "#E8E3D9";
      const box = el.firstElementChild;
      box.style.background = on ? "#B44A26" : "#FFFFFF";
      if (box.firstElementChild)
        box.firstElementChild.style.visibility = on ? "visible" : "hidden";
    }
    for (const el of document.querySelectorAll('[data-meta-action="sync"]'))
      label(
        el,
        busy
          ? "Synchronisation en cours…"
          : `Continuer avec ${selected.size} compte${selected.size > 1 ? "s" : ""}`,
      );
    for (const el of document.querySelectorAll("[data-meta-count]"))
      el.textContent = `${selected.size} sélectionné${selected.size > 1 ? "s" : ""}`;
  }
  function render(payload) {
    lastPayload = payload;
    for (const view of views) {
      view.list.replaceChildren();
      for (const account of payload.accounts) {
        const card = view.template.cloneNode(true);
        card.dataset.metaAccount = account.id;
        card.dataset.authManaged = "meta";
        card.setAttribute("role", "checkbox");
        card.tabIndex = 0;
        leaf(card, "Kola Distribution — Sénégal").textContent = account.name;
        leaf(card, "act_1042 887 355 201").textContent =
          account.meta_account_id;
        leaf(card, "FCFA").textContent = account.currency;
        leaf(card, "Africa/Dakar").textContent = account.timezone_name;
        leaf(card, "4 850 000 FCFA").textContent = "Indisponible";
        const badge = leaf(card, "Actif");
        badge.textContent =
          account.account_status === 1
            ? "Actif"
            : account.account_status === 2
              ? "Désactivé"
              : "À vérifier";
        if (account.account_status !== 1) {
          badge.style.background = "#F8EDD8";
          badge.style.color = "#5C4A25";
        }
        view.list.append(card);
      }
    }
    const discovery = payload.jobs.find((j) => j.kind === "meta.discover");
    if (discovery && ["queued", "running"].includes(discovery.status))
      status(
        "Recherche des comptes accessibles sur Meta… Cette page se met à jour automatiquement.",
      );
    else if (discovery?.status === "failed")
      status(
        messages[discovery.error_code] ||
          "Impossible de récupérer les comptes. Revenez à la connexion Meta et réessayez.",
      );
    else
      status(
        payload.accounts.length
          ? `${payload.accounts.length} compte(s) accessible(s). Sélectionnez ceux dont vous souhaitez importer les 90 derniers jours.`
          : "Aucun compte publicitaire accessible. Revenez à la connexion Meta pour accorder les autorisations.",
      );
    selectedState();
  }
  async function refresh() {
    try {
      const id = await organization();
      render(await api(`/api/organizations/${id}/accounts`));
    } catch (error) {
      status(error.message);
    }
  }
  async function handle(el) {
    if (busy) return;
    if (el.dataset.metaAccount) {
      const id = el.dataset.metaAccount;
      selected.has(id) ? selected.delete(id) : selected.add(id);
      selectedState();
      return;
    }
    if (el.dataset.metaAction === "connect") {
      busy = true;
      try {
        const workspaceId = await organization();
        const data = await api("/api/meta/connect", { workspaceId });
        window.location.assign(data.redirect);
      } catch (error) {
        window.alert(error.message);
        busy = false;
      }
    }
    if (el.dataset.metaAction === "sync") {
      if (!selected.size) {
        window.alert("Sélectionnez au moins un compte publicitaire.");
        return;
      }
      busy = true;
      selectedState();
      const jobs = [];
      try {
        for (const id of selected) {
          const data = await api(`/api/accounts/${id}/sync`, {
            requestKey: crypto.randomUUID(),
          });
          jobs.push(data.jobId);
        }
        sessionStorage.setItem(
          "lyads.adAccounts",
          JSON.stringify([...selected]),
        );
        const poll = async () => {
          try {
            const results = await Promise.all(
              jobs.map((id) => api(`/api/jobs/${id}`)),
            );
            const failed = results.find((r) =>
              ["failed", "cancelled"].includes(r.job.status),
            );
            if (failed)
              throw new Error(
                messages[failed.job.error_code] ||
                  "La synchronisation a échoué. Réessayez depuis ce compte.",
              );
            const done = results.every((r) => r.job.status === "succeeded");
            status(
              done
                ? "Historique importé. Les données de ces comptes sont enregistrées dans Lyads."
                : `Import en cours : ${results.reduce((n, r) => n + r.job.progress_done, 0)} lignes traitées. Vous pouvez quitter la page, le traitement continue en arrière-plan.`,
            );
            if (done) {
              busy = false;
              selectedState();
              return;
            }
            setTimeout(poll, 5000);
          } catch (error) {
            busy = false;
            selectedState();
            status(error.message);
          }
        };
        await poll();
      } catch (error) {
        busy = false;
        selectedState();
        status(error.message);
      }
    }
  }
  document.addEventListener(
    "click",
    (event) => {
      const el = event.target.closest("[data-meta-action],[data-meta-account]");
      if (!el) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void handle(el);
    },
    true,
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (!["Enter", " "].includes(event.key)) return;
      const el = event.target.closest("[data-meta-action],[data-meta-account]");
      if (el) {
        event.preventDefault();
        event.stopImmediatePropagation();
        void handle(el);
      }
    },
    true,
  );
  const initialized = new WeakSet();
  function bind() {
    for (const frame of document.querySelectorAll("[data-source-width]")) {
      if (initialized.has(frame)) continue;
      initialized.add(frame);
      if (config.ref === "B2") {
        for (const el of frame.querySelectorAll("div,button,a"))
          if (
            [
              "Continuer avec Facebook",
              "Continuer avec Meta",
              "Connecter Meta",
            ].includes(norm(el.textContent)) &&
            ![...el.children].some(
              (c) => norm(c.textContent) === norm(el.textContent),
            )
          )
            action(el, "connect");
      } else {
        const name = leaf(frame, "Kola Distribution — Sénégal");
        if (!name) continue;
        const template = name.parentElement.parentElement.parentElement;
        const list = template.parentElement;
        const description = [...frame.querySelectorAll("div")].find(
          (el) =>
            !el.children.length &&
            norm(el.textContent).startsWith("Quatre comptes actifs"),
        );
        if (!description) continue;
        views.push({ list, template: template.cloneNode(true), description });
        list.replaceChildren();
        description.textContent = "Chargement de vos comptes publicitaires…";
        for (const el of frame.querySelectorAll("div,span")) {
          if (
            norm(el.textContent) === "2 sélectionnés" &&
            !el.children.length
          ) {
            el.dataset.metaCount = "true";
            el.textContent = "0 sélectionné";
          }
          if (norm(el.textContent) === "Actifs · 4" && !el.children.length)
            el.textContent = "Comptes accessibles";
          if (
            norm(el.textContent) === "Continuer avec 2 comptes" &&
            ![...el.children].some(
              (c) => norm(c.textContent) === norm(el.textContent),
            )
          )
            action(el, "sync");
        }
      }
    }
  }
  bind();
  new MutationObserver(bind).observe(document.body, {
    childList: true,
    subtree: true,
  });
  if (config.ref === "B4") {
    void refresh();
    setInterval(() => {
      if (
        !busy &&
        !document.hidden &&
        lastPayload?.jobs.some(
          (j) =>
            j.kind === "meta.discover" &&
            ["queued", "running"].includes(j.status),
        )
      )
        void refresh();
    }, 5000);
  }
})();
