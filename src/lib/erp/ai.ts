import type { AppState } from "./types";
import { accountBalance, bankBalance, profitAndLoss, trialBalance } from "./accounting";
import {
  companyBreakEvenStatus,
  deriveNotifications,
  detectExpenseAnomalies,
  lastMonths,
  monthRange,
  summarize,
} from "./analytics";
import { grossSalary, toPayroll } from "./payroll";
import { isoDate, money } from "./format";

/**
 * Rule-based "AI CFO". It only reads recorded ledger and register data, always states the
 * period and source figures, never invents numbers and never executes transactions.
 * A hosted LLM can be layered on top later through a secure server-side data access layer.
 */
export type AiAnswer = {
  answer: string;
  period: string;
  sources: string[];
  supported: boolean;
};

export const EXAMPLE_QUESTIONS = [
  "Which company spent the most money this month?",
  "Which company is currently generating the highest profit?",
  "How much money does the entire group need for next month's payroll?",
  "How much additional investment does Best Health Diagnostic require?",
  "When will Bag E Rahmat Holdings reach its projected break-even point?",
  "Which company has not submitted today's report?",
  "Compare this month's revenue with last month.",
];

function findCompany(state: AppState, q: string) {
  const text = q.toLowerCase();
  return state.companies.find((c) => {
    const n = c.name.toLowerCase();
    const short = n.replace(/\b(ltd\.?|limited|holdings)\b/g, "").trim();
    return text.includes(n) || (short.length > 3 && text.includes(short));
  });
}

function perCompany(state: AppState, month: string) {
  const range = monthRange(month);
  return state.companies
    .filter((c) => c.status !== "Planned")
    .map((c) => {
      const pl = profitAndLoss(
        state.journal.filter(
          (e) => e.companyId === c.id && e.date >= range.from && e.date <= range.to,
        ),
        { consolidated: true },
      );
      return {
        company: c,
        revenue: pl.totalIncome,
        expenses: pl.totalExpenses,
        profit: pl.netProfit,
      };
    });
}

