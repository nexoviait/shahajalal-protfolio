import type { JournalEntry, Row } from "./types";
import { monthlyCharge, toDepInput, cost } from "./depreciation";
import { grossSalary, netSalary, toPayroll } from "./payroll";
import { dateParts, round2, uid } from "./format";

function mkEntry(
  companyId: string,
  date: string,
  memo: string,
  lines: JournalEntry["lines"],
  source: string,
  createdBy: string,
): JournalEntry {
  return {
    id: uid("je"),
    companyId,
    date,
    memo,
    lines,
    status: "posted",
    source,
    createdBy,
    createdAt: `${date}T09:00:00.000Z`,
  };
}

function monthEnd(month: string): string {
  const [y, m] = dateParts(month);
  const d = new Date(y, m, 0);
  return `${month}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = dateParts(from);
  const [ty, tm] = dateParts(to);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/** Entry that books the purchase of a fixed asset paid from bank. */
export function assetPurchaseEntry(asset: Row, createdBy: string): JournalEntry | null {
  const input = toDepInput(asset);
  const total = cost(input);
  if (!asset.companyId || total <= 0) return null;
  return mkEntry(
    String(asset.companyId),
    input.purchaseDate,
    `Purchase of ${asset.name}`,
    [
      { account: "1500", debit: total, credit: 0 },
      { account: "1200", debit: 0, credit: total },
    ],
    `asset:${asset.id}`,
    createdBy,
  );
}

/**
 * Depreciation entries for every month up to `upToMonth` that are not already posted.
 * Idempotent: keyed by `dep:<assetId>:<YYYY-MM>`.
 */
export function pendingDepreciation(
  assets: Row[],
  existing: JournalEntry[],
  upToMonth: string,
  createdBy: string,
): JournalEntry[] {
  const posted = new Set(existing.map((e) => e.source).filter(Boolean) as string[]);
  const out: JournalEntry[] = [];
  for (const asset of assets) {
    if (!asset.companyId || asset.status === "Disposed") continue;
    const input = toDepInput(asset);
    if (input.usefulLifeYears <= 0 && input.method !== "Written Down Value") continue;
    const start = input.purchaseDate.slice(0, 7);
    let book = cost(input);
    const months = monthsBetween(start, upToMonth).slice(1); // first charge the month after purchase
    months.forEach((month, i) => {
      const charge = monthlyCharge(input, i, book);
      book = round2(book - charge);
      const key = `dep:${asset.id}:${month}`;
      if (charge <= 0 || posted.has(key)) return;
      out.push(
        mkEntry(
          String(asset.companyId),
          monthEnd(month),
          `Depreciation ${asset.name} ${month}`,
          [
            { account: "5800", debit: charge, credit: 0 },
            { account: "1590", debit: 0, credit: charge },
          ],
          key,
          createdBy,
        ),
      );
    });
  }
  return out;
}

/** Payroll posting for one company-month, idempotent (`payroll:<company>:<YYYY-MM>`). */
export function payrollEntry(
  companyId: string,
  month: string,
  employees: Row[],
  existing: JournalEntry[],
  createdBy: string,
): JournalEntry | null {
  const source = `payroll:${companyId}:${month}`;
  if (existing.some((e) => e.source === source)) return null;
  const staff = employees.filter((e) => e.companyId === companyId && e.status === "Active");
  const gross = round2(staff.reduce((s, e) => s + grossSalary(toPayroll(e)), 0));
  const net = round2(staff.reduce((s, e) => s + netSalary(toPayroll(e)), 0));
  const withheld = round2(gross - net);
  if (gross <= 0) return null;
  const lines: JournalEntry["lines"] = [
    { account: "5100", debit: gross, credit: 0 },
    { account: "1200", debit: 0, credit: net },
  ];
  // Tax, deductions and loan recoveries withheld are owed onward (tax authority etc.).
  if (withheld > 0) lines.push({ account: "2200", debit: 0, credit: withheld });
  return mkEntry(companyId, monthEnd(month), `Payroll ${month}`, lines, source, createdBy);
}

export { monthsBetween, monthEnd, mkEntry };
