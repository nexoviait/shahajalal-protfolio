import { beforeEach, describe, expect, it } from "vitest";

import {
  balanceSheet,
  cashFlow,
  expenseLines,
  incomeLines,
  intercompanyLoanEntries,
  intercompanyServiceEntries,
  profitAndLoss,
  trialBalance,
  validateLines,
} from "@/lib/erp/accounting";
import { answerQuestion } from "@/lib/erp/ai";
import { deriveNotifications, summarize } from "@/lib/erp/analytics";
import { breakEven, scenarios } from "@/lib/erp/breakeven";
import { annualDepreciation, asOf, schedule, type DepInput } from "@/lib/erp/depreciation";
import { toCSV } from "@/lib/erp/export";
import { netSalary } from "@/lib/erp/payroll";
import { periodRange } from "@/lib/erp/period";
import { canAccessCompany, canEdit, canView } from "@/lib/erp/rbac";
import { buildSeed } from "@/lib/erp/seed";
import { companies, data, getState, ledger, system, ui } from "@/lib/erp/store";
import type { JournalEntry } from "@/lib/erp/types";

const REF = new Date(2026, 10, 23); // 23 Nov 2026

const buildStatus = (id: string) =>
  getState().collections.approvals.find((a) => a.id === id)?.status;

function entry(companyId: string, lines: JournalEntry["lines"], date = "2026-11-01"): JournalEntry {
  return {
    id: `e-${Math.random()}`,
    companyId,
    date,
    memo: "t",
    lines,
    status: "posted",
    createdBy: "t",
    createdAt: date,
  };
}

describe("double-entry accounting", () => {
  it("rejects unbalanced or malformed entries", () => {
    expect(validateLines([{ account: "1100", debit: 100, credit: 0 }]).ok).toBe(false);
    expect(
      validateLines([
        { account: "1100", debit: 100, credit: 0 },
        { account: "4100", debit: 0, credit: 90 },
      ]).ok,
    ).toBe(false);
    expect(
      validateLines([
        { account: "9999", debit: 100, credit: 0 },
        { account: "4100", debit: 0, credit: 100 },
      ]).ok,
    ).toBe(false);
    expect(validateLines(incomeLines("4100", 500, "cash")).ok).toBe(true);
  });

  it("keeps the trial balance and balance sheet in balance", () => {
    const entries = [
      entry("a", [
        { account: "1200", debit: 1000, credit: 0 },
        { account: "3100", debit: 0, credit: 1000 },
      ]),
      entry("a", incomeLines("4100", 400, "bank")),
      entry("a", expenseLines("5300", 150, "cash")),
    ];
    const tb = trialBalance(entries);
    const d = tb.reduce((s, b) => s + b.debit, 0);
    const c = tb.reduce((s, b) => s + b.credit, 0);
    expect(d).toBe(c);
    const bs = balanceSheet(entries);
    expect(bs.balanced).toBe(true);
    expect(profitAndLoss(entries).netProfit).toBe(250);
  });

  it("classifies cash flow by counter-account", () => {
    const entries = [
      entry("a", [
        { account: "1200", debit: 1000, credit: 0 },
        { account: "3100", debit: 0, credit: 1000 },
      ]),
      entry("a", incomeLines("4100", 400, "bank")),
      entry("a", [
        { account: "1500", debit: 300, credit: 0 },
        { account: "1200", debit: 0, credit: 300 },
      ]),
    ];
    expect(cashFlow(entries)).toEqual({
      operating: 400,
      investing: -300,
      financing: 1000,
      net: 1100,
    });
  });

  it("eliminates intercompany loans and services on consolidation", () => {
    const loan = intercompanyLoanEntries("a", "b", 1000).map((p) => entry(p.companyId, p.lines));
    const svc = intercompanyServiceEntries("a", "b", 200).map((p) => entry(p.companyId, p.lines));
    const all = [...loan, ...svc];
    expect(profitAndLoss(all).totalIncome).toBe(200);
    expect(profitAndLoss(all, { consolidated: true }).totalIncome).toBe(0);
    expect(profitAndLoss(all, { consolidated: true }).totalExpenses).toBe(0);
    const bs = balanceSheet(all, { consolidated: true });
    expect(bs.liabilities).toHaveLength(0);
    expect(bs.balanced).toBe(true);
  });
});