export function answerQuestion(state: AppState, question: string, now = new Date()): AiAnswer {
  const q = question.toLowerCase();
  const months = lastMonths(2, now);
  const thisMonth = months[1] ?? isoDate(now).slice(0, 7);
  const lastMonth = months[0] ?? thisMonth;
  const today = isoDate(now);

  if (/(spent|spend|expense).*(most|highest)|most.*(spent|expense)/.test(q)) {
    const rows = perCompany(state, thisMonth).sort((a, b) => b.expenses - a.expenses);
    const top = rows[0];
    return {
      answer: top
        ? `${top.company.name} spent the most in ${thisMonth}: ${money(top.expenses)}.`
        : "No expense data is recorded for this month.",
      period: thisMonth,
      sources: rows.slice(0, 4).map((r) => `${r.company.name}: expenses ${money(r.expenses)}`),
      supported: true,
    };
  }

  if (/(highest|most|top|best).*(profit)|profit.*(highest|most)/.test(q)) {
    const rows = perCompany(state, thisMonth).sort((a, b) => b.profit - a.profit);
    const top = rows[0];
    return {
      answer: top
        ? `${top.company.name} has the highest profit in ${thisMonth}: ${money(top.profit)} (revenue ${money(top.revenue)}, expenses ${money(top.expenses)}).`
        : "No profit data is recorded for this month.",
      period: thisMonth,
      sources: rows.slice(0, 4).map((r) => `${r.company.name}: profit ${money(r.profit)}`),
      supported: true,
    };
  }

  if (/payroll|salary|salaries/.test(q) && /(next month|group|entire|total)/.test(q)) {
    const staff = state.collections.employees.filter((e) => e.status === "Active");
    const total = staff.reduce((s, e) => s + grossSalary(toPayroll(e)), 0);
    const byCompany = state.companies
      .map((c) => ({
        name: c.name,
        amount: staff
          .filter((e) => e.companyId === c.id)
          .reduce((s, e) => s + grossSalary(toPayroll(e)), 0),
      }))
      .filter((r) => r.amount > 0);
    return {
      answer: `The group needs about ${money(total)} for next month's gross payroll across ${staff.length} active employees.`,
      period: "Next month (based on current employee register)",
      sources: byCompany.map((r) => `${r.name}: ${money(r.amount)}`),
      supported: true,
    };
  }

  if (/additional investment|investment.*(require|need)|need.*investment/.test(q)) {
    const c = findCompany(state, q);
    if (c) {
      const tb = trialBalance(state.journal.filter((e) => e.companyId === c.id));
      const cash = accountBalance(tb, "1100") + bankBalance(tb);
      const asked = state.collections.dailyReports
        .filter((r) => r.companyId === c.id && r.status !== "Approved")
        .reduce((s, r) => s + (Number(r.requiredInvestment) || 0), 0);
      const pending = state.collections.approvals
        .filter((a) => a.companyId === c.id && a.status === "Pending")
        .reduce((s, a) => s + (Number(a.amount) || 0), 0);
      const need = Math.max(0, asked + pending - cash);
      return {
        answer: `${c.name} has ${money(pending)} in pending approval requests and ${money(asked)} of requested investment in reports, against ${money(cash)} cash and bank. Estimated additional funding needed: ${money(need)}.`,
        period: `As of ${today}`,
        sources: [
          `Cash + bank: ${money(cash)}`,
          `Pending approvals: ${money(pending)}`,
          `Investment requested in daily reports: ${money(asked)}`,
        ],
        supported: true,
      };
    }
  }

  if (/break.?even/.test(q)) {
    const c = findCompany(state, q);
    if (c) {
      const be = companyBreakEvenStatus(state, c.id, now);
      if (be) {
        const need = be.result.breakEvenRevenue;
        if (!Number.isFinite(need)) {
          return {
            answer: `Break-even for ${c.name} cannot be computed: no positive contribution margin in recorded data.`,
            period: "Last 3 months",
            sources: [
              `Average revenue ${money(be.avgRevenue)}`,
              `Average expenses ${money(be.avgExpenses)}`,
            ],
            supported: true,
          };
        }
        const answer = be.reached
          ? `${c.name} has already reached break-even: average monthly revenue ${money(be.avgRevenue)} vs break-even revenue ${money(need)}.`
          : `${c.name} has not reached break-even yet: average monthly revenue ${money(be.avgRevenue)} vs required ${money(need)}.`;
        return {
          answer,
          period: "Last 3 months average",
          sources: [
            `Fixed monthly costs: ${money(c.fixedMonthlyCosts)}`,
            `Average expenses: ${money(be.avgExpenses)}`,
            `Break-even revenue: ${money(need)}`,
          ],
          supported: true,
        };
      }
    }
  }

  if (/(not|haven't|hasn't|yet to).*(submit)|missing.*report|report.*missing/.test(q)) {
    const missing = state.companies.filter(
      (c) =>
        c.status === "Active" &&
        !state.collections.dailyReports.some((r) => r.companyId === c.id && r.date === today),
    );
    return {
      answer: missing.length
        ? `Companies without today's report: ${missing.map((c) => c.name).join(", ")}.`
        : "All active companies have submitted today's report.",
      period: today,
      sources: [
        `Active companies checked: ${state.companies.filter((c) => c.status === "Active").length}`,
      ],
      supported: true,
    };
  }

  if (/compare|versus|vs/.test(q) && /revenue/.test(q)) {
    const cur = perCompany(state, thisMonth).reduce((s, r) => s + r.revenue, 0);
    const prev = perCompany(state, lastMonth).reduce((s, r) => s + r.revenue, 0);
    const diff = cur - prev;
    const pct = prev ? (diff / prev) * 100 : 0;
    return {
      answer: `Group revenue is ${money(cur)} in ${thisMonth} versus ${money(prev)} in ${lastMonth} (${diff >= 0 ? "+" : ""}${money(diff)}, ${pct.toFixed(1)}%). ${thisMonth} is a month in progress.`,
      period: `${lastMonth} vs ${thisMonth}`,
      sources: [`${thisMonth}: ${money(cur)}`, `${lastMonth}: ${money(prev)}`],
      supported: true,
    };
  }

  return {
    answer:
      "I can only answer from recorded data, and I could not match that question to a supported analysis. Try one of the example questions.",
    period: "—",
    sources: [],
    supported: false,
  };
}

