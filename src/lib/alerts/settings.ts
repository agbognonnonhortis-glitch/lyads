export const alertFields = {
  target_cpa: { label: "CPA cible", value: null, min: 0.01, max: 999999999999 },
  target_roas: { label: "ROAS cible", value: null, min: 0.01, max: 999999 },
  min_spend: { label: "Dépense minimale", value: 0, min: 0, max: 999999999999 },
  min_days: {
    label: "Jours observés minimum",
    value: 3,
    min: 3,
    max: 90,
    integer: true,
  },
  min_impressions: {
    label: "Impressions minimum",
    value: 1000,
    min: 1000,
    max: 1000000000,
    integer: true,
  },
  min_clicks: {
    label: "Clics minimum",
    value: 30,
    min: 30,
    max: 1000000000,
    integer: true,
  },
  min_purchases: {
    label: "Achats minimum",
    value: 10,
    min: 10,
    max: 1000000000,
    integer: true,
  },
  cpa_excess: {
    label: "Dépassement du CPA (0,2 = 20 %)",
    value: 0.2,
    min: 0.05,
    max: 5,
  },
  roas_shortfall: {
    label: "Baisse du ROAS (0,2 = 20 %)",
    value: 0.2,
    min: 0.05,
    max: 0.9,
  },
  fatigue_frequency: {
    label: "Fréquence quotidienne moyenne minimale",
    value: 3,
    min: 1,
    max: 100,
  },
  fatigue_ctr_drop: {
    label: "Fatigue : baisse du CTR (0,2 = 20 %)",
    value: 0.2,
    min: 0.05,
    max: 0.9,
  },
  fatigue_cpa_rise: {
    label: "Fatigue : hausse du CPA (0,2 = 20 %)",
    value: 0.2,
    min: 0.05,
    max: 5,
  },
  imbalance_share: {
    label: "Part des dépenses mal réparties (0,6 = 60 %)",
    value: 0.6,
    min: 0.5,
    max: 0.95,
  },
  imbalance_cpa_ratio: {
    label: "Écart de CPA entre ensembles (ratio)",
    value: 1.5,
    min: 1.1,
    max: 10,
  },
} as const;
export const defaultAlertSettings = Object.fromEntries(
  Object.entries(alertFields).map(([key, field]) => [key, field.value]),
);
export function validateAlertSettings(input: Record<string, unknown>) {
  if (Object.keys(input).length !== Object.keys(alertFields).length)
    throw new Error("INVALID_SETTINGS");
  for (const [key, field] of Object.entries(alertFields)) {
    const value = input[key];
    if (field.value === null && value === null) continue;
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < field.min ||
      value > field.max ||
      ("integer" in field && !Number.isInteger(value))
    )
      throw new Error("INVALID_SETTINGS");
  }
  return input as Record<string, number | null>;
}
