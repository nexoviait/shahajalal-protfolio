import type { AppState, Company, JournalEntry, Row } from "./types";
import {
  accountBalance,
  balanceSheet,
  bankBalance,
  profitAndLoss,
  trialBalance,
} from "./accounting";
import { grossSalary, toPayroll } from "./payroll";
import { breakEven } from "./breakeven";
import { inRange, periodRange, type Range } from "./period";
import { dateParts, isoDate } from "./format";

export function currentRange(state: AppState, now = new Date()): Range {
  return periodRange(state.period, now, { from: state.customFrom, to: state.customTo });
}

/** Companies the signed-in user may see (owner/admin: all; others: assigned only). */
export function visibleCompanies(state: AppState): Company[] {
  const user = state.collections.users.find((u) => u.id === state.currentUserId);
  const role = String(user?.role ?? "");
  const assigned = String(user?.companyIds ?? "");
  if (role === "Group Owner" || role === "Group Administrator" || assigned === "all")
    return state.companies;
  const ids = assigned
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return state.companies.filter((c) => ids.includes(c.id));
}

/** Companies whose ledgers count for the current selection (visible ∩ active company). */
export function scopeCompanies(state: AppState): Company[] {
  const visible = visibleCompanies(state);
  return state.activeCompanyId === "all"
    ? visible
    : visible.filter((c) => c.id === state.activeCompanyId);
}

export function scopeIds(state: AppState): string[] {
  return scopeCompanies(state).map((c) => c.id);
}

/** Rows in a collection limited to the selected company scope and the user's access. */
export function scoped(state: AppState, rows: Row[]): Row[] {
  const ids = new Set(scopeIds(state));
  return rows.filter((r) => !r.companyId || ids.has(r.companyId));
}

export type CompanySummary = {
  companyId: string;
  revenue: number;
  expenses: number;
  profit: number;
  assets: number;
  liabilities: number;
  equity: number;
  cash: number;
  bank: number;
  receivables: number;
  payables: number;
  employees: number;
  monthlyPayroll: number;
  investment: number;
  fixedAssetsBook: number;
  breakEvenReached: boolean;
};

export function summarize(
  state: AppState,
  companyIds: string[],
  range: Range,
  opts: { consolidated?: boolean } = {},
): CompanySummary {
  const all = state.journal.filter((e) => companyIds.includes(e.companyId));
  const inPeriod = all.filter((e) => inRange(e.date, range));
  const upTo = all.filter((e) => e.date <= range.to);
  const pl = profitAndLoss(inPeriod, opts);
  const bs = balanceSheet(upTo, opts);
  const tb = trialBalance(upTo, opts);
  const emps = state.collections.employees.filter(
    (e) => e.status === "Active" && companyIds.includes(String(e.companyId)),
  );
  const monthlyPayroll = emps.reduce((s, e) => s + grossSalary(toPayroll(e)), 0);
  const investment = state.collections.investments
    .filter((i) => companyIds.includes(String(i.companyId)))
    .reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const fixedCost = accountBalance(tb, "1500") + accountBalance(tb, "1590");
  const fixedMonthly = state.companies
    .filter((c) => companyIds.includes(c.id))
    .reduce((s, c) => s + c.fixedMonthlyCosts, 0);
  return {
    companyId: companyIds.length === 1 ? (companyIds[0] ?? "group") : "group",
    revenue: pl.totalIncome,
    expenses: pl.totalExpenses,
    profit: pl.netProfit,
    assets: bs.totalAssets,
    liabilities: bs.totalLiabilities,
    equity: bs.totalEquity,
    cash: accountBalance(tb, "1100"),
    bank: bankBalance(tb),
    receivables: accountBalance(tb, "1400"),
    payables: accountBalance(tb, "2100"),
    employees: emps.length,
    monthlyPayroll,
    investment,
    fixedAssetsBook: fixedCost,
    breakEvenReached: fixedMonthly > 0 ? pl.totalIncome >= fixedMonthly : pl.netProfit > 0,
  };
}

export function lastMonths(count: number, now = new Date()): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function monthRange(month: string): Range {
  const [y, m] = dateParts(month);
  return { from: `${month}-01`, to: isoDate(new Date(y, m, 0)) };
}

