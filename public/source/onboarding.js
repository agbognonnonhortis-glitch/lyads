/* Persisted onboarding. Every resource/answer is supplied by the authenticated API. */
(() => {
  const config = JSON.parse(
    document.getElementById("onboarding-data").textContent,
  );
  const { data, ref, step } = config;
  let state = data.state;
  let saving = Promise.resolve();
  let failed = false,
    navigating = false,
    pending = 0;
  let actions = Promise.resolve();
  const timers = new Map();
  const paths = [
    "/configuration/meta",
    "/configuration/business-manager",
    "/configuration/pages",
    "/configuration/pixel",
    "/configuration/entreprise?section=activity",
    "/configuration/analyse-site",
    "/configuration/entreprise?section=review",
    "/configuration/recapitulatif",
    "/configuration/plan",
    "/configuration/terminee",
  ];
  const errors = {
    META_PERMISSION_REQUIRED:
      "Meta n’a pas accordé toutes les autorisations nécessaires. Reconnectez votre Business Manager pour les accorder.",
    META_RECONNECT:
      "La connexion Meta doit être renouvelée. Reconnectez votre Business Manager.",
    META_APP_CHANGED:
      "L’application Meta a changé. Reconnectez votre Business Manager pour autoriser la nouvelle application.",
    META_TOKEN_UNVERIFIED:
      "Meta n’a pas permis de vérifier cette connexion. Reconnectez votre Business Manager pour renouveler son autorisation.",
    META_EVENT_COUNTS_UNAVAILABLE:
      "Les volumes d’événements ne sont pas disponibles. Aucun chiffre n’est estimé.",
    META_REQUEST_UNAVAILABLE:
      "Meta ne donne pas accès à certaines ressources avec les autorisations actuelles.",
  };
  const status = (message) =>
    document.querySelectorAll("[data-onboarding-status]").forEach((e) => {
      e.textContent = message;
      e.setAttribute("role", "status");
    });
  function clearErrors() {
    document.querySelectorAll("[data-onboarding-error]").forEach((box) => {
      box.hidden = true;
      box.textContent = "";
    });
    document
      .querySelectorAll("[data-onboarding-field-error]")
      .forEach((label) => {
        const input = label.previousElementSibling;
        if (input) {
          input.removeAttribute("aria-invalid");
          const describedBy = (input.getAttribute("aria-describedby") || "")
            .split(" ")
            .filter((id) => id && id !== label.id)
            .join(" ");
          if (describedBy) input.setAttribute("aria-describedby", describedBy);
          else input.removeAttribute("aria-describedby");
        }
        label.remove();
      });
  }
  function fieldError(message, selector) {
    return Object.assign(new Error(message), { fieldSelector: selector });
  }
  function showError(error, origin, focus = false) {
    const message = typeof error === "string" ? error : error.message;
    const frames = [...document.querySelectorAll("[data-source-width]")];
    let target;
    for (const frame of frames) {
      const box = frame.querySelector("[data-onboarding-error]");
      if (!box) continue;
      box.textContent = message;
      box.hidden = false;
      const input =
        error.fieldSelector && frame.querySelector(error.fieldSelector);
      if (input) {
        const label = document.createElement("p");
        label.id =
          "onboarding-field-error-" + frame.getAttribute("data-source-width");
        label.setAttribute("data-onboarding-field-error", "");
        label.style.cssText =
          "color:#9C3424;font:400 13px/1.6 'Figtree',sans-serif;margin:4px 0";
        label.textContent = message;
        input.after(label);
        input.setAttribute("aria-invalid", "true");
        input.setAttribute(
          "aria-describedby",
          [input.getAttribute("aria-describedby"), label.id]
            .filter(Boolean)
            .join(" "),
        );
      }
      if (frame === origin || (!origin && frame.getClientRects?.().length))
        target = input || box;
    }
    if (focus && target) {
      target.scrollIntoView?.({ block: "center", behavior: "smooth" });
      target.focus?.({ preventScroll: true });
    }
  }
  async function api(path, body) {
    if (body?.changes) pending++;
    try {
      const r = await fetch(path, {
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
      const result = await r.json();
      if (!r.ok)
        throw new Error(
          result.error?.message || "Le service est indisponible. Réessayez.",
        );
      return result;
    } finally {
      if (body?.changes) pending--;
    }
  }
  function save(changes) {
    const operation = saving.then(async () => {
      status("Enregistrement…");
      const result = await api("/api/onboarding", {
        workspaceId: data.organization.id,
        revision: state.revision,
        changes,
      });
      state = result.state;
      failed = false;
      status("Enregistré dans votre espace.");
      return state;
    });
    saving = operation.catch((e) => {
      failed = true;
      showError(
        e.message + " Vos dernières modifications ne sont pas enregistrées.",
      );
    });
    return operation;
  }
  async function flush() {
    for (const [key, entry] of timers) {
      clearTimeout(entry.timer);
      timers.delete(key);
      entry.run();
    }
    await saving;
    if (failed)
      throw new Error(
        "L’enregistrement n’a pas abouti. Corrigez ou réessayez avant de quitter cette étape.",
      );
  }
  function draftField(input) {
    const section = input.dataset.section,
      field = input.dataset.field,
      index = input.dataset.product;
    const value = input.value;
    document.querySelectorAll("[data-field]").forEach((other) => {
      if (
        other !== input &&
        other.dataset.section === section &&
        other.dataset.field === field &&
        other.dataset.product === index
      )
        other.value = value;
    });

    const key = section + ":" + field + ":" + (index || "");
    if (timers.has(key)) clearTimeout(timers.get(key).timer);
    const run = () => {
      timers.delete(key);
      saving = saving
        .then(async () => {
          let values;
          if (index !== undefined) {
            const products = structuredClone(state.brain.offer?.products || []);
            if (!products[Number(index)]) return;
            products[Number(index)][field] = value;
            values = { products };
          } else values = { [field]: value };
          const result = await api("/api/onboarding", {
            workspaceId: data.organization.id,
            revision: state.revision,
            changes: { brain: { [section]: values } },
          });
          state = result.state;
          failed = false;
          status("Enregistré dans votre espace.");
        })
        .catch((e) => {
          failed = true;
          showError(e.message + " Cette modification n’est pas enregistrée.");
        });
    };
    timers.set(key, { run, timer: setTimeout(run, 500) });
    status("Modifications en attente d’enregistrement…");
  }
  function go(target) {
    navigating = true;
    location.assign(target);
  }
  async function inventory(scope, reload = true, wait = false) {
    const { jobId } = await api("/api/onboarding", {
      action: "inventory",
      workspaceId: data.organization.id,
      scope,
    });
    const poll = async () => {
      if (navigating) return;
      try {
        const { job } = await api("/api/jobs/" + jobId);
        if (navigating) return;
        if (["failed", "cancelled"].includes(job.status)) {
          const message =
            errors[job.error_code] ||
            "La récupération Meta a échoué. Actualisez les ressources pour réessayer.";
          if (wait) throw new Error(message);
          showError(message);
          return;
        }
        if (job.status === "succeeded") {
          const issues = job.result?.issues || [];
          if (issues.length)
            status(
              [
                ...new Set(
                  issues.map(
                    (i) =>
                      errors[i.code] ||
                      "Certaines ressources ne sont pas accessibles avec les autorisations actuelles.",
                  ),
                ),
              ].join(" "),
            );
          if (
            reload &&
            Date.parse(job.updated_at) > Date.parse(config.loadedAt)
          ) {
            await flush();
            go(location.href);
          }
          return;
        }
        status(
          `Recherche des ressources Meta en cours — ${job.progress_done} élément(s) reçus. Vos choix enregistrés sont conservés.`,
        );
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return poll();
      } catch (e) {
        if (wait) throw e;
        showError(e.message);
      }
    };
    if (wait) await poll();
    else void poll();
  }
  function scope() {
    return ref === "B3"
      ? state.business_meta_id
        ? "business"
        : "root"
      : ref === "B5"
        ? "business"
        : "pixels";
  }
  function paint(kind, ids) {
    document
      .querySelectorAll(`[data-onboarding-action="${kind}"]`)
      .forEach((e) => {
        const checked = ids.includes(e.dataset.id);
        e.setAttribute("aria-checked", String(checked));
        e.style.background = checked ? "#FDF5F1" : "#FFFFFF";
        e.style.borderColor = checked ? "#B44A26" : "#E8E3D9";
        const box = e.firstElementChild;
        if (box && box !== e.lastElementChild) {
          box.style.background = checked ? "#B44A26" : "#FFFFFF";
          if (box.firstElementChild)
            box.firstElementChild.style.visibility = checked
              ? "visible"
              : "hidden";
        }
      });
  }
  async function handle(el) {
    const action = el.dataset.onboardingAction;
    if (action === "open-section") {
      const frame = el.closest("[data-source-width]");
      const target = frame.querySelector(
        `[data-section="${el.dataset.target}"]`,
      );
      const head = target?.querySelector(
        '[data-onboarding-action="toggle-section"]',
      );
      if (head) {
        head.nextElementSibling.hidden = false;
        head.setAttribute("aria-expanded", "true");
        head.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    if (action === "toggle-section") {
      const form = el.nextElementSibling;
      if (form) {
        form.hidden = !form.hidden;
        el.setAttribute("aria-expanded", String(!form.hidden));
      }
      return;
    }
    if (navigating) return;
    await flush();
    if (action === "connect") {
      const response = await api("/api/meta/connect", {
        workspaceId: data.organization.id,
      });
      go(response.redirect);
      return;
    }
    if (action === "connected") {
      await save({ current_step: 2 });
      await inventory("root", false);
      go(paths[1]);
      return;
    }
    if (action === "business") {
      await save({ business_meta_id: el.dataset.id, current_step: 2 });
      await inventory("business", false);
      go(paths[1]);
      return;
    }
    if (action === "account" || action === "page") {
      const field = action === "account" ? "ad_account_ids" : "page_ids";
      const set = new Set(state[field]);
      set.has(el.dataset.id)
        ? set.delete(el.dataset.id)
        : set.add(el.dataset.id);
      await save({
        [field]: [...set],
        current_step: step,
        ...(action === "page" ? { pages_skipped: false } : {}),
      });
      paint(action, [...set]);
      return;
    }
    if (action === "pixel") {
      const pixels = state.pixels.filter(
        (p) => p.account_id !== el.dataset.account,
      );
      pixels.push({
        account_id: el.dataset.account,
        pixel_id: el.dataset.id,
        event: null,
      });
      await save({ pixels, pixels_skipped: false, current_step: 4 });
      go(location.href);
      return;
    }
    if (action === "event") {
      const pixels = state.pixels.map((p) =>
        p.account_id === el.dataset.account && p.pixel_id === el.dataset.pixel
          ? { ...p, event: el.dataset.id }
          : p,
      );
      await save({ pixels });
      go(location.href);
      return;
    }
    if (action === "refresh") {
      if (ref === "B3" && state.business_meta_id)
        await inventory("root", false, true);
      await inventory(scope());
      return;
    }
    if (action === "skip-pages") {
      await save({ page_ids: [], pages_skipped: true, current_step: 4 });
      go(paths[3]);
      return;
    }
    if (action === "skip-pixels") {
      await save({ pixels: [], pixels_skipped: true, current_step: 5 });
      go(state.completed_at ? "/app/parametres/meta" : paths[4]);
      return;
    }
    if (action === "analyze-website" || action === "retry-analysis") {
      const frame = el.closest("[data-source-width]");
      const raw =
        action === "retry-analysis"
          ? state.brain.activity?.website
          : frame.querySelector("[data-website-url]")?.value?.trim();
      if (!raw)
        throw fieldError(
          "Indiquez le lien de votre site ou de votre page de vente.",
          "[data-website-url]",
        );
      const url = /^https?:\/\//i.test(raw) ? raw : "https://" + raw;
      await api("/api/onboarding", {
        action: "analyze-website",
        workspaceId: data.organization.id,
        revision: state.revision,
        url,
      });
      go(paths[5]);
      return;
    }
    if (action === "website") {
      await save({ current_step: 5 });
      go(paths[4]);
      return;
    }
    if (action === "manual-profile") {
      await save({ current_step: 7 });
      go(paths[6]);
      return;
    }
    if (action === "next") {
      if (
        step === 2 &&
        (!state.business_meta_id || !state.ad_account_ids.length)
      )
        throw new Error(
          "Choisissez un Business Manager et au moins un compte publicitaire.",
        );
      if (step === 3 && !state.page_ids.length)
        throw new Error(
          "Sélectionnez une page ou choisissez « Continuer sans page ».",
        );
      if (step === 4 && !state.pixels.length)
        throw new Error(
          "Sélectionnez un pixel ou choisissez explicitement « Continuer sans pixel ».",
        );
      if ([7, 8].includes(step) && !state.brain.activity?.name?.trim())
        throw fieldError(
          "Renseignez le nom de votre entreprise avant de continuer.",
          '[data-field="name"]',
        );
      await save({
        current_step: Math.min(9, step + 1),
        ...(step === 8 ? { review: true } : {}),
      });
      if (step === 3) await inventory("pixels", false);
      go(
        step === 4 && state.completed_at
          ? "/app/parametres/meta"
          : paths[Math.min(9, step)],
      );
      return;
    }
    if (action === "free") {
      await save({ plan_key: "free", complete: true });
      for (const id of state.ad_account_ids)
        try {
          await api(`/api/accounts/${id}/sync`, {
            requestKey: "onboarding:" + state.workspace_id + ":" + id,
          });
        } catch (e) {
          sessionStorage.setItem("lyads-onboarding-sync-error", e.message);
        }
      go(paths[9]);
      return;
    }
    if (action === "paid")
      throw new Error(
        "Les paiements par carte et Mobile Money ne sont pas encore disponibles. Vous pouvez activer le plan gratuit.",
      );
    if (action === "previous") {
      // The analysis screen redirects on completion; return to the editable URL instead.
      const previousStep = step === 7 ? 5 : Math.max(1, step - 1);
      navigating = true;
      try {
        await save({ current_step: previousStep });
        go(paths[previousStep - 1]);
      } catch (error) {
        navigating = false;
        throw error;
      }
      return;
    }
    if (action === "brain") {
      await save({ current_step: 7 });
      go(paths[6]);
      return;
    }
    if (action === "recap") {
      await save({ current_step: 8 });
      go(paths[7]);
      return;
    }
    if (action === "leave") {
      go("/");
      return;
    }
    if (action === "dashboard") {
      go("/app/tableau-de-bord");
      return;
    }
    if (action === "resume") {
      go(paths[Math.min(8, state.current_step - 1)]);
      return;
    }
  }
  document.addEventListener("input", (e) => {
    if (e.target.getAttribute("aria-invalid") === "true") clearErrors();
    if (e.target.matches("[data-resource-search]")) {
      const frame = e.target.closest("[data-source-width]");
      const query = e.target.value.toLocaleLowerCase("fr");
      let count = 0;
      frame
        .querySelectorAll('[data-onboarding-action="business"]')
        .forEach((card) => {
          card.hidden = !card.textContent
            .toLocaleLowerCase("fr")
            .includes(query);
          if (!card.hidden) count++;
        });
      frame.querySelector("[data-resource-results]").textContent =
        count + " résultat(s)";
    }
    if (e.target.matches("[data-field]")) {
      document.querySelectorAll("[data-field-source]").forEach((label) => {
        if (label.dataset.fieldSource === e.target.dataset.field)
          label.textContent = "Saisi par vous";
      });
      draftField(e.target);
    }
    if (e.target.matches("[data-website-url]"))
      document.querySelectorAll("[data-website-url]").forEach((input) => {
        if (input !== e.target) input.value = e.target.value;
      });
  });
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-onboarding-action]");
    if (!el) return;
    e.preventDefault();
    actions = actions
      .then(() => {
        clearErrors();
        return handle(el);
      })
      .catch((err) => {
        showError(err, el.closest("[data-source-width]"), true);
      });
  });
  document.addEventListener("keydown", (e) => {
    if (
      ["Enter", " "].includes(e.key) &&
      e.target.matches("[data-onboarding-action]")
    ) {
      e.preventDefault();
      e.target.click();
    }
  });
  window.addEventListener("beforeunload", (e) => {
    if (!navigating && (timers.size || failed || pending)) {
      e.preventDefault();
    }
  });
  if (ref === "B8") {
    const messages = {
      WEBSITE_INVALID_URL:
        "Indiquez le lien public de votre site ou de votre page de vente.",
      WEBSITE_UNAVAILABLE:
        "La lecture du site n’a pas abouti depuis notre serveur. Réessayez ou complétez les informations manuellement.",
      WEBSITE_BLOCKED:
        "Ce site ne permet pas la lecture automatique. Vous pouvez compléter vos informations manuellement.",
      WEBSITE_EMPTY:
        "Aucun contenu exploitable trouvé. Essayez une autre page ou complétez les informations manuellement.",
      WEBSITE_NOT_CONFIGURED:
        "L’analyse automatique n’est pas encore disponible. Vous pouvez compléter vos informations manuellement.",
      WEBSITE_PROVIDER_UNAVAILABLE:
        "L’analyse est momentanément indisponible. Réessayez ou complétez les informations manuellement.",
      WEBSITE_INVALID_RESULT:
        "Le résultat n’a pas pu être vérifié. Réessayez ou complétez les informations manuellement.",
      WEBSITE_TOO_LARGE:
        "Cette page est trop volumineuse. Essayez le lien direct de votre page de vente.",
    };
    const recover = (message) => {
      document
        .querySelectorAll("[data-analysis-message]")
        .forEach((e) => (e.textContent = message));
      document
        .querySelectorAll("[data-analysis-recovery]")
        .forEach((e) => (e.hidden = false));
      document
        .querySelectorAll("[data-analysis-panel] progress")
        .forEach((e) => (e.hidden = true));
    };
    const pollAnalysis = async () => {
      if (navigating) return;
      if (!state.analysis_job_id) {
        recover(
          "Ajoutez le lien de votre site pour lancer l’analyse, ou complétez les informations manuellement.",
        );
        return;
      }
      try {
        const { job } = await api("/api/jobs/" + state.analysis_job_id);
        if (navigating) return;
        if (job.status === "succeeded") {
          go(paths[6]);
          return;
        }
        if (["failed", "cancelled"].includes(job.status)) {
          recover(
            messages[job.error_code] ||
              "L’analyse n’a pas abouti. Réessayez ou complétez les informations manuellement.",
          );
          return;
        }
        document
          .querySelectorAll("[data-analysis-message]")
          .forEach(
            (e) =>
              (e.textContent = job.progress_done
                ? `${job.progress_done} page(s) consultée(s). Nous préparons vos informations…`
                : "Nous essayons de comprendre votre activité."),
          );
        setTimeout(pollAnalysis, 2000);
      } catch {
        recover(
          "La connexion a été interrompue. Rechargez la page pour reprendre le suivi de votre analyse.",
        );
      }
    };
    void pollAnalysis();
  }
  if (ref === "B2" && data.connection?.connection_status === "partial")
    status(errors.META_PERMISSION_REQUIRED);
  if (ref === "B2" && data.connection?.connection_status === "expired")
    status(errors.META_RECONNECT);
  if (ref === "B11") {
    const error = sessionStorage.getItem("lyads-onboarding-sync-error");
    if (error) {
      status("Configuration enregistrée, mais import à relancer : " + error);
      sessionStorage.removeItem("lyads-onboarding-sync-error");
    }
  }
  if (["B3", "B5", "B6"].includes(ref) && data.connection)
    void inventory(scope()).catch((e) => showError(e));
})();
