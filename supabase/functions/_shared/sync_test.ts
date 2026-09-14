import {
  accountDate,
  dashboardDatasetOrder,
  datasets,
  dateWindows,
  nextSlice,
  shiftDate,
} from "./sync.ts";
Deno.test(
  "90 calendar days, no overlap, including leap day and timezone boundaries",
  () => {
    const windows = dateWindows("2024-03-15", 90);
    const dates = [];
    for (const w of windows) {
      for (let d = w.since; d <= w.until; d = shiftDate(d, 1)) dates.push(d);
    }
    if (
      dates.length !== 90 ||
      new Set(dates).size !== 90 ||
      !dates.includes("2024-02-29")
    ) {
      throw new Error("Invalid history");
    }
    if (
      accountDate("America/Los_Angeles", new Date("2026-09-13T01:00:00Z")) !==
        "2026-09-12"
    ) {
      throw new Error("Wrong timezone");
    }
    if (dateWindows("2026-09-13", 7).length !== 1) {
      throw new Error("Wrong revision");
    }
  },
);

Deno.test("Newest-first sync covers each slice once and keeps legacy cursors compatible", () => {
  const n = dateWindows("2026-09-14", 90).length;
  let d = 0, w = 0;
  const seen = new Set<string>();
  while (w < n) {
    seen.add(`${w}:${dashboardDatasetOrder[d]}`);
    ({ dataset: d, window: w } = nextSlice(d, w, n, true));
  }
  if (seen.size !== n * datasets.length) {
    throw new Error("Skipped or duplicated slice");
  }
  if (
    [...seen][0] !== "0:0" || [...seen][1] !== "0:3" || [...seen][2] !== "0:9"
  ) throw new Error("Dashboard datasets not first");
  if (
    nextSlice(2, n - 1, n, false).dataset !== 3 ||
    nextSlice(2, n - 1, n, false).window !== 0
  ) throw new Error("Legacy cursor changed");
});