export function entriesForMonth(entries: JournalEntry[], month: string): JournalEntry[] {
  return entries.filter((e) => e.date.startsWith(month));
}

/* ---------------- Notifications (derived live from data) ---------------- */

export type Notice = {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  companyId?: string | undefined;
  link: string;
};

export function deriveNotifications(state: AppState, now = new Date()): Notice[] {
  const out: Notice[] = [];
  const today = isoDate(now);
  const name = (id?: string) => state.companies.find((c) => c.id === id)?.name ?? "Group";
  const col = state.collections;

  // Daily report submitted / missing (active companies only).
  const active = state.companies.filter((c) => c.status === "Active");
  for (const c of active) {
    const todays = col.dailyReports.find((r) => r.companyId === c.id && r.date === today);
    if (!todays) {
      out.push({
        id: `report-missing:${c.id}:${today}`,
        type: "Daily Report Missing",
        severity: "warning",
        title: `${c.name} has not submitted today's report`,
        detail: `No daily report for ${today}.`,
        companyId: c.id,
        link: "/app/daily",
      });
    } else if (todays.status === "Submitted") {
      out.push({
        id: `report-new:${todays.id}`,
        type: "Daily Report Submitted",
        severity: "info",
        title: `${c.name} submitted today's report`,
        detail: "Awaiting owner review.",
        companyId: c.id,
        link: "/app/daily",
      });
    }
  }

  for (const a of col.approvals.filter((r) => r.status === "Pending")) {
    out.push({
      id: `approval:${a.id}`,
      type: "Expense Approval Required",
      severity: Number(a.amount) >= 1_000_000 ? "critical" : "warning",
      title: `${a.type}: ${a.reason}`,
      detail: `${name(a.companyId)} · requested by ${a.requestedBy}`,
      companyId: a.companyId,
      link: "/app/approvals",
    });
  }

  const soon = isoDate(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + state.settings.documentExpiryDays),
  );
  for (const d of col.documents) {
    const exp = String(d.expiryDate ?? "");
    if (!exp) continue;
    if (exp <= soon) {
      out.push({
        id: `doc-expiry:${d.id}`,
        type: "Document Expiry",
        severity: exp < today ? "critical" : "warning",
        title: `${d.title} ${exp < today ? "has expired" : "expires soon"}`,
        detail: `${name(d.companyId)} · expiry ${exp}`,
        companyId: d.companyId,
        link: "/app/documents",
      });
    }
  }

  for (const p of col.projects) {
    if (Number(p.actualCost) > Number(p.budget)) {
      out.push({
        id: `budget:${p.id}`,
        type: "Budget Exceeded",
        severity: "critical",
        title: `${p.name} is over budget`,
        detail: `Actual ${Number(p.actualCost).toLocaleString("en-BD")} vs budget ${Number(p.budget).toLocaleString("en-BD")}`,
        companyId: p.companyId,
        link: "/app/projects",
      });
    }
    const exp = String(p.expectedCompletion ?? "");
    if (exp && exp < today && p.status !== "Completed") {
      out.push({
        id: `deadline:${p.id}`,
        type: "Project Deadline",
        severity: "warning",
        title: `${p.name} is past its deadline`,
        detail: `Expected ${exp}`,
        companyId: p.companyId,
        link: "/app/projects",
      });
    }
  }

  for (const t of col.tasks) {
    const late =
      String(t.deadline ?? "") < today && t.status !== "Completed" && t.status !== "Cancelled";
    if (late || t.status === "Delayed") {
      out.push({
        id: `task:${t.id}`,
        type: "Overdue Task",
        severity: "warning",
        title: t.title as string,
        detail: `${name(t.companyId)} · due ${t.deadline}`,
        companyId: t.companyId,
        link: "/app/tasks",
      });
    }
  }

  for (const c of active) {
    const tb = trialBalance(state.journal.filter((e) => e.companyId === c.id));
    const cashTotal = accountBalance(tb, "1100") + bankBalance(tb);
    if (cashTotal < state.settings.lowCashThreshold) {
      out.push({
        id: `lowcash:${c.id}`,
        type: "Low Cash Balance",
        severity: "critical",
        title: `${c.name} cash is low`,
        detail: `Cash + bank ${Math.round(cashTotal).toLocaleString("en-BD")}`,
        companyId: c.id,
        link: "/app/treasury",
      });
    }
  }

  // Payroll due: payroll for the current month not yet posted.
  const month = today.slice(0, 7);
  for (const c of active) {
    const hasStaff = col.employees.some((e) => e.companyId === c.id && e.status === "Active");
    const posted = state.journal.some((e) => e.source === `payroll:${c.id}:${month}`);
    if (hasStaff && !posted && now.getDate() >= 25) {
      out.push({
        id: `payroll:${c.id}:${month}`,
        type: "Salary Payment Due",
        severity: "warning",
        title: `${c.name} payroll for ${month} is not posted`,
        detail: "Run payroll from HR & Payroll.",
        companyId: c.id,
        link: "/app/hr",
      });
    }
  }

  const unusual = detectExpenseAnomalies(state, now);
  for (const a of unusual) {
    out.push({
      id: `unusual:${a.companyId}:${a.month}`,
      type: "Unusual Expense",
      severity: "warning",
      title: `${name(a.companyId)} expenses are ${a.ratio.toFixed(1)}× its average`,
      detail: `${a.month}: ${Math.round(a.amount).toLocaleString("en-BD")} vs average ${Math.round(a.average).toLocaleString("en-BD")}`,
      companyId: a.companyId,
      link: "/app/finance",
    });
  }

  for (const r of col.dailyReports) {
    if (Number(r.requiredInvestment) > 0 && r.status !== "Approved") {
      out.push({
        id: `invest:${r.id}`,
        type: "Investment Required",
        severity: "info",
        title: `${name(r.companyId)} requests investment`,
        detail: `${Number(r.requiredInvestment).toLocaleString("en-BD")}`,
        companyId: r.companyId,
        link: "/app/daily",
      });
    }
  }

  const sev = { critical: 0, warning: 1, info: 2 } as const;
  return out.sort((a, b) => sev[a.severity] - sev[b.severity]);
}