export function dailySummary(state: AppState, now = new Date()): string[] {
  const today = isoDate(now);
  const reports = state.collections.dailyReports.filter((r) => r.date === today);
  const missing = state.companies.filter(
    (c) => c.status === "Active" && !reports.some((r) => r.companyId === c.id),
  );
  const revenue = reports.reduce((s, r) => s + (Number(r.revenue) || 0), 0);
  const expenses = reports.reduce((s, r) => s + (Number(r.expenses) || 0), 0);
  const notices = deriveNotifications(state, now);
  const lines = [
    `${reports.length} report(s) submitted today; revenue reported ${money(revenue)}, expenses ${money(expenses)}.`,
    missing.length
      ? `Missing today: ${missing.map((c) => c.name).join(", ")}.`
      : "No missing reports today.",
    `${notices.filter((n) => n.severity === "critical").length} critical and ${notices.filter((n) => n.severity === "warning").length} warning alert(s) need attention.`,
  ];
  return lines;
}

export type Forecast = {
  month: string;
  projectedRevenue: number;
  projectedExpenses: number;
  projectedCash: number;
};

/** Linear-trend forecast of the group's revenue, expenses and cash for the next N months. */
export function forecast(state: AppState, horizon = 3, now = new Date()): Forecast[] {
  const hist = lastMonths(4, now).slice(0, -1); // completed months only
  const pls = hist.map((m) => {
    const r = monthRange(m);
    return profitAndLoss(
      state.journal.filter((e) => e.date >= r.from && e.date <= r.to),
      { consolidated: true },
    );
  });
  const slope = (vals: number[]) =>
    vals.length > 1 ? ((vals[vals.length - 1] ?? 0) - (vals[0] ?? 0)) / (vals.length - 1) : 0;
  const rev = pls.map((p) => p.totalIncome);
  const lastRev = rev[rev.length - 1] ?? 0;
  const lastExp = pls[pls.length - 1]?.totalExpenses ?? 0;
  const exp = pls.map((p) => p.totalExpenses);
  const rs = slope(rev);
  const es = slope(exp);
  const sum = summarize(
    state,
    state.companies.map((c) => c.id),
    { from: "0000-01-01", to: isoDate(now) },
    { consolidated: true },
  );
  let cash = sum.cash + sum.bank;
  const out: Forecast[] = [];
  for (let i = 1; i <= horizon; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const pr = Math.max(0, lastRev + rs * i);
    const pe = Math.max(0, lastExp + es * i);
    cash += pr - pe;
    out.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      projectedRevenue: pr,
      projectedExpenses: pe,
      projectedCash: cash,
    });
  }
  return out;
}

export function riskReport(state: AppState, now = new Date()): string[] {
  const risks: string[] = [];
  for (const a of detectExpenseAnomalies(state, now)) {
    const c = state.companies.find((x) => x.id === a.companyId);
    risks.push(
      `${c?.name}: ${a.month} expenses ${money(a.amount)} are ${a.ratio.toFixed(1)}× the recent average (${money(a.average)}).`,
    );
  }
  deriveNotifications(state, now)
    .filter((n) => ["Low Cash Balance", "Budget Exceeded", "Document Expiry"].includes(n.type))
    .forEach((n) => risks.push(`${n.title} — ${n.detail}`));
  return risks;
}
