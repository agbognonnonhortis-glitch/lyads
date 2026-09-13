export const sections = {
  activity: {
    title: "Mon activité",
    step: 5,
    fields: {
      name: "Nom de l’entreprise",
      sector: "Secteur",
      type: "Type d’activité",
      website: "Site web",
      social: "Réseaux sociaux",
    },
  },
  offer: {
    title: "Mon offre",
    step: 5,
    fields: {
      name: "Produit ou service",
      argument: "Argument principal",
      objections: "Objections fréquentes",
      price: "Prix",
      currency: "Devise",
      url: "Page de destination",
    },
  },
  market: {
    title: "Mon marché",
    step: 6,
    fields: {
      countries: "Pays visés",
      language: "Langue",
      seasonality: "Saisonnalité",
    },
  },
  audience: {
    title: "Mon audience",
    step: 6,
    fields: {
      customer: "Client type",
      age: "Tranche d’âge",
      problem: "Problème résolu",
      trigger: "Ce qui le fait acheter",
    },
  },
  funnel: {
    title: "Mon tunnel",
    step: 7,
    fields: {
      journey: "Parcours",
      basket: "Panier moyen",
      conversion: "Taux de conversion connu",
      delay: "Délai de décision",
    },
  },
  history: {
    title: "Mon historique publicitaire",
    step: 7,
    fields: {
      advertised: "Déjà fait de la publicité Meta",
      budget: "Budget mensuel habituel",
      currency: "Devise du budget",
      cpa: "CPA cible",
      roas: "ROAS cible",
    },
  },
} as const;
export type Section = keyof typeof sections;
export type Brain = Partial<Record<Section, Record<string, unknown>>>;
export const stepPaths = [
  "/configuration/meta",
  "/configuration/business-manager",
  "/configuration/pages",
  "/configuration/pixel",
  "/configuration/entreprise?section=activity",
  "/configuration/entreprise?section=market",
  "/configuration/entreprise?section=funnel",
  "/configuration/recapitulatif",
  "/configuration/plan",
  "/configuration/terminee",
];
export function brainPatch(value: unknown): value is Brain {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  for (const [key, fields] of Object.entries(value)) {
    if (
      !(key in sections) ||
      !fields ||
      typeof fields !== "object" ||
      Array.isArray(fields)
    )
      return false;
    for (const [field, content] of Object.entries(fields)) {
      if (key === "offer" && field === "products") {
        if (
          !Array.isArray(content) ||
          content.length > 20 ||
          !content.every(
            (p) =>
              p &&
              typeof p === "object" &&
              !Array.isArray(p) &&
              Object.entries(p).every(
                ([k, v]) =>
                  k in sections.offer.fields &&
                  typeof v === "string" &&
                  v.length <= 4000,
              ),
          )
        )
          return false;
      } else if (
        key === "offer" ||
        !(field in sections[key as Section].fields) ||
        typeof content !== "string" ||
        content.length > 4000
      )
        return false;
    }
  }
  return true;
}
export function completeness(brain: Brain) {
  const missing: {
    section: string;
    field: string;
    label: string;
    affects: string;
  }[] = [];
  let total = 0,
    filled = 0;
  const affects = {
    activity: "Personnalisation de l’agent",
    offer: "Textes et créatives",
    market: "Marché et langues",
    audience: "Ciblages et angles publicitaires",
    funnel: "Rentabilité et CPA cible",
    history: "Objectifs et recommandations",
  };
  for (const [key, section] of Object.entries(sections)) {
    const values =
      key === "offer"
        ? Array.isArray(brain.offer?.products)
          ? (brain.offer!.products as Record<string, unknown>[])
          : []
        : [brain[key as Section] || {}];
    for (const record of values.length ? values : [{}])
      for (const [field, label] of Object.entries(section.fields)) {
        total++;
        if (
          typeof record[field] === "string" &&
          (record[field] as string).trim()
        )
          filled++;
        else
          missing.push({
            section: key,
            field,
            label,
            affects: affects[key as Section],
          });
      }
  }
  return {
    percent: Math.round((filled / total) * 100),
    filled,
    total,
    missing,
  };
}
export const blankOnboarding = (workspaceId: string) => ({
  workspace_id: workspaceId,
  revision: 0,
  current_step: 1,
  business_meta_id: null,
  connection_id: null,
  ad_account_ids: [],
  page_ids: [],
  pixels: [],
  pages_skipped: false,
  pixels_skipped: false,
  brain: {},
  provenance: {},
  plan_key: null,
  reviewed_at: null,
  completed_at: null,
  updated_at: null,
});
