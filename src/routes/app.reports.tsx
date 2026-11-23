import { createFileRoute } from "@tanstack/react-router";

import { useScope } from "@/components/erp/hooks";
import { ExportMenu, PageHeader, Panel, SimpleTable, Stat, StatGrid } from "@/components/erp/kit";
import { profitAndLoss } from "@/lib/erp/accounting";
import { summarize } from "@/lib/erp/analytics";
import { annualDepreciation, toDepInput } from "@/lib/erp/depreciation";
import { money, moneyShort, percent } from "@/lib/erp/format";
import { PERIOD_LABELS, inRange } from "@/lib/erp/period";
import { grossSalary, toPayroll } from "@/lib/erp/payroll";

export const Route = createFileRoute("/app/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics | b Group" },
      {
        name: "description",
        content:
          "Daily, weekly, monthly, quarterly and yearly company reports plus a consolidated group report, exportable to PDF, Excel and CSV.",
      },
    ],
  }),
  component: Reports,
});

function Reports() {
  const { state, companies, range, summary, ids } = useScope();
  const col = state.collections;

  const perCompany = companies.map((c) => {
    const s = summarize(state, [c.id], range);
    const reports = col.dailyReports.filter(
      (r) => r.companyId === c.id && inRange(String(r.date), range),
    );
    const staff = col.employees.filter((e) => e.companyId === c.id && e.status === "Active");
    const payroll = staff.reduce((t, e) => t + grossSalary(toPayroll(e)), 0);
    const dep = state.journal
      .filter((e) => e.companyId === c.id && inRange(e.date, range) && e.source?.startsWith("dep:"))
      .reduce((t, e) => t + e.lines.reduce((x, l) => x + l.debit, 0), 0);
    const tasks = col.tasks.filter(
      (t) => t.companyId === c.id && t.status !== "Completed" && t.status !== "Cancelled",
    ).length;
    const projects = col.projects.filter((p) => p.companyId === c.id);
    const avgProgress = projects.length
      ? projects.reduce((t, p) => t + Number(p.progressPct || 0), 0) / projects.length
      : 0;
    return {
      c,
      s,
      reports: reports.length,
      payroll,
      dep,
      tasks,
      avgProgress,
      margin: s.revenue ? (s.profit / s.revenue) * 100 : 0,
    };
  });

  const group = profitAndLoss(
    state.journal.filter((e) => ids.includes(e.companyId) && inRange(e.date, range)),
    { consolidated: true },
  );
  const exportRows = [
    ...perCompany.map((r) => ({
      Company: r.c.name,
      Revenue: Math.round(r.s.revenue),
      Expenses: Math.round(r.s.expenses),
      "Profit / Loss": Math.round(r.s.profit),
      "Margin %": Number(r.margin.toFixed(1)),
      "Cash & bank": Math.round(r.s.cash + r.s.bank),
      Payroll: Math.round(r.payroll),
      Depreciation: Math.round(r.dep),
      "Reports submitted": r.reports,
      "Open tasks": r.tasks,
      "Avg project progress %": Math.round(r.avgProgress),
    })),
    {
      Company: "GROUP (consolidated)",
      Revenue: Math.round(group.totalIncome),
      Expenses: Math.round(group.totalExpenses),
      "Profit / Loss": Math.round(group.netProfit),
      "Margin %": group.totalIncome
        ? Number(((group.netProfit / group.totalIncome) * 100).toFixed(1))
        : 0,
      "Cash & bank": Math.round(summary.cash + summary.bank),
      Payroll: Math.round(perCompany.reduce((t, r) => t + r.payroll, 0)),
      Depreciation: Math.round(perCompany.reduce((t, r) => t + r.dep, 0)),
      "Reports submitted": perCompany.reduce((t, r) => t + r.reports, 0),
      "Open tasks": perCompany.reduce((t, r) => t + r.tasks, 0),
      "Avg project progress %": 0,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description={`Report period: ${PERIOD_LABELS[state.period]} (${range.from} → ${range.to}). Use the date range in the top bar for daily, weekly, monthly, quarterly or yearly reports. All values come from the ledger and registers.`}
        actions={<ExportMenu name={`group-report-${range.from}-${range.to}`} rows={exportRows} />}
      />
      <StatGrid>
        <Stat
          label="Group revenue"
          value={moneyShort(group.totalIncome)}
          hint="Intercompany eliminated"
        />
        <Stat label="Group expenses" value={moneyShort(group.totalExpenses)} />
        <Stat
          label="Group profit / loss"
          value={moneyShort(group.netProfit)}
          tone={group.netProfit >= 0 ? "good" : "bad"}
        />
        <Stat
          label="Profit margin"
          value={percent(group.totalIncome ? (group.netProfit / group.totalIncome) * 100 : 0)}
        />
      </StatGrid>
      <Panel
        title="Company reports"
        description="Profit & loss, payroll, depreciation, operations and projects for the period"
        className="mb-6"
      >
        <SimpleTable
          head={[
            "Company",
            "Revenue",
            "Expenses",
            "Profit / loss",
            "Margin",
            "Payroll",
            "Depreciation",
            "Daily reports",
            "Open tasks",
            "Projects",
          ]}
          align={[
            "left",
            "right",
            "right",
            "right",
            "right",
            "right",
            "right",
            "right",
            "right",
            "right",
          ]}
          rows={[
            ...perCompany.map((r) => [
              r.c.name,
              money(r.s.revenue),
              money(r.s.expenses),
              money(r.s.profit),
              percent(r.margin),
              money(r.payroll),
              money(r.dep),
              String(r.reports),
              String(r.tasks),
              `${Math.round(r.avgProgress)}%`,
            ]),
            [
              "Group (consolidated)",
              money(group.totalIncome),
              money(group.totalExpenses),
              money(group.netProfit),
              percent(group.totalIncome ? (group.netProfit / group.totalIncome) * 100 : 0),
              money(perCompany.reduce((t, r) => t + r.payroll, 0)),
              money(perCompany.reduce((t, r) => t + r.dep, 0)),
              String(perCompany.reduce((t, r) => t + r.reports, 0)),
              String(perCompany.reduce((t, r) => t + r.tasks, 0)),
              "",
            ],
          ]}
        />
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Expense analysis (group)">
          <SimpleTable
            head={["Expense", "Amount", "Share"]}
            align={["left", "right", "right"]}
            rows={group.expenses.map((e) => [
              e.name,
              money(e.amount),
              percent(group.totalExpenses ? (e.amount / group.totalExpenses) * 100 : 0),
            ])}
          />
        </Panel>
        <Panel title="Sales & income performance (group)">
          <SimpleTable
            head={["Income", "Amount", "Share"]}
            align={["left", "right", "right"]}
            rows={group.income.map((e) => [
              e.name,
              money(e.amount),
              percent(group.totalIncome ? (e.amount / group.totalIncome) * 100 : 0),
            ])}
          />
        </Panel>
        <Panel title="Annual depreciation schedule" description="Year-1 charge per asset">
          <SimpleTable
            head={["Asset", "Year-1 depreciation"]}
            align={["left", "right"]}
            rows={col.assets
              .filter((a) => ids.includes(String(a.companyId)))
              .map((a) => [String(a.name), money(annualDepreciation(toDepInput(a)))])}
          />
        </Panel>
      </div>
    </div>
  );
}
