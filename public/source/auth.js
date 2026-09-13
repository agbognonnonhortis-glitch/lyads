/* Functional controls over the original maquette. Original artwork and typography stay in place. */
(() => {
  const config = JSON.parse(
    document.getElementById("source-config").textContent,
  );
  const ref = config.ref;
  const formsEnabled = ["A4", "A5", "A6", "reset"].includes(ref);
  if (!formsEnabled && !["verify", "sent", "C11.8"].includes(ref)) return;
  const norm = (s) =>
    (s || "").replace(/\s+/g, " ").trim().replace(/[’‘]/g, "'");
  const copy = {
    INVALID_CREDENTIALS: "Identifiants incorrects",
    EMAIL_UNCONFIRMED: "Compte non vérifié",
    RATE_LIMITED: "Trop de tentatives",
    SESSION_REQUIRED: "Lien expiré",
    LINK_ERROR: "Lien expiré",
    INVALID_PASSWORD: "12 caractères minimum · Une majuscule · Un chiffre",
    SERVICE_UNAVAILABLE: "Erreur",
    PROVIDER_UNAVAILABLE: "Erreur",
    INVALID_REQUEST: "Erreur",
  };
  const state = {
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
    remember: true,
    terms: false,
    busy: false,
  };
  const seen = new WeakSet();
  let session = null;
  function alertCode(code) {
    window.alert(copy[code] || copy.SERVICE_UNAVAILABLE);
  }
  async function call(action, payload) {
    const response = await fetch("/api/auth/" + action, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok || !result.ok)
      throw Object.assign(new Error("AUTH_ERROR"), { code: result.code });
    return result;
  }
  function field(label, name, type) {
    let holder = label.nextElementSibling;
    if (
      !holder ||
      holder.tagName !== "DIV" ||
      !/border:/.test(holder.getAttribute("style") || "")
    )
      holder = label.parentElement.nextElementSibling;
    if (
      !holder ||
      !/border:/.test(holder.getAttribute("style") || "") ||
      holder.querySelector("input")
    )
      return;
    const span = holder.querySelector("span");
    if (!span) return;
    const input = document.createElement("input");
    input.type = type;
    input.name = name;
    input.required = true;
    input.setAttribute("aria-label", label.textContent.trim());
    input.autocomplete = {
      email: "email",
      password: ref === "A4" ? "current-password" : "new-password",
      confirmPassword: "new-password",
      firstName: "given-name",
      lastName: "family-name",
    }[name];
    input.placeholder = span.textContent;
    input.value = state[name];
    input.style.cssText =
      span.style.cssText +
      ";min-width:0;width:0;border:0;padding:0;margin:0;background:transparent;border-radius:0;box-shadow:none;outline-offset:3px;";
    input.maxLength = type === "password" ? 128 : type === "email" ? 254 : 100;
    if (type === "password" && ref !== "A4") {
      input.minLength = 12;
      input.pattern = "(?=.*[A-Z])(?=.*[0-9]).{12,128}";
    }
    if (type === "email") input.inputMode = "email";
    input.spellcheck = false;
    holder.removeAttribute("contenteditable");
    holder.removeAttribute("data-source-field");
    holder.removeAttribute("role");
    holder.dataset.authManaged = "field";
    span.replaceWith(input);
    input.addEventListener("input", () => {
      input.setCustomValidity("");
      state[name] = input.value;
      for (const other of document.querySelectorAll(
        `input[data-auth-input="${name}"]`,
      ))
        if (other !== input) other.value = input.value;
      if (name === "password" || name === "confirmPassword") strength();
    });
    input.dataset.authInput = name;
    const eye = holder.querySelector("i.ph-eye");
    if (eye) {
      eye.dataset.authAction = "reveal";
      eye.setAttribute("role", "button");
      eye.setAttribute("aria-label", label.textContent.trim());
      eye.tabIndex = 0;
    }
  }
  function strength() {
    const password = state.password;
    const valid = [
      password.length >= 12,
      /[A-Z]/.test(password),
      /\d/.test(password),
    ];
    for (const root of document.querySelectorAll("[data-source-width]")) {
      for (const node of root.querySelectorAll("div")) {
        const label = norm(node.textContent);
        if (
          node.children.length === 0 &&
          ["12 caractères minimum", "Une majuscule", "Un chiffre"].includes(
            label,
          )
        ) {
          const index = [
            "12 caractères minimum",
            "Une majuscule",
            "Un chiffre",
          ].indexOf(label);
          const icon = node.parentElement.querySelector("i");
          if (icon) {
            icon.classList.toggle("ph-check-circle", valid[index]);
            icon.classList.toggle("ph-circle", !valid[index]);
          }
        }
        if (node.children.length === 0 && ["Solide", "Moyen"].includes(label))
          node.textContent = valid.every(Boolean) ? "Solide" : "Moyen";
      }
    }
  }
  function control(el, action) {
    el.dataset.authManaged = "control";
    el.dataset.authAction = action;
    delete el.dataset.sourceGo;
    el.setAttribute("role", "button");
    el.tabIndex = 0;
  }
  function checkbox(label, key) {
    const box = label.previousElementSibling;
    if (!box || !box.querySelector(".ph-check")) return;
    box.dataset.authManaged = "checkbox";
    box.dataset.authAction = key;
    box.setAttribute("role", "checkbox");
    box.setAttribute("aria-label", norm(label.textContent));
    box.tabIndex = 0;
    box.setAttribute("aria-checked", String(state[key]));
    box.querySelector(".ph-check").style.visibility = state[key]
      ? "visible"
      : "hidden";
  }
  function wire() {
    const root = document.getElementById("dc-root");
    if (!root) return;
    for (const frame of root.querySelectorAll("[data-source-width]")) {
      if (seen.has(frame)) continue;
      seen.add(frame);
      if (formsEnabled) {
        const labels = [...frame.querySelectorAll("div")].filter(
          (el) => el.children.length === 0,
        );
        for (const label of labels) {
          const text = norm(label.textContent);
          const spec = {
            "Adresse e-mail": ["email", "email"],
            Prénom: ["firstName", "text"],
            Nom: ["lastName", "text"],
            "Mot de passe": ["password", "password"],
            "Nouveau mot de passe": ["password", "password"],
            "Confirmer le mot de passe": ["confirmPassword", "password"],
          }[text];
          if (spec) field(label, ...spec);
          if (text === "Rester connecté sur cet appareil")
            checkbox(label, "remember");
        }
        for (const el of frame.querySelectorAll("div"))
          if (
            norm(el.textContent).startsWith("J'accepte les ") &&
            !el.querySelector("div")
          )
            checkbox(el, "terms");
        const inputs = [...frame.querySelectorAll("input[data-auth-input]")];
        if (inputs.length) {
          let common = inputs[0].parentElement;
          while (common && !inputs.every((input) => common.contains(input)))
            common = common.parentElement;
          // The supplied form content wrapper also contains its submit button.
          while (
            common &&
            ![...common.querySelectorAll("div")].some((el) =>
              [
                "Se connecter",
                "Créer mon compte",
                "Envoyer le lien",
                "Définir le mot de passe",
              ].includes(norm(el.textContent)),
            )
          )
            common = common.parentElement;
          if (common && common !== frame) {
            const form = document.createElement("form");
            for (const attr of common.attributes)
              form.setAttribute(attr.name, attr.value);
            form.dataset.authForm = ref;
            form.method = "post";
            form.style.margin = "0";
            while (common.firstChild) form.appendChild(common.firstChild);
            common.replaceWith(form);
            form.addEventListener("keydown", (event) => {
              if (event.key === "Enter" && event.target.matches("input")) {
                event.preventDefault();
                form.requestSubmit();
              }
            });
            form.addEventListener("submit", (event) => {
              event.preventDefault();
              submit(form);
            });
          }
        }
      }
      for (const el of frame.querySelectorAll("div,button,a")) {
        const text = norm(el.textContent);
        if (
          text.length > 70 ||
          [...el.children].some(
            (c) => norm(c.textContent) === text && c.tagName !== "I",
          )
        )
          continue;
        const inForm = !!el.closest("form[data-auth-form]");
        if (
          inForm &&
          [
            "Se connecter",
            "Créer mon compte",
            "Envoyer le lien",
            "Définir le mot de passe",
          ].includes(text)
        )
          control(el, "submit");
        if (
          ["Continuer avec Google", "S'inscrire avec Google"].includes(text)
        ) {
          const google = el.parentElement;
          control(google, "google");
          // Facebook sign-in was requested after the maquettes were supplied.
          // Reuse the supplied provider component, with its exact inline styles.
          const facebook = google.cloneNode(true);
          const label = [...facebook.querySelectorAll("div,span")].find(
            (node) => norm(node.textContent) === text,
          );
          if (label)
            label.textContent = el.textContent.replace("Google", "Facebook");
          for (const [button, provider] of [
            [google, "google"],
            [facebook, "facebook"],
          ]) {
            const glyph = [...button.querySelectorAll("div,span")].find(
              (node) =>
                node.children.length === 0 && node.textContent.trim() === "G",
            );
            if (glyph) {
              const logo = document.createElement("img");
              logo.src = "/brands/" + provider + ".png";
              logo.alt = "";
              logo.setAttribute("aria-hidden", "true");
              logo.width = 20;
              logo.height = 20;
              logo.style.cssText =
                "width:20px;height:20px;object-fit:contain;flex-shrink:0;display:block";
              glyph.replaceWith(logo);
            }
          }
          control(facebook, "facebook");
          google.after(facebook);
        }
        if (ref === "verify" && text === "Renvoyer le lien")
          control(el, "resend");
        if (ref === "sent" && /^Renvoyer dans/.test(text))
          control(el, "recover");
        if (ref === "C11.8" && text === "Se déconnecter") control(el, "logout");
        if (ref === "C11.8" && text === "Tout déconnecter")
          control(el, "logout-all");
        if (ref === "verify" && text === "Corriger l'e-mail") {
          el.dataset.sourceGo = "A5";
          el.tabIndex = 0;
          el.setAttribute("role", "link");
        }
      }
    }
    hydrateEmail();
  }
  function hydrateEmail() {
    if (!session) return;
    const email = ref === "reset" ? session.user?.email : session.pendingEmail;
    if (!email) return;
    const root = document.getElementById("dc-root");
    if (!root) return;
    if (["verify", "sent", "reset"].includes(ref)) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode())
        if (walker.currentNode.textContent.includes("aminata@kola.sn"))
          nodes.push(walker.currentNode);
      for (const node of nodes)
        node.textContent = node.textContent.replaceAll(
          "aminata@kola.sn",
          email,
        );
    }
  }
  function busy(value) {
    state.busy = value;
    for (const form of document.querySelectorAll("form[data-auth-form]")) {
      form.setAttribute("aria-busy", String(value));
      for (const input of form.querySelectorAll("input"))
        input.disabled = value;
    }
    for (const control of document.querySelectorAll("[data-auth-action]"))
      control.setAttribute("aria-disabled", String(value));
  }
  async function submit(form) {
    if (state.busy) return;
    // Read real input values, including password-manager autofill. Placeholders
    // from the prototype are never submitted as a person's credentials.
    for (const input of form.querySelectorAll("input[data-auth-input]"))
      state[input.name] = input.value;
    if (!form.reportValidity()) return;
    if (ref === "A5" && !state.terms) {
      const check = form.querySelector('[data-auth-action="terms"]');
      check?.focus();
      return;
    }
    if (ref === "reset" && state.password !== state.confirmPassword) {
      const input = form.querySelector('[name="confirmPassword"]');
      input.setCustomValidity("Confirmer le mot de passe");
      input.reportValidity();
      return;
    }
    busy(true);
    try {
      const action = {
        A4: "login",
        A5: "signup",
        A6: "recover",
        reset: "reset",
      }[ref];
      const payload =
        action === "login"
          ? {
              email: state.email,
              password: state.password,
              remember: state.remember,
            }
          : action === "signup"
            ? {
                email: state.email,
                password: state.password,
                firstName: state.firstName,
                lastName: state.lastName,
                terms: state.terms,
              }
            : action === "recover"
              ? { email: state.email }
              : {
                  password: state.password,
                  confirmPassword: state.confirmPassword,
                };
      const result = await call(action, payload);
      if (action === "signup" || action === "recover")
        sessionStorage.setItem(
          "lyads-auth-resend-at",
          String(Date.now() + 42000),
        );
      location.assign(result.redirect);
    } catch (error) {
      alertCode(error.code);
      busy(false);
    }
  }
  async function activate(el) {
    const action = el.dataset.authAction;
    if (state.busy) return;
    if (action === "submit") {
      el.closest("form")?.requestSubmit();
      return;
    }
    if (action === "reveal") {
      const input = el.parentElement.querySelector("input");
      input.type = input.type === "password" ? "text" : "password";
      return;
    }
    if (action === "terms" || action === "remember") {
      state[action] = !state[action];
      for (const box of document.querySelectorAll(
        `[data-auth-action="${action}"]`,
      )) {
        box.setAttribute("aria-checked", String(state[action]));
        box.querySelector(".ph-check").style.visibility = state[action]
          ? "visible"
          : "hidden";
      }
      return;
    }
    if (["resend", "recover"].includes(action)) {
      if (
        Date.now() < Number(sessionStorage.getItem("lyads-auth-resend-at") || 0)
      )
        return;
      if (!session?.pendingEmail) {
        location.assign(
          action === "resend" ? "/inscription" : "/mot-de-passe-oublie",
        );
        return;
      }
    }
    busy(true);
    try {
      const result = await call(
        action === "logout-all" ? "logout" : action,
        action === "logout-all"
          ? { all: true }
          : action === "resend" || action === "recover"
            ? { email: session.pendingEmail }
            : {},
      );
      if (["resend", "recover"].includes(action)) {
        sessionStorage.setItem(
          "lyads-auth-resend-at",
          String(Date.now() + 42000),
        );
        busy(false);
      } else location.assign(result.redirect);
    } catch (error) {
      alertCode(error.code);
      busy(false);
    }
  }
  document.addEventListener(
    "click",
    (event) => {
      const el =
        event.target instanceof Element
          ? event.target.closest("[data-auth-action]")
          : null;
      if (el) {
        event.preventDefault();
        event.stopImmediatePropagation();
        void activate(el);
      }
    },
    true,
  );
  document.addEventListener(
    "keydown",
    (event) => {
      const el = event.target;
      if (
        ["Enter", " "].includes(event.key) &&
        el instanceof HTMLElement &&
        el.dataset.authAction
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        void activate(el);
      }
    },
    true,
  );
  const style = document.createElement("style");
  style.textContent =
    "input[data-auth-input]::placeholder{color:inherit;opacity:1}";
  document.head.appendChild(style);
  let queued = false;
  new MutationObserver(() => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        wire();
      });
    }
  }).observe(document.body, { childList: true, subtree: true });
  wire();
  fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      session = data;
      hydrateEmail();
    })
    .catch(() => {});
  if (["verify", "sent"].includes(ref))
    setInterval(() => {
      const seconds = Math.max(
        0,
        Math.ceil(
          (Number(sessionStorage.getItem("lyads-auth-resend-at") || 0) -
            Date.now()) /
            1000,
        ),
      );
      for (const el of document.querySelectorAll(
        '[data-auth-action="resend"],[data-auth-action="recover"]',
      )) {
        el.setAttribute("aria-disabled", String(seconds > 0 || state.busy));
        if (ref === "sent") {
          const text = [...el.childNodes].find(
            (n) =>
              n.nodeType === Node.TEXT_NODE && /Renvoyer/.test(n.textContent),
          );
          if (text)
            text.textContent = seconds
              ? "Renvoyer dans " + seconds + " s"
              : "Renvoyer le lien";
        }
      }
      if (ref === "verify")
        for (const el of document.querySelectorAll("div"))
          if (
            el.children.length === 0 &&
            /^Renvoi possible dans/.test(el.textContent)
          )
            el.textContent = "Renvoi possible dans " + seconds + " secondes";
    }, 1000);
  const status = new URLSearchParams(location.search).get("auth");
  if (status) {
    history.replaceState(null, "", location.pathname);
    setTimeout(
      () =>
        window.alert(
          status === "password_updated"
            ? "Mot de passe réinitialisé"
            : status === "link_error"
              ? "Lien expiré"
              : "Erreur",
        ),
      0,
    );
  }
})();
