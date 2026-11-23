/** Formatting helpers (BDT, lakh/crore grouping). */

export function money(amount: number, currency = "BDT"): string {
  const sign = amount < 0 ? "-" : "";
  const symbol = currency === "BDT" ? "৳" : `${currency} `;
  return `${sign}${symbol}${Math.abs(Math.round(amount)).toLocaleString("en-BD")}`;
}

/** Compact BDT used on dashboard tiles: ৳1.2Cr, ৳4.5L, ৳12k. */
export function moneyShort(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 10_000_000) return `${sign}৳${(abs / 10_000_000).toFixed(2)}Cr`;
  if (abs >= 100_000) return `${sign}৳${(abs / 100_000).toFixed(2)}L`;
  if (abs >= 1_000) return `${sign}৳${(abs / 1_000).toFixed(1)}k`;
  return `${sign}৳${Math.round(abs)}`;
}

export function percent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

/** Parse "YYYY-MM[-DD]" into numeric parts (day defaults to 1). */
export function dateParts(date: string): [number, number, number] {
  const [y, m, d] = date.split("-").map(Number);
  return [y ?? 1970, m ?? 1, d ?? 1];
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}