export type Anomaly = {
  companyId: string;
  month: string;
  amount: number;
  average: number;
  ratio: number;
};

/** Month expenses > 1.6× the average of the previous months (and meaningfully large). */
export function detectExpenseAnomalies(
  state: AppState,
  now = new Date(),
  threshold = 1.6,
): Anomaly[] {
  const months = lastMonths(5, now);
  const current = months[months.length - 1] ?? "";
  const out: Anomaly[] = [];
  for (const c of state.companies) {
    const series = months.map((m) => {
      const entries = state.journal.filter((e) => e.companyId === c.id && e.date.startsWith(m));
      return profitAndLoss(entries, { consolidated: true }).totalExpenses;
    });
    const prior = series.slice(0, -1).filter((v) => v > 0);
    if (prior.length < 2) continue;
    const average = prior.reduce((s, v) => s + v, 0) / prior.length;
    const amount = series[series.length - 1] ?? 0;
    if (average > 0 && amount > average * threshold && amount - average > 100_000) {
      out.push({ companyId: c.id, month: current, amount, average, ratio: amount / average });
    }
  }
  return out;
}

/** Break-even status for a company from ledger averages (uses its configured fixed costs). */
export function companyBreakEvenStatus(state: AppState, companyId: string, now = new Date()) {
  const company = state.companies.find((c) => c.id === companyId);
  if (!company) return null;
  const months = lastMonths(3, now);
  const pls = months.map((m) =>
    profitAndLoss(
      state.journal.filter((e) => e.companyId === companyId && e.date.startsWith(m)),
      { consolidated: true },
    ),
  );
  const avgRevenue = pls.reduce((s, p) => s + p.totalIncome, 0) / pls.length;
  const avgExpenses = pls.reduce((s, p) => s + p.totalExpenses, 0) / pls.length;
  const fixed = company.fixedMonthlyCosts;
  const variableRatio = avgRevenue > 0 ? Math.max(0, (avgExpenses - fixed) / avgRevenue) : 0;
  const result = breakEven({
    initialInvestment: company.initialInvestment,
    fixedMonthlyCosts: fixed,
    variableCostPerUnit: variableRatio * 100,
    pricePerUnit: 100,
    expectedUnitsPerMonth: avgRevenue / 100,
  });
  return { avgRevenue, avgExpenses, result, reached: avgRevenue >= result.breakEvenRevenue };
}
