"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import demo from "./demo.json";
import {
  Campaign,
  Recommendation,
  Rule,
  applyToCampaigns,
  budgetChanges,
  conflictingRule,
  undoAllowed,
  money,
} from "./domain";
export type Creative = {
  id: string;
  accountId: string;
  name: string;
  format: string;
  text: string;
  color: string;
  score: number;
  spend: number;
  roas: number;
  frequency: number;
  saved: boolean;
  created: boolean;
};
export type Report = {
  accountId: string;
  id: string;
  name: string;
  period: string;
  blocks: string[];
  brand: string;
  shared: boolean;
  revoked: boolean;
  expiresAt: number | null;
  schedule: string;
};
export type Activity = {
  id: string;
  at: number;
  label: string;
  accountId: string;
  kind: string;
  credits?: number;
};
export type Draft = {
  cta?: string;
  name: string;
  brief: string;
  objective: string;
  budget: number;
  audience: string;
  placements: string[];
  creativeIds: string[];
  text: string;
  mode: string;
  published: boolean;
};
const originalCampaigns: Campaign[] = demo.campagnes.map((c) => ({
  id: c.id,
  accountId: c.compte,
  name: c.nom,
  budget: c.budget_jour ?? 0,
  spend: c.depense,
  purchases: c.achats,
  roas: c.roas,
  cpa: c.cpa,
  status: c.statut,
  active: c.actif,
  source: c.provenance,
  objective: "objectif" in c ? String(c.objectif) : "Conversions",
}));
const creatives: Creative[] = [
  "Carrousel Karité — collection",
  "Témoignage cliente — 22 s",
  "Offre livraison gratuite",
  "Rentrée scolaire — 15 s",
  "Le karité, simplement",
  "Rituel du matin",
].map((name, i) => ({
  id: "creative" + i,
  accountId: "act_2841",
  name,
  format: ["Carrousel", "Vidéo", "Image", "Vidéo", "Image", "Image"][i],
  text: [
    "Le karité qui prend soin de vous. Découvrez notre collection.",
    "Votre rituel de soin, naturellement.",
    "Livraison offerte dès 25 000 FCFA.",
  ][i % 3],
  color: ["clay", "forest", "sand", "rose", "dark", "mint"][i],
  score: [94, 88, 52, 41, 91, 78][i],
  spend: [86200, 62700, 98400, 0, 18000, 32000][i],
  roas: [4.08, 3.44, 1.72, 0, 4.62, 2.4][i],
  frequency: [2.1, 1.8, 5.2, 0, 1.4, 2.3][i],
  saved: true,
  created: false,
}));
const recommendations: Recommendation[] = [
  {
    id: "r1",
    title:
      "Relancer « Promo Tabaski — Carrousel » sans augmenter le budget du compte",
    body: "La campagne ne diffuse plus depuis 14 heures. Réallouez une partie du budget d’acquisition pour reprendre la diffusion.",
    severity: "Critique",
    confidence: 94,
    kind: "rebalance",
    targetId: "c2",
    donorId: "c1",
  },
  {
    id: "r2",
    title: "Réallouer le budget vers « Retargeting — Visiteurs 30 j »",
    body: "Le CPA d’acquisition dépasse votre cible. L’ensemble de retargeting obtient davantage de ventes par franc dépensé.",
    severity: "Élevée",
    confidence: 87,
    kind: "rebalance",
    targetId: "c3",
    donorId: "c1",
  },
  {
    id: "r3",
    title: "Renouveler « Offre livraison gratuite »",
    body: "Fréquence de 5,2 : votre audience a vu cette créative plusieurs fois. Préparez une nouvelle variante.",
    severity: "Moyenne",
    confidence: 74,
    kind: "creative",
    targetId: "c1",
  },
  {
    id: "r4",
    title: "Élargir l’audience « Large 25-45 — Sénégal »",
    body: "Conservez les exclusions et testez des centres d’intérêt complémentaires.",
    severity: "Faible",
    confidence: 61,
    kind: "audience",
    targetId: "c1",
  },
  {
    id: "r5",
    title: "Examiner 8 objets dont le coût par résultat augmente",
    body: "8 objets groupés · Les ensembles d’acquisition partagent un même signal de saturation.",
    severity: "Élevée",
    confidence: 83,
    kind: "audience",
    targetId: "c1",
  },
  {
    id: "r6",
    title: "Mettre en pause « Notoriété — Vidéo été »",
    body: "Aucun achat attribué sur la période. Vérifiez si l’objectif de notoriété correspond encore à votre priorité.",
    severity: "Moyenne",
    confidence: 71,
    kind: "pause",
    targetId: "c4",
  },
  {
    id: "r7",
    title: "Décliner la créative « Le karité, simplement »",
    body: "Un ROAS de 4,62 avec peu de diffusion : testez une variante à partir de ce signal.",
    severity: "Faible",
    confidence: 68,
    kind: "creative",
    targetId: "c3",
  },
].map(
  (r) => ({ ...r, accountId: "act_2841", status: "pending" }) as Recommendation,
);
const initial = () => ({
  accountId: "act_2841",
  theme: "light" as "light" | "dark",
  collapsed: false,
  scenario: "full" as "full" | "empty" | "error" | "stale",
  metaConnected: true,
  readonly: false,
  creditThreshold: 25,
  glow: "hover",
  plan: "pro",
  credits: 488,
  maxCredits: 1500,
  localSets: [] as {
    id: string;
    campagne: string;
    nom: string;
    audience: string;
    placements: string[];
    creativeIds: string[];
  }[],
  campaigns: [
    ...originalCampaigns,
    ...originalCampaigns.slice(0, 3).map((c, i) => ({
      ...c,
      id: "eur" + i,
      accountId: "act_5508",
      name: [
        "Europe — découverte",
        "Europe — retargeting",
        "Europe — collection",
      ][i],
      budget: [45, 30, 20][i],
      spend: [312, 198, 95][i],
      cpa: [12, 9, 11][i],
      status: "active",
    })),
  ],
  creatives: creatives.map((c) => ({ ...c })),
  recommendations: recommendations.map((r) => ({ ...r })),
  selectedReco: "r1",
  selectedCampaign: "",
  selectedSet: "",
  selectedCreative: "creative0",
  selectedCollection: "col1",
  selectedAnalysis: "",
  selectedMarket: "m1",
  selectedReport: "report1",
  brain: {
    company: "Kola Beauté",
    site: "https://exemple.test",
    offer: demo.business_brain.offre,
    audience: demo.business_brain.audience,
    objective: "Ventes en ligne",
    cpa: 12000,
    budget: 450000,
    tone: "Chaleureux, clair et professionnel",
    forbidden: "Promesses médicales, superlatifs non vérifiés",
    instagram: true,
    page: "Kola Beauté",
    pixel: true,
  },
  profile: {
    name: "Aminata Diallo",
    email: "aminata@exemple.test",
    language: "Français",
    currency: "XOF",
    company: "Kola Beauté",
  },
  draft: {
    cta: "Acheter",
    name: "Lancement Karité — Septembre",
    brief:
      "Faire découvrir notre collection de soins au karité aux femmes de 25 à 45 ans au Sénégal.",
    objective: "Ventes",
    budget: 15000,
    audience: "Femmes · 25–45 ans · Sénégal",
    placements: ["Fil Facebook", "Instagram", "Stories"],
    creativeIds: ["creative0"],
    text: "Le karité qui prend soin de vous. Découvrez notre collection.",
    mode: "agent",
    published: false,
  } as Draft,
  reports: [
    {
      accountId: "act_2841",
      id: "report1",
      name: "Bilan mensuel — Kola Beauté",
      period: "30 derniers jours",
      blocks: [
        "Synthèse",
        "Indicateurs",
        "Campagnes",
        "Créatives",
        "Recommandations",
      ],
      brand: "Kola Beauté",
      shared: true,
      revoked: false,
      expiresAt: null,
      schedule: "Jamais",
    },
  ] as Report[],
  rules: [
    {
      id: "rule1",
      name: "CPA au-dessus de la cible",
      metric: "CPA",
      operator: "supérieur",
      threshold: 18000,
      action: "Notifier",
      active: true,
      accountId: "act_2841",
    },
  ] as Rule[],
  products: [
    {
      id: "p1",
      name: "Beurre de karité",
      price: 7500,
      description: "Soin naturel — pot 200 g",
    },
    {
      id: "p2",
      name: "Rituel découverte",
      price: 25000,
      description: "Coffret de soins",
    },
  ],
  brainVersions: [] as {
    id: string;
    at: number;
    value: Record<string, unknown>;
  }[],
  activity: [] as Activity[],
  collections: [
    { id: "col1", name: "Inspirations rentrée", items: ["m1", "m2"] },
  ],
  marketAnalyses: [] as {
    id: string;
    name: string;
    at: number;
    volume: number;
  }[],
  notifications: {} as Record<string, boolean>,
  members: [
    {
      id: "member1",
      name: "Aminata Diallo",
      email: "aminata@exemple.test",
      role: "Administrateur",
      account: "Tous les comptes",
    },
    {
      id: "member2",
      name: "Fatou Ndiaye",
      email: "fatou@exemple.test",
      role: "Analyste",
      account: "Kola Beauté",
    },
  ],
  auth: false,
  cookieConsent: false,
  toast: "",
});
type State = ReturnType<typeof initial>;
type Actions = {
  patch: (value: Partial<State>) => void;
  notify: (text: string) => void;
  switchAccount: (id: string) => void;
  guard: () => boolean;
  charge: (cost: number, label: string) => boolean;
  applyReco: (id: string) => boolean;
  ignoreReco: (id: string) => void;
  undoReco: (id: string) => void;
  updateBudget: (id: string, value: number) => boolean;
  toggleCampaign: (id: string) => void;
  saveRule: (rule: Rule) => boolean;
  log: (label: string, kind?: string, credits?: number) => void;
  reset: () => void;
};
export const useApp = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initial(),
      patch: (value) => set(value),
      notify: (toast) => set({ toast }),
      switchAccount: (accountId) => {
        const account = demo.comptes.find((a) => a.id === accountId);
        set({
          accountId,
          readonly: !!(
            account &&
            "lecture_seule" in account &&
            account.lecture_seule
          ),
          selectedCampaign: "",
          selectedSet: "",
          selectedReco:
            recommendations.find((r) => r.accountId === accountId)?.id ?? "",
          toast: "Compte actif : " + (account?.nom ?? ""),
        });
      },
      guard: () => {
        if (get().readonly) {
          get().notify(
            "Mode consultation : cette action nécessite un accès en écriture.",
          );
          return false;
        }
        if (!get().metaConnected) {
          get().notify("Reconnectez Meta avant de modifier vos campagnes.");
          return false;
        }
        return true;
      },
      charge: (cost, label) => {
        if (!Number.isFinite(cost) || cost < 0) return false;
        if (get().credits < cost) {
          get().notify(
            "Crédits insuffisants. Rechargez votre solde avant de continuer.",
          );
          return false;
        }
        set((s) => ({ credits: s.credits - cost }));
        get().log(label, "credit", cost);
        return true;
      },
      log: (label, kind = "action", credits) =>
        set((s) => ({
          activity: [
            {
              id: crypto.randomUUID(),
              at: Date.now(),
              accountId: s.accountId,
              label,
              kind,
              credits,
            },
            ...s.activity,
          ],
        })),
      applyReco: (id) => {
        const s = get(),
          r = s.recommendations.find((x) => x.id === id);
        if (
          !r ||
          r.status !== "pending" ||
          r.accountId !== s.accountId ||
          !s.guard()
        )
          return false;
        const changes = budgetChanges(s.campaigns, r);
        if (
          r.kind === "rebalance" &&
          (!changes.length || changes[0].before === changes[0].after)
        ) {
          s.notify("Le budget disponible ne permet plus cette réallocation.");
          return false;
        }
        const before = s.campaigns
          .filter((c) => c.id === r.targetId || c.id === r.donorId)
          .map((c) => ({ ...c }));
        const outcome =
          r.kind === "rebalance"
            ? money(changes[0].before - changes[0].after) +
              " réalloués · budget du compte inchangé"
            : r.kind === "pause"
              ? "Campagne mise en pause"
              : r.kind === "creative"
                ? "Demande de déclinaison créative enregistrée"
                : "Proposition de ciblage enregistrée";
        set({
          campaigns: applyToCampaigns(s.campaigns, r),
          recommendations: s.recommendations.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: "applied",
                  appliedAt: Date.now(),
                  before,
                  outcome,
                }
              : x,
          ),
          toast: outcome,
        });
        get().log(outcome, "agent");
        return true;
      },
      ignoreReco: (id) => {
        const s = get(),
          r = s.recommendations.find((x) => x.id === id);
        if (!r || r.accountId !== s.accountId) return;
        set({
          recommendations: s.recommendations.map((x) =>
            x.id === id
              ? { ...x, status: "ignored", outcome: "Recommandation ignorée" }
              : x,
          ),
          toast: "Recommandation ignorée",
        });
        get().log("Recommandation ignorée : " + r.title, "agent");
      },
      undoReco: (id) => {
        const s = get(),
          r = s.recommendations.find((x) => x.id === id);
        if (!r || r.accountId !== s.accountId || !s.guard()) return;
        if (
          r.status !== "applied" ||
          !r.appliedAt ||
          !undoAllowed(r.appliedAt)
        ) {
          s.notify("Le délai d’annulation de 7 jours est dépassé.");
          return;
        }
        const expected = applyToCampaigns(r.before ?? [], r);
        if (
          expected.some((e) => {
            const current = s.campaigns.find((c) => c.id === e.id);
            return (
              !current ||
              current.budget !== e.budget ||
              current.active !== e.active
            );
          })
        ) {
          s.notify(
            "Ces campagnes ont été modifiées depuis cette action. Rétablissez leurs valeurs avant d’annuler pour préserver les modifications suivantes.",
          );
          return;
        }
        set({
          campaigns: s.campaigns.map((c) => {
            const old = r.before?.find((b) => b.id === c.id);
            return old
              ? {
                  ...c,
                  budget: old.budget,
                  active: old.active,
                  status: old.status,
                  source: old.source,
                }
              : c;
          }),
          recommendations: s.recommendations.map((x) =>
            x.id === id
              ? { ...x, status: "undone", outcome: "Action annulée" }
              : x,
          ),
          toast: "Action annulée · état précédent rétabli",
        });
        get().log("Annulation : " + r.title, "agent");
      },
      updateBudget: (id, budget) => {
        const s = get();
        if (!s.guard()) return false;
        if (!Number.isFinite(budget) || budget < 0) {
          s.notify("Saisissez un budget positif.");
          return false;
        }
        if (
          !s.campaigns.some((c) => c.id === id && c.accountId === s.accountId)
        )
          return false;
        set({
          campaigns: s.campaigns.map((c) =>
            c.id === id ? { ...c, budget, source: "utilisateur" } : c,
          ),
          toast: "Budget quotidien mis à jour",
        });
        get().log("Budget mis à jour : " + money(budget));
        return true;
      },
      toggleCampaign: (id) => {
        const s = get();
        if (!s.guard()) return;
        const c = s.campaigns.find(
          (c) => c.id === id && c.accountId === s.accountId,
        );
        if (!c) return;
        set({
          campaigns: s.campaigns.map((x) =>
            x.id === id
              ? {
                  ...x,
                  active: !x.active,
                  status: x.active ? "en_pause" : "active",
                  source: "utilisateur",
                }
              : x,
          ),
          toast:
            c.name + (c.active ? " · mise en pause" : " · diffusion réactivée"),
        });
        get().log(c.name + (c.active ? " mise en pause" : " réactivée"));
      },
      saveRule: (rule) => {
        const s = get();
        if (!s.guard() || rule.accountId !== s.accountId) return false;
        if (rule.active && conflictingRule(s.rules, rule)) {
          s.notify(
            "Cette règle contredit une règle active pour les mêmes conditions.",
          );
          return false;
        }
        set({
          rules: [...s.rules.filter((r) => r.id !== rule.id), rule],
          toast: "Règle « " + rule.name + " » enregistrée",
        });
        get().log("Règle enregistrée : " + rule.name, "rule");
        return true;
      },
      reset: () => set({ ...initial(), toast: "Démonstration réinitialisée" }),
    }),
    {
      name: "lyads-local-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => {
        const { toast, ...rest } = s;
        return rest;
      },
    },
  ),
);
export const accounts = demo.comptes;
export const plans = demo.plans;
export const adSets = demo.ensembles;
export const ads = demo.publicites;
export const currentCurrency = () =>
  accounts.find((a) => a.id === useApp.getState().accountId)?.devise ?? "XOF";
