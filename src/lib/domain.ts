export type Campaign = {
  id: string;
  accountId: string;
  name: string;
  budget: number;
  spend: number;
  purchases: number;
  roas: number | null;
  cpa: number | null;
  status: string;
  active: boolean;
  source: string;
  objective: string;
};
export type Recommendation = {
  id: string;
  accountId: string;
  title: string;
  body: string;
  severity: "Critique" | "Élevée" | "Moyenne" | "Faible";
  confidence: number;
  kind: "rebalance" | "pause" | "creative" | "audience";
  targetId: string;
  donorId?: string;
  status: "pending" | "applied" | "ignored" | "undone";
  appliedAt?: number;
  before?: Campaign[];
  outcome?: string;
};
export const creditCosts = {
  analyse: 8,
  scan: 2,
  texte: 1,
  image: 8,
  video: 45,
  marche: 48,
  publication: 2,
  rapport: 3,
};
export const money = (value: number | null | undefined, currency = "XOF") =>
  value == null
    ? "—"
    : new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: currency === "XOF" ? 0 : 2,
      }).format(value) +
      " " +
      (currency === "XOF" ? "FCFA" : currency === "EUR" ? "EUR" : "USD");
export const number = (v: number | null | undefined) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(v);
export const ratio = (v: number | null | undefined) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(v);
export function budgetChanges(
  campaigns: Campaign[],
  r: Recommendation,
): { id: string; name: string; before: number; after: number }[] {
  if (r.kind !== "rebalance") return [];
  const target = campaigns.find((c) => c.id === r.targetId),
    donor = campaigns.find((c) => c.id === r.donorId);
  if (
    !target ||
    !donor ||
    target.id === donor.id ||
    donor.accountId !== target.accountId ||
    target.accountId !== r.accountId
  )
    return [];
  const amount = Math.min(150000, Math.floor(donor.budget / 2));
  return [
    {
      id: donor.id,
      name: donor.name,
      before: donor.budget,
      after: donor.budget - amount,
    },
    {
      id: target.id,
      name: target.name,
      before: target.budget,
      after: target.budget + amount,
    },
  ];
}
export function applyToCampaigns(campaigns: Campaign[], r: Recommendation) {
  const changes = budgetChanges(campaigns, r);
  return campaigns.map((c) => {
    const change = changes.find((x) => x.id === c.id);
    return change
      ? {
          ...c,
          budget: change.after,
          active: true,
          status: "active",
          source: "agent",
        }
      : c.id === r.targetId && c.accountId === r.accountId && r.kind === "pause"
        ? { ...c, active: false, status: "en_pause", source: "agent" }
        : c;
  });
}
export const undoAllowed = (at: number, now = Date.now()) =>
  now - at <= 7 * 24 * 60 * 60 * 1000;
export type Rule = {
  id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  action: string;
  active: boolean;
  accountId: string;
};
export function conflictingRule(rules: Rule[], candidate: Rule) {
  return rules.some(
    (r) =>
      r.id !== candidate.id &&
      r.accountId === candidate.accountId &&
      r.active &&
      r.metric === candidate.metric &&
      r.operator === candidate.operator &&
      r.threshold === candidate.threshold &&
      r.action !== candidate.action,
  );
}
export function campaignTotals(cs: Campaign[]) {
  const spend = cs.reduce((s, c) => s + c.spend, 0),
    purchases = cs.reduce((s, c) => s + c.purchases, 0);
  return {
    spend,
    purchases,
    budget: cs.reduce((s, c) => s + c.budget, 0),
    roas: spend
      ? cs.reduce((s, c) => s + c.spend * (c.roas ?? 0), 0) / spend
      : null,
    cpa: purchases ? spend / purchases : null,
  };
}
