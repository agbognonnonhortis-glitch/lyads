// Display only: thresholds and metrics are computed in PostgreSQL, never here.
export function formatPerformanceAlert(row: any) {
  const e = row.evidence;
  const num = (n: number) =>
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
  const money = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: row.currency,
    }).format(n);
  const pct = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(n);
  const messages: Record<string, [string, string]> = {
    cpa_high: [
      "CPA au-dessus de la cible",
      `CPA observé : ${money(e.observed)} ; seuil : ${money(e.threshold)} ; cible : ${money(e.target)}.`,
    ],
    roas_low: [
      "ROAS sous la cible",
      `ROAS observé : ${num(e.observed)} ; seuil : ${num(e.threshold)} ; cible : ${num(e.target)}.`,
    ],
    creative_fatigue: [
      "Signaux de fatigue créative",
      `Fréquence quotidienne moyenne : ${num(e.daily_frequency)} (seuil ${num(e.frequency_threshold)}). CTR : ${pct(e.previous_ctr)} → ${pct(e.ctr)} ; CPA : ${money(e.previous_cpa)} → ${money(e.cpa)}. Comparaison avec la période précédente de même durée (${e.previous_days} jours observés, ${e.previous_purchases} achats).`,
    ],
    budget_imbalance: [
      "Dépenses déséquilibrées",
      `${pct(e.spend_share)} des dépenses sur des ensembles dont le CPA atteint au moins ${num(e.cpa_ratio_threshold)} fois le meilleur CPA (${money(e.best_cpa)}). Seuil : ${pct(e.share_threshold)} ; ${e.peer_count} ensembles comparables dans cette campagne.`,
    ],
  };
  const [title, message] = messages[row.detector];
  return {
    ...row,
    title: `${title} · ${row.entity_name}`,
    message: `${message} Période : ${row.since} au ${row.until} ; ${e.days} jours observés, ${e.purchases} achats, ${money(e.spend)} dépensés.`,
  };
}
