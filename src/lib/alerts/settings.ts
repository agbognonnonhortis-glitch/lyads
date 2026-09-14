// Only business targets are user-editable. Technical safeguards live in PostgreSQL.
export const alertFields = {
  target_roas: { label: "ROAS cible", value: null, min: 0.01, max: 999999 },
  target_cpr: {
    label: "Coût par résultat cible (CPR)",
    value: null,
    min: 0.01,
    max: 999999999999,
  },
  target_cpl: {
    label: "Coût par inscription cible (leads)",
    value: null,
    min: 0.01,
    max: 999999999999,
  },
  target_cpa: {
    label: "Coût par achat cible (ventes)",
    value: null,
    min: 0.01,
    max: 999999999999,
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
    if (value === null) continue;
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < field.min ||
      value > field.max
    )
      throw new Error("INVALID_SETTINGS");
  }
  return Object.fromEntries(
    Object.keys(alertFields).map((key) => [key, input[key]]),
  ) as Record<string, number | null>;
}
