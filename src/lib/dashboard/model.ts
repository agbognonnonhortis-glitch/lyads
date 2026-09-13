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
