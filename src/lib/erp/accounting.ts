import type { Account, AccountType, JournalEntry, JournalLine } from "./types";
import { round2 } from "./format";
import { inRange, type Range } from "./period";

export const CHART: Account[] = [
  { code: "1100", name: "Cash in Hand", type: "asset" },
  { code: "1200", name: "Bank – Primary Account", type: "asset" },
  { code: "1210", name: "Bank – Account 2", type: "asset" },
  { code: "1220", name: "Bank – Account 3", type: "asset" },
  { code: "1300", name: "Intercompany Receivable", type: "asset", intercompany: true },
  { code: "1400", name: "Accounts Receivable", type: "asset" },
  { code: "1500", name: "Fixed Assets (at cost)", type: "asset" },
  { code: "1590", name: "Accumulated Depreciation", type: "asset" },
  { code: "2100", name: "Accounts Payable", type: "liability" },
  { code: "2200", name: "Tax & VAT Payable", type: "liability" },
  { code: "2300", name: "Intercompany Payable", type: "liability", intercompany: true },
  { code: "2400", name: "Loans Payable", type: "liability" },
  { code: "3100", name: "Owner / Share Capital", type: "equity" },
  { code: "4100", name: "Sales Revenue", type: "income" },
  { code: "4200", name: "Service Revenue", type: "income" },
  { code: "4300", name: "Project Revenue", type: "income" },
  { code: "4400", name: "Rental Income", type: "income" },
  { code: "4500", name: "Investment Income", type: "income" },
  { code: "4600", name: "Other Income", type: "income" },
  { code: "4900", name: "Intercompany Revenue", type: "income", intercompany: true },
  { code: "5100", name: "Employee Salaries", type: "expense" },
  { code: "5200", name: "Office Rent", type: "expense" },
  { code: "5300", name: "Utilities", type: "expense" },
  { code: "5400", name: "Marketing", type: "expense" },
  { code: "5500", name: "Transportation", type: "expense" },
  { code: "5600", name: "Maintenance", type: "expense" },
  { code: "5700", name: "Equipment Purchases", type: "expense" },
  { code: "5710", name: "Raw Materials", type: "expense" },
  { code: "5720", name: "Construction Expenses", type: "expense" },
  { code: "5730", name: "Administrative Expenses", type: "expense" },
  { code: "5740", name: "Tax and VAT", type: "expense" },
  { code: "5750", name: "Other Expenses", type: "expense" },
  { code: "5800", name: "Depreciation Expense", type: "expense" },
  { code: "5900", name: "Intercompany Expense", type: "expense", intercompany: true },
];

export const ACCOUNT_BY_CODE: Record<string, Account> = Object.fromEntries(
  CHART.map((a) => [a.code, a]),
);

export const INCOME_ACCOUNTS = CHART.filter((a) => a.type === "income" && !a.intercompany);
export const EXPENSE_ACCOUNTS = CHART.filter(
  (a) => a.type === "expense" && !a.intercompany && a.code !== "5800",
);

const DEBIT_NORMAL: AccountType[] = ["asset", "expense"];

