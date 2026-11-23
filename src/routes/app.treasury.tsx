import { createFileRoute } from "@tanstack/react-router";

import { useScope } from "@/components/erp/hooks";
import { ExportMenu, PageHeader, Panel, SimpleTable, Stat, StatGrid } from "@/components/erp/kit";
import { BANK_CODES, accountBalance, bankBalance, trialBalance } from "@/lib/erp/accounting";
import { money, moneyShort } from "@/lib/erp/format";

export const Route = createFileRoute("/app/treasury")({
  head: () => ({
    meta: [
      { title: "Group Treasury | b Group" },
      {
        name: "description",
        content:
          "Group cash position, intercompany loans, receivables, payables and funding requirements by company.",
      },
    ],
  }),
  component: Treasury,
});

function Treasury() {
  const { state, companies, range } = useScope();
  const rows = companies
    .map((c) => {
      const tb = trialBalance(
        state.journal.filter((e) => e.companyId === c.id && e.date <= range.to),
      );
      const staff = state.collections.employees.filter(
        (e) => e.companyId === c.id && e.status === "Active",
      );
      const payroll = staff.reduce(
        (s, e) =>
          s +
          Number(e.basicSalary || 0) +
          Number(e.allowances || 0) +
          Number(e.bonus || 0) +
          Number(e.overtime || 0),
        0,
      );
      const requested = state.collections.dailyReports
        .filter((r) => r.companyId === c.id && r.status !== "Approved")
        .reduce((s, r) => s + Number(r.requiredInvestment || 0), 0);
      const pendingApprovals = state.collections.approvals
        .filter((a) => a.companyId === c.id && a.status === "Pending")
        .reduce((s, a) => s + Number(a.amount || 0), 0);
      const payables = accountBalance(tb, "2100");
      return {
        c,
        cash: accountBalance(tb, "1100"),
        bank: bankBalance(tb),
        receivable: accountBalance(tb, "1400"),
        payables,
        payroll,
        icRecv: accountBalance(tb, "1300"),
        icPay: accountBalance(tb, "2300"),
        requested,
        pendingApprovals,
        monthlyNeed: payroll + payables,
      };
    })
    .filter((r) => r.c.status !== "Planned" || r.cash + r.bank !== 0);

  const sum = (k: keyof (typeof rows)[number]) =>
    rows.reduce((s, r) => s + Number(r[k] as number), 0);
  const total = sum("cash") + sum("bank");
  const need = sum("monthlyNeed");

  const exportRows = rows.map((r) => ({
    Company: r.c.name,
    Cash: r.cash,
    Bank: r.bank,
    Receivables: r.receivable,
    Payables: r.payables,
    "Intercompany receivable": r.icRecv,
    "Intercompany payable": r.icPay,
    "Monthly payroll": r.payroll,
    "Funding requested": r.requested + r.pendingApprovals,
  }));

  return (
    <div>
      <PageHeader
        title="Group Treasury"
        description="Centralised visibility of cash and obligations. Each company keeps its own bank accounts and legal ownership; this view never merges them."
        actions={<ExportMenu name="group-treasury" rows={exportRows} />}
      />
      <StatGrid>
        <Stat
          label="Total group cash position"
          value={moneyShort(total)}
          hint={`Cash ${moneyShort(sum("cash"))} · Bank ${moneyShort(sum("bank"))}`}
        />
        <Stat label="Outstanding receivables" value={moneyShort(sum("receivable"))} />
        <Stat label="Outstanding payables" value={moneyShort(sum("payables"))} />
        <Stat
          label="Intercompany loans"
          value={moneyShort(sum("icRecv"))}
          hint={`Payable ${moneyShort(sum("icPay"))} (nets to zero across the group)`}
        />
        <Stat label="Monthly payroll requirement" value={moneyShort(sum("payroll"))} />
        <Stat
          label="Monthly cash requirement"
          value={moneyShort(need)}
          hint="Payroll + supplier payables"
          tone={need > total ? "bad" : "default"}
        />
        <Stat
          label="Investment requirements"
          value={moneyShort(sum("requested") + sum("pendingApprovals"))}
          hint="Requested in reports + pending approvals"
        />
        <Stat
          label="Coverage"
          value={need ? `${(total / need).toFixed(1)}×` : "—"}
          hint="Cash ÷ monthly requirement"
          tone={need && total / need < 1.5 ? "warn" : "good"}
        />
      </StatGrid>
      <Panel title="Company-wise cash and bank" description={`As of ${range.to}`} className="mb-6">
        <SimpleTable
          head={["Company", "Cash", "Bank", "Total", "Receivables", "Payables", "Monthly need"]}
          align={["left", "right", "right", "right", "right", "right", "right"]}
          rows={rows.map((r) => [
            r.c.name,
            money(r.cash),
            money(r.bank),
            money(r.cash + r.bank),
            money(r.receivable),
            money(r.payables),
            money(r.monthlyNeed),
          ])}
        />
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Bank accounts by company">
          <SimpleTable
            head={["Company", ...BANK_CODES.map((c) => c)]}
            align={["left", "right", "right", "right"]}
            rows={companies.map((c) => {
              const tb = trialBalance(
                state.journal.filter((e) => e.companyId === c.id && e.date <= range.to),
              );
              return [c.name, ...BANK_CODES.map((code) => money(accountBalance(tb, code)))];
            })}
          />
        </Panel>
        <Panel title="Upcoming obligations">
          <SimpleTable
            head={["Company", "Payroll", "Payables", "Funding asks"]}
            align={["left", "right", "right", "right"]}
            rows={rows.map((r) => [
              r.c.name,
              money(r.payroll),
              money(r.payables),
              money(r.requested + r.pendingApprovals),
            ])}
          />
        </Panel>
      </div>
    </div>
  );
}
