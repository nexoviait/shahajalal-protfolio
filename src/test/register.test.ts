import { beforeEach, describe, expect, it } from "vitest";

import { extractAmount, parseEntry, toLatinDigits } from "@/lib/erp/assistant";
import { deriveNotifications } from "@/lib/erp/analytics";
import { canView } from "@/lib/erp/rbac";
import {
  addPeriod,
  byScope,
  daysUntil,
  dueStage,
  installmentSchedule,
  outstanding,
  partyStatement,
  summarizeRegister,
} from "@/lib/erp/register";
import { buildSeed } from "@/lib/erp/seed";
import { data, financeRegister, getState, system, ui } from "@/lib/erp/store";
import type { Row } from "@/lib/erp/types";

const REF = new Date(2026, 10, 23);
const TODAY = "2026-11-23";

const item = (over: Partial<Row> & { id: string }): Row => ({
  scope: "Personal",
  kind: "Loan Taken",
  title: "Loan",
  party: "Bank",
  openingAmount: 1000,
  status: "Active",
  frequency: "One-time",
  ...over,
});

describe("register calculations", () => {
  it("computes outstanding from opening, increases and settlements, ignoring voided", () => {
    const loan = item({ id: "a", openingAmount: 1000 });
    const txns: Row[] = [
      { id: "1", itemId: "a", amount: 200, txnType: "Settlement", status: "Posted" },
      { id: "2", itemId: "a", amount: 500, txnType: "Increase", status: "Posted" },
      { id: "3", itemId: "a", amount: 300, txnType: "Settlement", status: "Voided" },
    ];
    expect(outstanding(loan, txns)).toBe(1300);
  });

  it("classifies due stages: 7 days, 3 days, due day, overdue", () => {
    const at = (n: number) =>
      dueStage(
        item({ id: "x", nextDueDate: `2026-11-${String(23 + n).padStart(2, "0")}` }),
        100,
        TODAY,
      );
    expect(at(0)).toBe("today");
    expect(at(2)).toBe("within3");
    expect(at(3)).toBe("within3");
    expect(at(4)).toBe("within7");
    expect(at(7)).toBe("within7");
    expect(dueStage(item({ id: "x", nextDueDate: "2026-11-20" }), 100, TODAY)).toBe("overdue");
    expect(dueStage(item({ id: "x", nextDueDate: "2026-12-30" }), 100, TODAY)).toBe("later");
    expect(dueStage(item({ id: "x", nextDueDate: "2026-11-20" }), 0, TODAY)).toBe("none");
    expect(daysUntil("2026-12-01", TODAY)).toBe(8);
  });

  it("moves due dates by period, clamping month ends", () => {
    expect(addPeriod("2026-01-31", "Monthly")).toBe("2026-02-28");
    expect(addPeriod("2026-11-15", "Quarterly")).toBe("2027-02-15");
    expect(addPeriod("2026-11-15", "One-time")).toBe("2026-11-15");
  });

  it("summarises payable, receivable, net, overdue and card due", () => {
    const s = buildSeed(REF);
    const sum = summarizeRegister(s.collections.register, s.collections.registerTxns, TODAY);
    expect(sum.payable).toBeGreaterThan(0);
    expect(sum.receivable).toBeGreaterThan(0);
    expect(sum.net).toBe(Math.round((sum.receivable - sum.payable) * 100) / 100);
    expect(sum.overdueCount).toBeGreaterThanOrEqual(1); // the loan from brother is past due
    expect(sum.cardDue).toBe(9000);
    const split = byScope(s.collections.register, s.collections.registerTxns, () => "Co");
    expect(split.map((r) => r.label)).toEqual(expect.arrayContaining(["Personal", "Other"]));
    expect(split.some((r) => r.label.startsWith("Company"))).toBe(true);
  });

  it("projects the loan schedule from the remaining balance", () => {
    const loan = item({
      id: "l",
      openingAmount: 100_000,
      installmentAmount: 40_000,
      frequency: "Monthly",
      nextDueDate: "2026-12-01",
    });
    const sch = installmentSchedule([loan], [], TODAY, 12);
    expect(sch.map((i) => i.amount)).toEqual([40_000, 40_000, 20_000]);
    expect(sch.map((i) => i.date)).toEqual(["2026-12-01", "2027-01-01", "2027-02-01"]);
  });

  it("builds a party statement with the net position", () => {
    const items = [
      item({ id: "a", party: "Rahim", kind: "Loan Given", openingAmount: 300_000 }),
      item({ id: "b", party: "rahim", kind: "Payable", openingAmount: 50_000 }),
    ];
    const txns: Row[] = [
      { id: "t", itemId: "a", amount: 100_000, txnType: "Settlement", status: "Posted" },
    ];
    const st = partyStatement(items, txns, "Rahim");
    expect(st.receivable).toBe(200_000);
    expect(st.payable).toBe(50_000);
    expect(st.net).toBe(150_000);
    expect(st.lines.find((l) => l.item.id === "a")?.settled).toBe(100_000);
  });
});

