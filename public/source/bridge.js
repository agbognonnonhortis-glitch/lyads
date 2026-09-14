/* Interaction wiring only. All visible HTML, styles, text and artwork come from the supplied sources. */
(() => {
  const config = JSON.parse(
      document.getElementById("source-config").textContent,
    ),
    ref = config.ref;
  const paths = { ...config.paths, sent: "/confirmation-envoi" };
  const norm = (s) =>
    (s || "").replace(/\s+/g, " ").trim().replace(/[’‘]/g, "'");
  const go = (target) => {
    if (target === "C1.2") {
      const company = document.getElementById("company-context");
      if (company && !JSON.parse(company.textContent).canSwitch) return;
    }
    if (paths[target]) window.location.assign(paths[target]);
  };
  const exact = {
    Lyads: "A1",
    "En profiter": "A3",
    "Choisir Essentiel": "A5",
    "Commencer avec Pro": "A5",
    "Voir l'agent d'optimisation": "C2.1",
    "Ouvrir l'agent": "C2.1",
    "Voir le Studio": "C5.1",
    "Voir le studio créatif": "C5.1",
    "Voir l'analyse créative": "C6.1",
    "Voir le raisonnement": "C2.2",
    Appliquer: "C2.3",
    Connexion: "A4",
    "Se connecter": "A4",
    "Créer mon compte": "verify",
    "Créer mon compte gratuitement": "A5",
    "Créer un compte gratuit": "A5",
    "Créer un compte": "A5",
    "Commencer gratuitement": "A5",
    Commencer: "A5",
    Fonctionnalités: "A2",
    Tarifs: "A3",
    "Voir les tarifs": "A3",
    "Tous les tarifs en détail": "A3",
    "Voir tous les tarifs en détail": "A3",
    "Mot de passe oublié ?": "A6",
    "Envoyer le lien": "sent",
    "Retour à la connexion": "A4",
    "Revenir à la connexion": "A4",
    "Corriger l’e-mail": "A5",
    "Enregistrer le mot de passe": "A4",
    "Tableau de bord": "C1.1",
    Agent: "C2.1",
    "Agent d'optimisation": "C2.1",
    Gestionnaire: "C3.1",
    "Gestionnaire de publicités": "C3.1",
    Campagnes: "C3.1",
    Ensembles: "C3.2",
    Publicités: "C3.3",
    "Constructeur de campagne": "C4.1",
    Constructeur: "C4.1",
    "Créer une campagne": "C4.1",
    "Nouvelle campagne": "C4.1",
    Studio: "C5.1",
    "Studio créatif": "C5.1",
    "Analyse créative": "C6.1",
    "Analyse marché": "C8.1",
    "Intelligence marché": "C8.1",
    Rapports: "C9.1",
    "Business Brain": "C10.1",
    Paramètres: "C11.1",
    Profil: "C11.1",
    "Comptes Meta": "C11.2",
    Abonnement: "C11.3",
    Crédits: "C11.4",
    Facturation: "C11.5",
    Notifications: "C11.6",
    Équipe: "C11.7",
    "Équipe et accès": "C11.7",
    Déconnexion: "C11.8",
    Examiner: "C2.2",
    "Examiner et appliquer": "C2.2",
    "Examiner la recommandation": "C2.2",
    "Valider et appliquer": "C2.3",
    "Appliquer la réallocation": "C2.4",
    "Confirmer et appliquer": "C2.4",
    "Appliquer maintenant": "C2.4",
    "Historique des recommandations": "C2.4",
    "Réglages de l'agent": "C2.5",
    "Commencer la configuration": "B2",
    "Explorer d'abord": "C1.1",
    "Configurer plus tard": "C1.1",
    "Connecter Meta": "B3",
    "Continuer avec Meta": "B3",
    "Accéder au tableau de bord": "C1.1",
    "Textes publicitaires": "C5.2",
    "Génération de textes": "C5.2",
    Visuels: "C5.3",
    "Génération de visuels": "C5.3",
    "Vidéos courtes": "C5.4",
    "Génération de vidéo": "C5.4",
    "Ma bibliothèque": "C5.7",
    Bibliothèque: "C5.7",
    "Analyse par éléments": "C6.3",
    "Détecteur de fatigue": "C6.4",
    "Gagnants enterrés": "C6.5",
    Itérations: "C6.6",
    "Mes collections": "C8.3",
    Collections: "C8.3",
    "Concurrents directs": "C8.4",
    "Lancer une analyse": "C8.5",
    "Lancer une analyse de marché": "C8.5",
    "Axes de communication": "C8.7",
    "Historique des analyses": "C8.8",
    "Nouveau rapport": "C9.3",
    Modèles: "C9.3",
    "Modèles de rapport": "C9.3",
    "Paramètres de partage": "C9.4",
    "Fiche entreprise": "C10.1",
    "Produits et offres": "C10.2",
    "Historique des modifications": "C10.3",
    "Mentions légales": "A7",
    "Conditions générales d'utilisation": "terms",
    "Conditions générales": "terms",
    "Politique de confidentialité": "privacy",
    Confidentialité: "privacy",
    Cookies: "cookies",
  };
  const flow = {
    B1: "B2",
    B2: "B3",
    B3: "B4",
    B4: "B5",
    B5: "B6",
    B6: "B7",
    B7: "B8",
    B8: "B9",
    B9: "B10",
    B10: "B11",
    B11: "C1.1",
    "C4.1": "C4.2",
    "C4.2": "C4.3",
    "C4.3": "C4.4",
    "C4.4": "C4.5",
    "C4.5": "C4.6",
    "C4.6": "C4.8",
    "C4.7": "C4.8",
    "C4.8": "C4.9",
    "C4.9": "C3.1",
  };
  const back = {
    B1: "A5",
    B2: "B1",
    B3: "B2",
    B4: "B3",
    B5: "B4",
    B6: "B5",
    B7: "B6",
    B8: "B7",
    B9: "B8",
    B10: "B9",
    B11: "B10",
    "C2.2": "C2.1",
    "C2.3": "C2.2",
    "C4.1": "C3.1",
    "C4.2": "C4.1",
    "C4.3": "C4.2",
    "C4.4": "C4.1",
    "C4.5": "C4.4",
    "C4.6": "C4.5",
    "C4.7": "C4.6",
    "C4.8": "C4.6",
    "C4.9": "C4.8",
  };
  function destination(text, el) {
    if (
      el.closest("svg,h1,h2,h3") ||
      /text-transform:\s*uppercase/.test(el.getAttribute("style") || "")
    )
      return;
    if (config.prototype && el.closest("[data-lvl]")) return;
    if (text === norm(ref)) return;
    if (ref === "A1" && /^Optimisation$|^Création$|^Intelligence$/.test(text))
      return;
    if (
      ref.startsWith("B") &&
      /^Continuer|^Suivant|^C'est parti|^Valider et continuer|^Confirmer mon choix|^Passer cette étape/.test(
        text,
      )
    )
      return flow[ref];
    if (
      ref.startsWith("C4.") &&
      /^Continuer|^Suivant|^Générer la proposition|^Proposer une structure|^Construire la campagne|^Valider la structure|^Créer la campagne|^Publier/.test(
        text,
      )
    )
      return flow[ref];
    if (/^Retour$|^Annuler$|^Fermer$/.test(text)) return back[ref];
    if (ref === "C4.1" && /manuell|moi-même/i.test(text)) return "C4.4";
    if (ref === "C4.1" && /agent|intention/i.test(text)) return "C4.2";
    if (ref === "C4.3" && /prévisualis|aperçu/i.test(text)) return "C4.8";
    if (ref.startsWith("C4.") && text === "Quitter") return "C3.1";
    if (ref.startsWith("C5.") && /^Utiliser|^Ajouter à une campagne/.test(text))
      return "C4.6";
    if (ref === "C5.1" && /Vidéo/.test(text)) return "C5.4";
    if (ref.startsWith("C5.") && /^Retoucher|^Modifier$/.test(text))
      return "C5.6";
    if (ref === "C5.6" && text === "Enregistrer") return "C5.7";
    if (ref.startsWith("C6.") && /^Décliner|^Proposer/.test(text))
      return "C6.6";
    if (
      ref.startsWith("C6.") &&
      /^Analyser|^Voir le détail|^Détail$/.test(text)
    )
      return "C6.2";
    if (ref === "C8.1" && /^Cartable garanti|^Voir le détail/.test(text))
      return "C8.2";
    if (ref === "C8.5" && /^Analyser|^Lancer/.test(text)) return "C8.6";
    if (ref === "C8.8" && /^Cartable scolaire|^Ouvrir/.test(text))
      return "C8.6";
    if (ref.startsWith("C9.") && /^Partager$/.test(text)) return "C9.4";
    if (
      ref.startsWith("C9.") &&
      /^Prévisualiser$|^Voir le rapport|^Voir la page publique|^Ouvrir le lien/.test(
        text,
      )
    )
      return "C9.5";
    if (ref === "C9.3" && /^Utiliser|^Page vide/.test(text)) return "C9.2";
    if (ref === "C9.1" && /^Groupe Sanou|^Ouvrir|^Modifier/.test(text))
      return "C9.2";
    if (ref === "verify" && /Ouvrir|Continuer|Vérifi/.test(text)) return "B1";
    if (ref === "A5" && /^Créer mon compte/.test(text)) return "verify";
    if (
      (ref === "A3" || ref === "A1") &&
      /^Choisir|^Commencer|^Essayer/.test(text)
    )
      return "A5";
    if (ref === "C1.2" && /^Kola |^Atelier |^Groupe |^Sanou /.test(text))
      return "C1.1";
    if (/^Kola Distribution$/.test(text) && ref !== "C1.2") return "C1.2";
    if (/^Historique$/.test(text))
      return ref.startsWith("C10.")
        ? "C10.3"
        : ref.startsWith("C8.")
          ? "C8.8"
          : "C2.4";
    if (/^Réglages$/.test(text) && ref.startsWith("C2.")) return "C2.5";
    if (/^Bibliothèque/.test(text)) return "C5.7";
    return exact[text];
  }
  const editableLabels = new Set([
    "Adresse e-mail",
    "Votre nom",
    "Nom complet",
    "Nom de l'entreprise",
    "Nom de la campagne",
    "Texte principal",
    "Titre",
    "Description",
    "Site web",
    "URL du site",
    "CPA cible",
    "Objectif de ROAS",
    "Budget quotidien",
    "Budget mensuel",
  ]);
  const wired = new WeakSet();
  function wire() {
    const root = document.getElementById("dc-root");
    if (!root) return;
    // Add keyboard access to existing icon controls without changing the artwork.
    if (ref.startsWith("C2."))
      for (const icon of root.querySelectorAll(
        "i.ph-x,i.ph-sliders-horizontal",
      )) {
        const target = icon.parentElement;
        const dest = icon.classList.contains("ph-x") ? back[ref] : "C2.5";
        if (target && dest && paths[dest] && ref !== dest) {
          target.dataset.sourceGo = dest;
          target.setAttribute("role", "button");
          target.setAttribute(
            "aria-label",
            icon.classList.contains("ph-x") ? "Fermer" : "Réglages de l'agent",
          );
          target.tabIndex = 0;
        }
      }
    for (const el of root.querySelectorAll("div,a,button,span")) {
      if (
        wired.has(el) ||
        el.closest(
          "svg,[data-auth-managed],[data-zone],[data-kpi],[data-dashboard-action]",
        )
      )
        continue;
      const text = norm(el.textContent);
      if (!text || text.length > 160) continue;
      const childText = [...el.children].some(
        (c) => norm(c.textContent) === text && c.tagName !== "I",
      );
      if (childText && el.tagName !== "A") continue;
      const dest = destination(text, el);
      if (dest && paths[dest] && paths[dest] !== location.pathname) {
        let target = el;
        const parent = el.parentElement;
        if (
          parent &&
          parent.tagName === "DIV" &&
          norm(parent.textContent) === text &&
          /padding|min-height|cursor/.test(parent.getAttribute("style") || "")
        )
          target = parent;
        target.dataset.sourceGo = dest;
        target.setAttribute("role", target.tagName === "A" ? "link" : "button");
        target.tabIndex = 0;
        wired.add(el);
      }
      if (
        editableLabels.has(text) &&
        !["A4", "A5", "A6", "reset"].includes(ref)
      ) {
        let field = el.nextElementSibling;
        if (
          field &&
          field.tagName === "DIV" &&
          field.children.length <= 1 &&
          /border|background/.test(field.getAttribute("style") || "") &&
          !field.querySelector("svg")
        ) {
          field.contentEditable = "plaintext-only";
          field.setAttribute("role", "textbox");
          field.setAttribute("aria-label", text);
          field.dataset.sourceField = text;
          field.spellcheck = false;
          try {
            const saved = sessionStorage.getItem(
              "lyads-source-field:" + ref + ":" + text,
            );
            if (saved !== null && field.textContent !== saved)
              field.textContent = saved;
          } catch {}
        }
      }
    }
  }
  document.addEventListener(
    "click",
    (event) => {
      const el =
        event.target instanceof Element
          ? event.target.closest("[data-source-go]")
          : null;
      if (el) {
        event.preventDefault();
        event.stopPropagation();
        go(el.dataset.sourceGo);
      }
    },
    true,
  );
  document.addEventListener("keydown", (event) => {
    const el = event.target;
    if (
      (event.key === "Enter" || event.key === " ") &&
      el instanceof HTMLElement &&
      el.dataset.sourceGo
    ) {
      event.preventDefault();
      go(el.dataset.sourceGo);
    }
  });
  document.addEventListener("input", (event) => {
    const el = event.target;
    if (el instanceof HTMLElement && el.dataset.sourceField)
      try {
        sessionStorage.setItem(
          "lyads-source-field:" + ref + ":" + el.dataset.sourceField,
          el.textContent,
        );
      } catch {}
  });
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
})();
