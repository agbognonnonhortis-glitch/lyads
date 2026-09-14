// Display only: thresholds and metrics are computed in PostgreSQL, never here.
export function formatPerformanceAlert(row: any) {
  const e = row.evidence;
  const event = e.result_event || "purchase";
  const resultLabel =
    event === "purchase"
      ? "achats"
      : ["lead", "complete_registration"].includes(event)
        ? "inscriptions"
        : "résultats";
  const costLabel =
    event === "purchase"
      ? "Coût par achat"
      : ["lead", "complete_registration"].includes(event)
        ? "Coût par inscription"
        : "Coût par résultat";
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
      "Coût par achat au-dessus de la cible",
      `Coût par achat observé : ${money(e.observed)} ; seuil : ${money(e.threshold)} ; cible : ${money(e.target)}.`,
    ],
    cpl_high: [
      "Coût par inscription au-dessus de la cible",
      `Coût par inscription observé : ${money(e.observed)} ; seuil : ${money(e.threshold)} ; cible : ${money(e.target)}.`,
    ],
    cpr_high: [
      "Coût par résultat au-dessus de la cible",
      `Coût par résultat observé : ${money(e.observed)} ; seuil : ${money(e.threshold)} ; cible : ${money(e.target)}.`,
    ],
    roas_low: [
      "ROAS sous la cible",
      `ROAS observé : ${num(e.observed)} ; seuil : ${num(e.threshold)} ; cible : ${num(e.target)}.`,
    ],
    creative_fatigue: [
      "Signaux de fatigue créative",
      `Fréquence quotidienne moyenne : ${num(e.daily_frequency)} (seuil ${num(e.frequency_threshold)}). CTR : ${pct(e.previous_ctr)} → ${pct(e.ctr)} ; ${costLabel.toLowerCase()} : ${money(e.previous_cpa)} → ${money(e.cpa)}. Comparaison avec la période précédente de même durée (${e.previous_days} jours observés, ${e.previous_results ?? e.previous_purchases} ${resultLabel}).`,
    ],
    budget_imbalance: [
      "Dépenses déséquilibrées",
      `${pct(e.spend_share)} des dépenses sur des ensembles dont le ${costLabel.toLowerCase()} atteint au moins ${num(e.cpa_ratio_threshold)} fois le meilleur coût (${money(e.best_cpa)}). Seuil : ${pct(e.share_threshold)} ; ${e.peer_count} ensembles comparables dans cette campagne.`,
    ],
  };
  const [title, message] = messages[row.detector];
  return {
    ...row,
    // All current detectors report a measured drift, not a confirmed outage.
    severity: "high",
    title: `${title} · ${row.entity_name}`,
    message: `${message} Période : ${row.since} au ${row.until} ; ${e.days} jours observés, ${e.results ?? e.purchases} ${resultLabel}, ${money(e.spend)} dépensés.`,
  };
}