describe("depreciation", () => {
  const machine: DepInput = {
    purchasePrice: 5_000_000,
    installationCost: 0,
    salvageValue: 500_000,
    usefulLifeYears: 10,
    method: "Straight-Line",
    ratePercent: 0,
    customSchedule: "",
    purchaseDate: "2026-01-15",
  };

  it("matches the SRS example: 4,50,000 a year and 37,500 a month", () => {
    expect(annualDepreciation(machine)).toBe(450_000);
    expect(schedule(machine)[0]?.charge).toBe(37_500);
  });

  it("never depreciates below salvage value", () => {
    const rows = schedule(machine);
    expect(rows).toHaveLength(120);
    expect(rows[119]?.bookValue).toBe(500_000);
  });

  it("supports written-down-value and custom schedules", () => {
    const wdv: DepInput = {
      ...machine,
      method: "Written Down Value",
      ratePercent: 20,
      usefulLifeYears: 5,
    };
    const first = schedule(wdv, 1)[0]?.charge ?? 0;
    expect(first).toBeCloseTo((5_000_000 * 0.2) / 12, 0);
    const custom: DepInput = {
      ...machine,
      method: "Custom Schedule",
      customSchedule: "1200000,600000",
    };
    expect(schedule(custom, 1)[0]?.charge).toBe(100_000);
    // Charges start the month after purchase (Feb, Mar) at 100,000 each.
    expect(asOf(custom, "2026-03").accumulated).toBe(200_000);
  });
});

describe("break-even", () => {
  it("applies the SRS formulas", () => {
    const r = breakEven({
      initialInvestment: 1_000_000,
      fixedMonthlyCosts: 100_000,
      variableCostPerUnit: 60,
      pricePerUnit: 100,
      expectedUnitsPerMonth: 4000,
    });
    expect(r.contributionPerUnit).toBe(40);
    expect(r.breakEvenUnits).toBe(2500);
    expect(r.breakEvenRevenue).toBe(250_000);
    expect(r.monthlyProfit).toBe(60_000);
    expect(r.monthsToRecoverInvestment).toBe(17);
  });

  it("handles a non-viable price and orders scenarios", () => {
    expect(
      breakEven({
        initialInvestment: 1,
        fixedMonthlyCosts: 1,
        variableCostPerUnit: 10,
        pricePerUnit: 5,
        expectedUnitsPerMonth: 1,
      }).feasible,
    ).toBe(false);
    const s = scenarios({
      initialInvestment: 1_000_000,
      fixedMonthlyCosts: 100_000,
      variableCostPerUnit: 60,
      pricePerUnit: 100,
      expectedUnitsPerMonth: 4000,
    });
    expect(s.Best.monthlyProfit).toBeGreaterThan(s.Base.monthlyProfit);
    expect(s.Base.monthlyProfit).toBeGreaterThan(s.Worst.monthlyProfit);
  });
});

