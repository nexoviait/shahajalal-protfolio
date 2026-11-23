import type { Row } from "./types";
import { dateParts, round2 } from "./format";

export type DepMethod = "Straight-Line" | "Written Down Value" | "Custom Schedule";
export const DEP_METHODS: DepMethod[] = ["Straight-Line", "Written Down Value", "Custom Schedule"];

export type DepInput = {
  purchasePrice: number;
  installationCost: number;
  salvageValue: number;
  usefulLifeYears: number;
  method: DepMethod;
  /** WDV rate in percent per year. */
  ratePercent: number;
  /** Custom method: comma separated yearly amounts, e.g. "500000,400000,300000". */
  customSchedule: string;
  purchaseDate: string;
};

export function depreciableBase(a: DepInput): number {
  return Math.max(0, a.purchasePrice + a.installationCost - a.salvageValue);
}

export function cost(a: DepInput): number {
  return a.purchasePrice + a.installationCost;
}

function customYears(s: string): number[] {
  return s
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n) && n >= 0);
}

/** Annual depreciation for the first year (Straight-Line / custom) or on current book value (WDV). */
export function annualDepreciation(a: DepInput, bookValue = cost(a), yearIndex = 0): number {
  if (a.method === "Straight-Line") {
    return a.usefulLifeYears > 0 ? round2(depreciableBase(a) / a.usefulLifeYears) : 0;
  }
  if (a.method === "Written Down Value") {
    const dep = bookValue * (a.ratePercent / 100);
    return round2(Math.max(0, Math.min(dep, bookValue - a.salvageValue)));
  }
  return customYears(a.customSchedule)[yearIndex] ?? 0;
}

/** Monthly depreciation charge for a given month offset (0 = purchase month). */
export function monthlyCharge(a: DepInput, monthsElapsed: number, bookValue: number): number {
  if (monthsElapsed < 0) return 0;
  const room = Math.max(0, round2(bookValue - a.salvageValue));
  if (room === 0) return 0;
  let charge: number;
  if (a.method === "Straight-Line") {
    if (monthsElapsed >= a.usefulLifeYears * 12) return 0;
    charge = annualDepreciation(a) / 12;
  } else if (a.method === "Written Down Value") {
    charge = (bookValue * (a.ratePercent / 100)) / 12;
  } else {
    charge = annualDepreciation(a, bookValue, Math.floor(monthsElapsed / 12)) / 12;
  }
  return round2(Math.min(charge, room));
}

export type ScheduleRow = {
  month: string;
  charge: number;
  accumulated: number;
  bookValue: number;
};

function ym(date: string, add: number): string {
  const [y, m] = dateParts(date);
  const d = new Date(y, m - 1 + add, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Month-by-month schedule starting the month after purchase. */
export function schedule(a: DepInput, months = a.usefulLifeYears * 12): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  let book = cost(a);
  let acc = 0;
  for (let i = 0; i < months; i++) {
    const charge = monthlyCharge(a, i, book);
    acc = round2(acc + charge);
    book = round2(book - charge);
    rows.push({ month: ym(a.purchaseDate, i + 1), charge, accumulated: acc, bookValue: book });
  }
  return rows;
}

/** Accumulated depreciation and book value as of a month (YYYY-MM). */
export function asOf(a: DepInput, month: string): { accumulated: number; bookValue: number } {
  const rows = schedule(a).filter((r) => r.month <= month);
  const last = rows[rows.length - 1];
  return last
    ? { accumulated: last.accumulated, bookValue: last.bookValue }
    : { accumulated: 0, bookValue: cost(a) };
}

/** Parse a generic Row into depreciation inputs. */
export function toDepInput(r: Row): DepInput {
  return {
    purchasePrice: Number(r.purchasePrice) || 0,
    installationCost: Number(r.installationCost) || 0,
    salvageValue: Number(r.salvageValue) || 0,
    usefulLifeYears: Number(r.usefulLifeYears) || 0,
    method: (r.method as DepMethod) || "Straight-Line",
    ratePercent: Number(r.ratePercent) || 0,
    customSchedule: String(r.customSchedule ?? ""),
    purchaseDate: String(r.purchaseDate ?? "") || "2000-01-01",
  };
}