export function isDebitNormal(type: AccountType): boolean {
  return DEBIT_NORMAL.includes(type);
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

/** A journal entry must balance and reference known accounts. */
export function validateLines(lines: JournalLine[]): ValidationResult {
  if (lines.length < 2) return { ok: false, error: "An entry needs at least two lines." };
  for (const l of lines) {
    if (!ACCOUNT_BY_CODE[l.account]) return { ok: false, error: `Unknown account ${l.account}.` };
    if (l.debit < 0 || l.credit < 0) return { ok: false, error: "Amounts cannot be negative." };
    if (l.debit > 0 === l.credit > 0)
      return { ok: false, error: "Each line must have either a debit or a credit." };
  }
  const debit = round2(lines.reduce((s, l) => s + l.debit, 0));
  const credit = round2(lines.reduce((s, l) => s + l.credit, 0));
  if (debit <= 0) return { ok: false, error: "Entry total must be greater than zero." };
  if (debit !== credit)
    return { ok: false, error: `Debits (${debit}) must equal credits (${credit}).` };
  return { ok: true };
}

/** Mirror lines that reverse an existing entry. */
export function reverseLines(lines: JournalLine[]): JournalLine[] {
  return lines.map((l) => ({ account: l.account, debit: l.credit, credit: l.debit }));
}

export type Balance = {
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
};

/** Entries that count: reversed originals and their reversals net to zero, so keep both. */
export function filterEntries(
  entries: JournalEntry[],
  opts: { companyIds?: string[]; range?: Range; consolidated?: boolean },
): JournalEntry[] {
  return entries.filter((e) => {
    if (opts.companyIds && !opts.companyIds.includes(e.companyId)) return false;
    if (opts.range && !inRange(e.date, opts.range)) return false;
    return true;
  });
}

export function trialBalance(
  entries: JournalEntry[],
  opts: { consolidated?: boolean } = {},
): Balance[] {
  const map = new Map<string, Balance>();
  for (const e of entries) {
    for (const l of e.lines) {
      const acc = ACCOUNT_BY_CODE[l.account];
      if (!acc) continue;
      if (opts.consolidated && acc.intercompany) continue; // eliminate internal transactions
      const b = map.get(acc.code) ?? {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        debit: 0,
        credit: 0,
      };
      b.debit = round2(b.debit + l.debit);
      b.credit = round2(b.credit + l.credit);
      map.set(acc.code, b);
    }
  }
  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
}

export function netBalance(b: Pick<Balance, "type" | "debit" | "credit">): number {
  return round2(isDebitNormal(b.type) ? b.debit - b.credit : b.credit - b.debit);
}

/** Sum of all bank accounts. */
export function bankBalance(tb: Balance[]): number {
  return round2(BANK_CODES.reduce((s, c) => s + accountBalance(tb, c), 0));
}

export function accountBalance(tb: Balance[], code: string): number {
  const b = tb.find((x) => x.code === code);
  return b ? netBalance(b) : 0;
}

export type ProfitAndLoss = {
  income: { code: string; name: string; amount: number }[];
  expenses: { code: string; name: string; amount: number }[];
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
};

export function profitAndLoss(
  entries: JournalEntry[],
  opts: { consolidated?: boolean } = {},
): ProfitAndLoss {
  const tb = trialBalance(entries, opts);
  const pick = (type: AccountType) =>
    tb
      .filter((b) => b.type === type)
      .map((b) => ({ code: b.code, name: b.name, amount: netBalance(b) }))
      .filter((r) => r.amount !== 0);
  const income = pick("income");
  const expenses = pick("expense");
  const totalIncome = round2(income.reduce((s, r) => s + r.amount, 0));
  const totalExpenses = round2(expenses.reduce((s, r) => s + r.amount, 0));
  return {
    income,
    expenses,
    totalIncome,
    totalExpenses,
    netProfit: round2(totalIncome - totalExpenses),
  };
}

export type BalanceSheet = {
  assets: { code: string; name: string; amount: number }[];
  liabilities: { code: string; name: string; amount: number }[];
  equity: { code: string; name: string; amount: number }[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  balanced: boolean;
};

/** Balance sheet from all entries up to a date. Retained earnings = cumulative net profit. */
export function balanceSheet(
  entries: JournalEntry[],
  opts: { consolidated?: boolean } = {},
): BalanceSheet {
  const tb = trialBalance(entries, opts);
  const pick = (type: AccountType) =>
    tb
      .filter((b) => b.type === type)
      .map((b) => ({ code: b.code, name: b.name, amount: netBalance(b) }))
      .filter((r) => r.amount !== 0);
  const assets = pick("asset");
  const liabilities = pick("liability");
  const equity = pick("equity");
  const pl = profitAndLoss(entries, opts);
  if (pl.netProfit !== 0)
    equity.push({ code: "3900", name: "Retained Earnings", amount: pl.netProfit });
  const sum = (rows: { amount: number }[]) => round2(rows.reduce((s, r) => s + r.amount, 0));
  const totalAssets = sum(assets);
  const totalLiabilities = sum(liabilities);
  const totalEquity = sum(equity);
  return {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    balanced: round2(totalAssets - totalLiabilities - totalEquity) === 0,
  };
}

export type CashFlow = { operating: number; investing: number; financing: number; net: number };

/** Ledger accounts that hold bank balances (multiple bank accounts per company). */
export const BANK_CODES = ["1200", "1210", "1220"];

const CASH = new Set(["1100", ...BANK_CODES]);
const INVESTING = new Set(["1500"]);
const FINANCING = new Set(["3100", "2400", "1300", "2300"]);

/** Direct-method cash flow classified by the counter-account of each cash movement. */
export function cashFlow(entries: JournalEntry[]): CashFlow {
  let operating = 0;
  let investing = 0;
  let financing = 0;
  for (const e of entries) {
    const delta = e.lines
      .filter((l) => CASH.has(l.account))
      .reduce((s, l) => s + l.debit - l.credit, 0);
    if (delta === 0) continue;
    const others = e.lines.filter((l) => !CASH.has(l.account)).map((l) => l.account);
    if (others.some((a) => INVESTING.has(a))) investing += delta;
    else if (others.some((a) => FINANCING.has(a))) financing += delta;
    else operating += delta;
  }
  operating = round2(operating);
  investing = round2(investing);
  financing = round2(financing);
  return { operating, investing, financing, net: round2(operating + investing + financing) };
}

export type LedgerRow = {
  date: string;
  entryId: string;
  memo: string;
  debit: number;
  credit: number;
  running: number;
};

export function generalLedger(entries: JournalEntry[], code: string): LedgerRow[] {
  const acc = ACCOUNT_BY_CODE[code];
  if (!acc) return [];
  const rows: LedgerRow[] = [];
  let running = 0;
  const sorted = [...entries].sort(
    (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
  );
  for (const e of sorted) {
    for (const l of e.lines) {
      if (l.account !== code) continue;
      running = round2(
        running + (isDebitNormal(acc.type) ? l.debit - l.credit : l.credit - l.debit),
      );
      rows.push({
        date: e.date,
        entryId: e.id,
        memo: e.memo,
        debit: l.debit,
        credit: l.credit,
        running,
      });
    }
  }
  return rows;
}

/* ---------- Posting helpers (build balanced entries) ---------- */

export type PayMode = "cash" | "bank" | "credit";

export function incomeLines(
  account: string,
  amount: number,
  mode: PayMode,
  bank = "1200",
): JournalLine[] {
  const debitAccount = mode === "cash" ? "1100" : mode === "bank" ? bank : "1400";
  return [
    { account: debitAccount, debit: amount, credit: 0 },
    { account, debit: 0, credit: amount },
  ];
}

export function expenseLines(
  account: string,
  amount: number,
  mode: PayMode,
  bank = "1200",
): JournalLine[] {
  const creditAccount = mode === "cash" ? "1100" : mode === "bank" ? bank : "2100";
  return [
    { account, debit: amount, credit: 0 },
    { account: creditAccount, debit: 0, credit: amount },
  ];
}

/** Intercompany loan: lender books a receivable, borrower books a payable. */
export function intercompanyLoanEntries(
  lenderId: string,
  borrowerId: string,
  amount: number,
): { companyId: string; lines: JournalLine[] }[] {
  return [
    {
      companyId: lenderId,
      lines: [
        { account: "1300", debit: amount, credit: 0 },
        { account: "1200", debit: 0, credit: amount },
      ],
    },
    {
      companyId: borrowerId,
      lines: [
        { account: "1200", debit: amount, credit: 0 },
        { account: "2300", debit: 0, credit: amount },
      ],
    },
  ];
}

/** Intercompany service: provider books revenue, receiver books expense. */
export function intercompanyServiceEntries(
  providerId: string,
  receiverId: string,
  amount: number,
): { companyId: string; lines: JournalLine[] }[] {
  return [
    {
      companyId: providerId,
      lines: [
        { account: "1300", debit: amount, credit: 0 },
        { account: "4900", debit: 0, credit: amount },
      ],
    },
    {
      companyId: receiverId,
      lines: [
        { account: "5900", debit: amount, credit: 0 },
        { account: "2300", debit: 0, credit: amount },
      ],
    },
  ];
}

/** Cash + bank position for entries. */
export function cashPosition(entries: JournalEntry[]): { cash: number; bank: number } {
  const tb = trialBalance(entries);
  return { cash: accountBalance(tb, "1100"), bank: bankBalance(tb) };
}

export function monthlySeries(
  entries: JournalEntry[],
  months: string[],
): { month: string; income: number; expenses: number; profit: number }[] {
  return months.map((month) => {
    const pl = profitAndLoss(
      entries.filter((e) => e.date.startsWith(month)),
      { consolidated: true },
    );
    return { month, income: pl.totalIncome, expenses: pl.totalExpenses, profit: pl.netProfit };
  });
}
