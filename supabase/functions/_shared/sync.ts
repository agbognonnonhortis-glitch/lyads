export function accountDate(timezone: string, at = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function shiftDate(date: string, days: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function dateWindows(end: string, days: number) {
  const windows: { since: string; until: string }[] = [];
  // Newest first, exactly `days` calendar days in the account timezone.
  for (let offset = 0; offset < days; offset += 7) {
    windows.push({
      since: shiftDate(end, -Math.min(days - 1, offset + 6)),
      until: shiftDate(end, -offset),
    });
  }
  return windows;
}
export const datasets = ["account", "campaign", "adset", "ad"].flatMap(
  (level) => [
    { level, breakdowns: "" },
    { level, breakdowns: "publisher_platform,platform_position" },
    { level, breakdowns: "age,gender" },
  ],
);
export function insightFields(level: string) {
  return [
    "account_id",
    ...(level === "campaign"
      ? ["campaign_id"]
      : level === "adset"
      ? ["adset_id"]
      : level === "ad"
      ? ["ad_id"]
      : []),
    "date_start",
    "date_stop",
    "spend",
    "impressions",
    "clicks",
    "reach",
    "frequency",
    "actions",
    "action_values",
  ].join(",");
}
export const structures = [
  {
    level: "campaign",
    edge: "campaigns",
    fields: "id,name,effective_status,objective,daily_budget,lifetime_budget",
  },
  {
    level: "adset",
    edge: "adsets",
    fields:
      "id,name,effective_status,campaign_id,daily_budget,lifetime_budget,start_time,end_time,optimization_goal,attribution_spec",
  },
  {
    level: "ad",
    edge: "ads",
    fields: "id,name,effective_status,adset_id,creative{id,name,thumbnail_url}",
  },
];

// Plan 2 visits the newest week across every dataset before older weeks.
// Keep the original array stable so in-flight plan 1 jobs resume safely.
export const dashboardDatasetOrder = [0, 3, 9, 1, 6, 4, 10, 7, 2, 5, 8, 11];
export function nextSlice(
  dataset: number,
  window: number,
  windows: number,
  newestFirst: boolean,
) {
  return newestFirst
    ? {
      dataset: (dataset + 1) % datasets.length,
      window: window + (dataset + 1 === datasets.length ? 1 : 0),
    }
    : {
      dataset: dataset + (window + 1 === windows ? 1 : 0),
      window: (window + 1) % windows,
    };
}