describe("financial assistant parsing", () => {
  const seed = buildSeed(REF);
  const items = seed.collections.register;
  const txns = seed.collections.registerTxns;

  it("reads Bengali digits and lakh/crore/hazar units", () => {
    expect(toLatinDigits("৫০,০০০")).toBe("50,000");
    expect(extractAmount("৫ লাখ টাকা")).toBe(500_000);
    expect(extractAmount("Paid 2.5 crore")).toBe(25_000_000);
    expect(extractAmount("৫০ হাজার টাকা পেয়েছি")).toBe(50_000);
    expect(extractAmount("sent 12,500 taka on 2026-11-20")).toBe(12_500);
    expect(extractAmount("nothing here")).toBeNull();
  });

  it("turns the owner's example sentence into a draft against the landowner account", () => {
    const r = parseEntry("আজ জমির মালিককে ৫ লাখ টাকা দিয়েছি।", items, txns, TODAY);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.draft.itemId).toBe("reg-6");
    expect(r.draft.amount).toBe(500_000);
    expect(r.draft.txnType).toBe("Settlement"); // paying a payable settles it
    expect(r.draft.date).toBe(TODAY);
    expect(r.draft.confidence).toBe("high");
  });

  it("understands English, yesterday, and direction", () => {
    const paid = parseEntry("Paid the landowner 5 lakh yesterday", items, txns, TODAY);
    expect(paid.ok && paid.draft.date).toBe("2026-11-22");
    const got = parseEntry("রহিমের কাছ থেকে ৫০ হাজার টাকা পেয়েছি", items, txns, TODAY);
    expect(got.ok && got.draft.itemId).toBe("reg-3");
    expect(got.ok && got.draft.txnType).toBe("Settlement"); // a receipt settles a loan given
    const lend = parseEntry("Gave Rahim 20,000 more", items, txns, TODAY);
    expect(lend.ok && lend.draft.txnType).toBe("Increase"); // paying a receivable lends more
  });

  it("refuses unclear input instead of guessing, and warns on bad matches", () => {
    expect(parseEntry("hello", items, txns, TODAY).ok).toBe(false);
    expect(parseEntry("paid the landowner", items, txns, TODAY).ok).toBe(false); // no amount
    expect(parseEntry("the landowner 5 lakh", items, txns, TODAY).ok).toBe(false); // no direction
    const none = parseEntry("Paid Zubayer 5000", items, txns, TODAY);
    expect(none.ok && none.draft.itemId).toBe("");
    expect(none.ok && none.draft.confidence).toBe("low");
    const over = parseEntry("Paid the landowner 90 lakh", items, txns, TODAY);
    expect(over.ok && over.draft.warnings.join(" ")).toMatch(/more than the outstanding/);
  });
});

