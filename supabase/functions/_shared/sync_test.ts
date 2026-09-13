import { accountDate, dateWindows, shiftDate } from "./sync.ts";
Deno.test(
  "90 calendar days, no overlap, including leap day and timezone boundaries",
  () => {
    const windows = dateWindows("2024-03-15", 90);
    const dates = [];
    for (const w of windows)
      for (let d = w.since; d <= w.until; d = shiftDate(d, 1)) dates.push(d);
    if (
      dates.length !== 90 ||
      new Set(dates).size !== 90 ||
      !dates.includes("2024-02-29")
    )
      throw new Error("Invalid history");
    if (
      accountDate("America/Los_Angeles", new Date("2026-09-13T01:00:00Z")) !==
      "2026-09-12"
    )
      throw new Error("Wrong timezone");
    if (dateWindows("2026-09-13", 7).length !== 1)
      throw new Error("Wrong revision");
  },
);
