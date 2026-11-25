import type { Row } from "./types";
import { dateParts, round2 } from "./format";

/**
 * Owner Central Financial Register: loans, credit cards, payables and receivables across
 * Personal, Company and Other scopes. This is a memorandum register kept separate from the
 * company ledgers, so a personal liability can never be mistaken for a company's.
 */

export const SCOPES = ["Personal", "Company", "Other"] as const;
export type Scope = (typeof SCOPES)[number];

export const KINDS = ["Loan Taken", "Loan Given", "Credit Card", "Payable", "Receivable"] as const;
export type Kind = (typeof KINDS)[number];

export const FREQUENCIES = ["One-time", "Monthly", "Quarterly"] as const;

const WE_OWE = new Set<string>(["Loan Taken", "Credit Card", "Payable"]);

/** True when the account is something the owner (or the company) must pay. */
export function weOwe(kind: unknown): boolean {
  return WE_OWE.has(String(kind));
}

/** Transactions that count towards balances (voided ones are kept for the audit trail only). */
export function activeTxns(txns: Row[], itemId: string): Row[] {
  return txns.filter((t) => t.itemId === itemId && t.status !== "Voided");
}

/** Opening amount + increases (new borrowing, charges, further lending) − settlements. */
export function outstanding(item: Row, txns: Row[]): number {
  let bal = Number(item.openingAmount) || 0;
  for (const t of activeTxns(txns, item.id)) {
    const a = Number(t.amount) || 0;
    bal += t.txnType === "Settlement" ? -a : a;
  }
  return round2(bal);
}

export function daysUntil(date: string, today: string): number {
  const [y, m, d] = dateParts(date);
  const [ty, tm, td] = dateParts(today);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000);
}

export type DueStage = "overdue" | "today" | "within3" | "within7" | "later" | "none";

/** Reminder stage: 7 days, 3 days, the due day, and overdue. */
export function dueStage(item: Row, balance: number, today: string): DueStage {
  if (item.status === "Closed" || balance <= 0 || !item.nextDueDate) return "none";
  const n = daysUntil(String(item.nextDueDate), today);
  if (n < 0) return "overdue";
  if (n === 0) return "today";
  if (n <= 3) return "within3";
  if (n <= 7) return "within7";
  return "later";
}