describe("register store actions", () => {
  beforeEach(() => {
    system._replace(buildSeed(REF));
  });

  const find = (id: string) => getState().collections.register.find((r) => r.id === id);

  it("records a payment, advances the instalment date and rejects overpayment", () => {
    const before = String(find("reg-1")?.nextDueDate);
    expect(
      financeRegister.addTxn({
        itemId: "reg-1",
        txnType: "Settlement",
        amount: 45_000,
        date: TODAY,
      }).ok,
    ).toBe(true);
    expect(String(find("reg-1")?.nextDueDate)).toBe(addPeriod(before, "Monthly"));
    expect(
      financeRegister.addTxn({
        itemId: "reg-1",
        txnType: "Settlement",
        amount: 99_000_000,
        date: TODAY,
      }).ok,
    ).toBe(false);
    expect(
      financeRegister.addTxn({ itemId: "reg-1", txnType: "Settlement", amount: 0, date: TODAY }).ok,
    ).toBe(false);
  });

  it("does not advance the due date for a partial instalment", () => {
    const before = String(find("reg-1")?.nextDueDate);
    financeRegister.addTxn({ itemId: "reg-1", txnType: "Settlement", amount: 10_000, date: TODAY });
    expect(String(find("reg-1")?.nextDueDate)).toBe(before);
  });

  it("closes an account when fully settled and re-opens it if the payment is voided", () => {
    const bal = outstanding(find("reg-5") as Row, getState().collections.registerTxns);
    const r = financeRegister.addTxn({
      itemId: "reg-5",
      txnType: "Settlement",
      amount: bal,
      date: TODAY,
    });
    expect(r.ok).toBe(true);
    expect(find("reg-5")?.status).toBe("Closed");
    expect(
      financeRegister.addTxn({ itemId: "reg-5", txnType: "Settlement", amount: 1, date: TODAY }).ok,
    ).toBe(false);
    const id = r.ok ? (r.id as string) : "";
    expect(financeRegister.voidTxn(id, "").ok).toBe(false);
    expect(financeRegister.voidTxn(id, "Entered by mistake").ok).toBe(true);
    expect(find("reg-5")?.status).toBe("Active");
    expect(outstanding(find("reg-5") as Row, getState().collections.registerTxns)).toBe(bal);
  });

  it("keeps transactions permanent and protects accounts that have history", () => {
    expect(data.remove("registerTxns", "rtx-1").ok).toBe(false);
    expect(data.remove("register", "reg-1").ok).toBe(false);
    expect(data.remove("register", "reg-9").ok).toBe(true); // no transactions
  });

  it("is owner-only: administrators and others cannot see or change it", () => {
    expect(canView("Group Owner", "register")).toBe(true);
    expect(canView("Group Administrator", "register")).toBe(false);
    expect(canView("Company Accountant", "register")).toBe(false);
    ui.setUser("u-admin");
    expect(
      financeRegister.addTxn({ itemId: "reg-1", txnType: "Settlement", amount: 1000, date: TODAY })
        .ok,
    ).toBe(false);
    expect(deriveNotifications(getState(), REF).some((n) => n.type === "Payment Due")).toBe(false);
    ui.setUser("u-owner");
  });
});

describe("due-date alerts", () => {
  it("raises payment alerts by stage for the owner", () => {
    const s = buildSeed(REF);
    const notes = deriveNotifications(s, REF).filter(
      (n) => n.type === "Payment Due" || n.type === "Collection Due",
    );
    const titles = notes.map((n) => n.title).join(" | ");
    expect(titles).toMatch(/Equipment finance due today/); // due on the day
    expect(titles).toMatch(/Visa Platinum due in 2 day/); // within 3 days
    expect(titles).toMatch(/Loan from brother \d+ day\(s\) overdue/); // overdue
    expect(titles).toMatch(/Land purchase balance .* due in 6 day/); // within 7 days
    expect(notes.find((n) => n.title.includes("Equipment finance"))?.severity).toBe("critical");
    expect(notes.find((n) => n.title.includes("Land purchase"))?.severity).toBe("info");
    // Closed accounts raise nothing.
    s.collections.register = s.collections.register.map((r) => ({ ...r, status: "Closed" }));
    expect(deriveNotifications(s, REF).some((n) => n.type === "Payment Due")).toBe(false);
  });
});
