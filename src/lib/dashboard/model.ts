export const dashboardZones = [
  "context",
  "kpis",
  "series",
  "campaigns",
  "placements",
  "creatives",
  "alerts",
  "recommendations",
] as const;
export function connectionIssues(
  connections: {
    id: string;
    connection_status: string;
    token_checked_at: string | null;
    expires_at: string | null;
    data_access_expires_at: string | null;
    revoked_at: string | null;
    granted_scopes: string[];
  }[],
  now = Date.now(),
) {
  return connections.flatMap((c) => {
    const unavailable =
      c.revoked_at ||
      c.connection_status === "expired" ||
      [c.expires_at, c.data_access_expires_at].some(
        (expiry) => expiry && Date.parse(expiry) <= now,
      );
    const unverified = !c.token_checked_at;
    const noAdsRead = !c.granted_scopes.some((s) =>
      ["ads_read", "ads_management"].includes(s),
    );
    if (!unavailable && !unverified && !noAdsRead) return [];
    return [
      {
        id: c.id,
        kind: "connection",
        title: unavailable
          ? "Connexion Meta à renouveler"
          : unverified
            ? "Connexion Meta non vérifiée"
            : "Accès aux performances manquant",
        message: unavailable
          ? "La connexion Meta ne permet plus de synchroniser les données. Reconnectez votre Business Manager."
          : unverified
            ? "La connexion Meta n’a pas pu être vérifiée. Reconnectez votre Business Manager pour reprendre la remontée des données."
            : "L’autorisation de lire les performances publicitaires manque. Reconnectez votre Business Manager pour l’accorder.",
      },
    ];
  });
}
export function validDate(value: string | null): value is string {
  return (
    !!value &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function periodDates(since: string, until: string) {
  const days =
    Math.round((Date.parse(until) - Date.parse(since)) / 86400000) + 1;
  if (!validDate(since) || !validDate(until) || days < 1 || days > 90)
    throw new Error("INVALID_PERIOD");
  const shift = (value: string, n: number) =>
    new Date(Date.parse(value) + n * 86400000).toISOString().slice(0, 10);
  return {
    since,
    until,
    days,
    previousSince: shift(since, -days),
    previousUntil: shift(since, -1),
  };
}
export function freshness(
  accounts: { id: string; synchronized_at: string | null }[],
) {
  const complete =
    accounts.length > 0 && accounts.every((a) => a.synchronized_at);
  return {
    lastSynchronizedAt: complete
      ? accounts
          .map((a) => a.synchronized_at!)
          .sort((a, b) => Date.parse(a) - Date.parse(b))[0]
      : null,
    accounts: accounts.map((a) => ({
      id: a.id,
      lastSynchronizedAt: a.synchronized_at,
    })),
    complete,
  };
}