export function addPeriod(date: string, frequency: unknown): string {
  const months = frequency === "Monthly" ? 1 : frequency === "Quarterly" ? 3 : 0;
  if (months === 0) return date;
  const [y, m, d] = dateParts(date);
  const lastDay = new Date(y, m - 1 + months + 1, 0).getDate();
  const t = new Date(y, m - 1 + months, Math.min(d, lastDay));
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

/** The amount due on the next due date: the instalment, or the whole balance if none is set. */
export function dueAmount(item: Row, balance: number): number {
  const inst = Number(item.installmentAmount) || 0;
  return round2(inst > 0 ? Math.min(inst, balance) : balance);
}

export type RegisterSummary = {
  payable: number;
  receivable: number;
  net: number;
  overdueAmount: number;
  overdueCount: number;
  cardBalance: number;
  cardDue: number;
  accounts: number;
};

export function summarizeRegister(items: Row[], txns: Row[], today: string): RegisterSummary {
  const s: RegisterSummary = {
    payable: 0,
    receivable: 0,
    net: 0,
    overdueAmount: 0,
    overdueCount: 0,
    cardBalance: 0,
    cardDue: 0,
    accounts: 0,
  };
  for (const item of items) {
    if (item.status === "Closed") continue;
    const bal = outstanding(item, txns);
    if (bal <= 0) continue;
    s.accounts += 1;
    if (weOwe(item.kind)) s.payable += bal;
    else s.receivable += bal;
    if (item.kind === "Credit Card") {
      s.cardBalance += bal;
      if (item.nextDueDate) s.cardDue += dueAmount(item, bal);
    }
    if (dueStage(item, bal, today) === "overdue") {
      s.overdueCount += 1;
      s.overdueAmount += dueAmount(item, bal);
    }
  }
  s.payable = round2(s.payable);
  s.receivable = round2(s.receivable);
  s.net = round2(s.receivable - s.payable);
  s.overdueAmount = round2(s.overdueAmount);
  s.cardBalance = round2(s.cardBalance);
  s.cardDue = round2(s.cardDue);
  return s;
}

export type ScopeRow = { label: string; payable: number; receivable: number; net: number };

/** Payable / receivable split: Personal, one line per company, Other. */
export function byScope(
  items: Row[],
  txns: Row[],
  companyName: (id?: string) => string,
): ScopeRow[] {
  const map = new Map<string, ScopeRow>();
  for (const item of items) {
    if (item.status === "Closed") continue;
    const bal = outstanding(item, txns);
    if (bal <= 0) continue;
    const label =
      item.scope === "Company"
        ? `Company · ${companyName(item.companyId)}`
        : String(item.scope ?? "Other");
    const row = map.get(label) ?? { label, payable: 0, receivable: 0, net: 0 };
    if (weOwe(item.kind)) row.payable += bal;
    else row.receivable += bal;
    row.net = round2(row.receivable - row.payable);
    map.set(label, row);
  }
  const order = (l: string) => (l === "Personal" ? 0 : l.startsWith("Company") ? 1 : 2);
  return [...map.values()].sort(
    (a, b) => order(a.label) - order(b.label) || a.label.localeCompare(b.label),
  );
}

export type Installment = {
  date: string;
  itemId: string;
  title: string;
  party: string;
  kind: string;
  amount: number;
  direction: "pay" | "collect";
  overdue: boolean;
};

/** Upcoming instalments for the next `months` months, simulating the remaining balance. */
export function installmentSchedule(
  items: Row[],
  txns: Row[],
  today: string,
  months = 12,
): Installment[] {
  const [y, m, d] = dateParts(today);
  const end = new Date(y, m - 1 + months, d);
  const endIso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  const out: Installment[] = [];
  for (const item of items) {
    if (item.status === "Closed" || !item.nextDueDate) continue;
    let bal = outstanding(item, txns);
    if (bal <= 0) continue;
    let date = String(item.nextDueDate);
    const recurring = item.frequency === "Monthly" || item.frequency === "Quarterly";
    for (let i = 0; i < 120 && bal > 0 && date <= endIso; i++) {
      const amount = dueAmount(item, bal);
      out.push({
        date,
        itemId: item.id,
        title: String(item.title ?? ""),
        party: String(item.party ?? ""),
        kind: String(item.kind ?? ""),
        amount,
        direction: weOwe(item.kind) ? "pay" : "collect",
        overdue: date < today,
      });
      bal = round2(bal - amount);
      if (!recurring) break;
      date = addPeriod(date, item.frequency);
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

export type PartyLine = {
  item: Row;
  total: number;
  settled: number;
  balance: number;
  direction: "we owe" | "owed to us";
};

export type PartyStatement = {
  party: string;
  lines: PartyLine[];
  payable: number;
  receivable: number;
  net: number;
};

const norm = (s: unknown) =>
  String(s ?? "")
    .trim()
    .toLowerCase();

export function parties(items: Row[]): string[] {
  return [...new Set(items.map((i) => String(i.party ?? "").trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/** Everything owed to / by one party: total, settled and remaining, with the net position. */
export function partyStatement(items: Row[], txns: Row[], party: string): PartyStatement {
  const lines: PartyLine[] = [];
  for (const item of items) {
    if (norm(item.party) !== norm(party)) continue;
    const active = activeTxns(txns, item.id);
    const increases = active
      .filter((t) => t.txnType !== "Settlement")
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const settled = active
      .filter((t) => t.txnType === "Settlement")
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    lines.push({
      item,
      total: round2((Number(item.openingAmount) || 0) + increases),
      settled: round2(settled),
      balance: outstanding(item, txns),
      direction: weOwe(item.kind) ? "we owe" : "owed to us",
    });
  }
  const payable = round2(
    lines.filter((l) => l.direction === "we owe").reduce((s, l) => s + l.balance, 0),
  );
  const receivable = round2(
    lines.filter((l) => l.direction === "owed to us").reduce((s, l) => s + l.balance, 0),
  );
  return { party, lines, payable, receivable, net: round2(receivable - payable) };
}
