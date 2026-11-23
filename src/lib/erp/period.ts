import type { PeriodKey } from "./types";
import { isoDate } from "./format";

export type Range = { from: string; to: string };

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "This Week",
  month: "This Month",
  lastMonth: "Last Month",
  quarter: "Quarterly",
  year: "Yearly",
  custom: "Custom Range",
  all: "All Time",
};

/** Resolve a dashboard filter to an inclusive ISO date range. */
export function periodRange(
  key: PeriodKey,
  now: Date,
  custom?: { from: string; to: string },
): Range {
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = isoDate(now);
  switch (key) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const d = isoDate(new Date(y, m, now.getDate() - 1));
      return { from: d, to: d };
    }
    case "week": {
      const dow = (now.getDay() + 6) % 7; // Monday start
      return { from: isoDate(new Date(y, m, now.getDate() - dow)), to: today };
    }
    case "month":
      return { from: isoDate(new Date(y, m, 1)), to: isoDate(new Date(y, m + 1, 0)) };
    case "lastMonth":
      return { from: isoDate(new Date(y, m - 1, 1)), to: isoDate(new Date(y, m, 0)) };
    case "quarter": {
      const qStart = Math.floor(m / 3) * 3;
      return { from: isoDate(new Date(y, qStart, 1)), to: isoDate(new Date(y, qStart + 3, 0)) };
    }
    case "year":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "custom":
      return custom && custom.from && custom.to ? custom : { from: "0000-01-01", to: "9999-12-31" };
    case "all":
    default:
      return { from: "0000-01-01", to: "9999-12-31" };
  }
}

export function inRange(date: string, range: Range): boolean {
  return date >= range.from && date <= range.to;
}