describe("payroll, periods, export", () => {
  it("computes net salary", () => {
    expect(
      netSalary({
        basicSalary: 50_000,
        allowances: 10_000,
        bonus: 5_000,
        overtime: 2_000,
        deductions: 1_000,
        loanRecovery: 2_000,
        taxDeduction: 3_000,
      }),
    ).toBe(61_000);
  });

  it("resolves dashboard periods", () => {
    expect(periodRange("today", REF)).toEqual({ from: "2026-11-23", to: "2026-11-23" });
    expect(periodRange("month", REF)).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(periodRange("lastMonth", REF)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(periodRange("quarter", REF)).toEqual({ from: "2026-10-01", to: "2026-12-31" });
    expect(periodRange("year", REF)).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });

  it("escapes CSV values", () => {
    expect(toCSV([{ a: 'x,"y"', b: 1 }])).toBe('a,b\r\n"x,""y""",1');
  });
});

describe("access control", () => {
  it("limits roles by module and company", () => {
    expect(canEdit("Group Owner", "finance")).toBe(true);
    expect(canView("Investor", "finance")).toBe(false);
    expect(canView("Investor", "investments")).toBe(true);
    expect(canEdit("Company Operator", "daily")).toBe(true);
    expect(canEdit("Company Operator", "finance")).toBe(false);
    expect(canAccessCompany("Company Director", ["a"], "b")).toBe(false);
    expect(canAccessCompany("Group Owner", [], "b")).toBe(true);
  });
});

describe("seeded workspace and store", () => {
  beforeEach(() => {
    system._replace(buildSeed(REF));
  });

  it("includes the nine portfolio companies", () => {
    const s = buildSeed(REF);
    expect(s.companies.map((c) => c.name)).toEqual(
      expect.arrayContaining([
        "bBike Ltd.",
        "Bag E Rahmat Holdings Ltd.",
        "Best Health Diagnostic Limited",
        "Nexovia IT",
        "Nogor Bangla",
        "bAgro",
        "bBlock",
        "Solar Business",
        "AI Hub Bangladesh",
      ]),
    );
  });

  it("every seeded entry balances and the group balance sheet balances", () => {
    const s = buildSeed(REF);
    for (const e of s.journal) expect(validateLines(e.lines).ok, e.memo).toBe(true);
    expect(balanceSheet(s.journal).balanced).toBe(true);
    expect(balanceSheet(s.journal, { consolidated: true }).balanced).toBe(true);
  });

  it("books diagnostic machine depreciation of 37,500 a month", () => {
    const s = buildSeed(REF);
    const dep = s.journal.filter((e) => e.source?.startsWith("dep:ast-1:"));
    expect(dep.length).toBeGreaterThan(0);
    expect(dep.every((e) => e.lines[0]?.debit === 37_500)).toBe(true);
  });

  it("only reverses, never deletes, posted entries", () => {
    const r = ledger.post({
      companyId: "nexovia-it",
      date: "2026-11-20",
      memo: "Test sale",
      lines: incomeLines("4100", 5000, "cash"),
    });
    expect(r.ok).toBe(true);
    const id = r.ok ? (r.id as string) : "";
    expect(ledger.reverse(id, "").ok).toBe(false);
    expect(ledger.reverse(id, "Entered in error").ok).toBe(true);
    expect(ledger.reverse(id, "again").ok).toBe(false);
    const s = buildSeed(REF);
    system._replace(s);
    expect(typeof (ledger as Record<string, unknown>)["delete"]).toBe("undefined");
  });

  it("rejects an unbalanced manual entry", () => {
    const r = ledger.post({
      companyId: "nexovia-it",
      date: "2026-11-20",
      memo: "bad",
      lines: [
        { account: "1100", debit: 10, credit: 0 },
        { account: "4100", debit: 0, credit: 5 },
      ],
    });
    expect(r.ok).toBe(false);
  });

  it("blocks edits by roles without permission", () => {
    ui.setUser("u-investor");
    const r = ledger.post({
      companyId: "nexovia-it",
      date: "2026-11-20",
      memo: "x",
      lines: incomeLines("4100", 1, "cash"),
    });
    expect(r.ok).toBe(false);
    ui.setUser("u-owner");
  });

  it("creates companies without developer help and locks approved approvals", () => {
    const res = companies.add({
      name: "New Venture Ltd",
      category: "Trading",
      status: "Planned",
      registrationNo: "",
      tradeLicense: "",
      tin: "",
      bin: "",
      incorporationDate: "",
      address: "",
      website: "",
      contact: "",
      managingDirector: "",
      administrator: "",
      vision: "",
      mission: "",
      objectives: "",
      businessModel: "",
      initialInvestment: 0,
      currentValuation: 0,
      legalParentId: "",
      reportingParentId: "",
      fixedMonthlyCosts: 0,
      currency: "BDT",
    });
    expect(res.ok).toBe(true);
    expect(data.remove("approvals", "apr-3").ok).toBe(false);
  });

  it("walks a multi-level approval to completion", () => {
    // apr-1 needs 2 levels and already has 1: one more approval completes it and locks it.
    expect(data.decide("apr-1", true, "ok").ok).toBe(true);
    expect(buildStatus("apr-1")).toBe("Approved");
    expect(data.decide("apr-1", true, "again").ok).toBe(false);
    // apr-2 needs 3 levels: one approval keeps it pending, a rejection ends it.
    expect(data.decide("apr-2", true, "level 1").ok).toBe(true);
    expect(buildStatus("apr-2")).toBe("Pending");
    expect(data.decide("apr-2", false, "too costly").ok).toBe(true);
    expect(buildStatus("apr-2")).toBe("Rejected");
  });

  it("summarises the group from the ledger", () => {
    const s = buildSeed(REF);
    const range = periodRange("all", REF);
    const all = s.companies.map((c) => c.id);
    const sum = summarize(s, all, range, { consolidated: true });
    expect(sum.assets).toBeGreaterThan(0);
    expect(sum.employees).toBeGreaterThan(20);
    expect(sum.assets - sum.liabilities - sum.equity).toBe(0);
  });

  it("derives notifications for missing reports, approvals and expiring documents", () => {
    const types = deriveNotifications(buildSeed(REF), REF).map((n) => n.type);
    expect(types).toEqual(
      expect.arrayContaining([
        "Daily Report Missing",
        "Expense Approval Required",
        "Document Expiry",
      ]),
    );
  });
});

describe("AI business intelligence", () => {
  it("answers from recorded data with period and sources, and refuses unsupported questions", () => {
    const s = buildSeed(REF);
    const missing = answerQuestion(s, "Which company has not submitted today's report?", REF);
    expect(missing.answer).toContain("Nogor Bangla");
    const spent = answerQuestion(s, "Which company spent the most money this month?", REF);
    expect(spent.supported).toBe(true);
    expect(spent.sources.length).toBeGreaterThan(0);
    expect(spent.period).toBe("2026-11");
    const unknown = answerQuestion(s, "What will the weather be tomorrow?", REF);
    expect(unknown.supported).toBe(false);
  });
});
