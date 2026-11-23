import { useMemo } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Empty,
  Meter,
  PageHeader,
  Panel,
  SimpleTable,
  Stat,
  StatGrid,
  StatusPill,
} from "@/components/erp/kit";
import { useScope } from "@/components/erp/hooks";
import { Button } from "@/components/ui/button";
import { deriveNotifications, lastMonths, monthRange, summarize } from "@/lib/erp/analytics";
import { dailySummary } from "@/lib/erp/ai";
import { money, moneyShort } from "@/lib/erp/format";
import { PERIOD_LABELS } from "@/lib/erp/period";
import { isoDate } from "@/lib/erp/format";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Master Dashboard | b Group" },
      {
        name: "description",
        content:
          "One dashboard for every company: revenue, expenses, profit, cash, payroll, approvals and risks.",
      },
    ],
  }),
  component: MasterDashboard,
});

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function MasterDashboard() {
  const { state, companies, ids, range, summary, perCompany, name } = useScope();
  const today = isoDate(new Date());
  const notices = useMemo(
    () => deriveNotifications(state).filter((n) => !n.companyId || ids.includes(n.companyId)),
    [state, ids],
  );

  const trend = useMemo(
    () =>
      lastMonths(6).map((m) => {
        const s = summarize(state, ids, monthRange(m), { consolidated: true });
        return {
          month: m.slice(2),
          Revenue: Math.round(s.revenue),
          Expenses: Math.round(s.expenses),
          Profit: Math.round(s.profit),
        };
      }),
    [state, ids],
  );

  const active = companies.filter((c) => c.status === "Active");
  const planned = companies.filter(
    (c) =>
      c.status === "Planned" || c.status === "Under Development" || c.status === "Investment Stage",
  );
  const profitRows = perCompany
    .filter((p) => p.company.status !== "Planned")
    .map((p) => ({
      name: p.company.name.split(" ").slice(0, 2).join(" "),
      Profit: Math.round(p.summary.profit),
      Expenses: Math.round(p.summary.expenses),
      Revenue: Math.round(p.summary.revenue),
    }));

  const pendingApprovals = state.collections.approvals.filter(
    (a) => a.status === "Pending" && (!a.companyId || ids.includes(a.companyId)),
  );
  const overdue = state.collections.tasks.filter(
    (t) =>
      (!t.companyId || ids.includes(t.companyId)) &&
      t.status !== "Completed" &&
      t.status !== "Cancelled" &&
      (String(t.deadline ?? "") < today || t.status === "Delayed"),
  );
  const reportStatus = active.map((c) => {
    const r = state.collections.dailyReports.find((x) => x.companyId === c.id && x.date === today);
    return { company: c, status: r ? String(r.status) : "Missing" };
  });
  const dividends = state.collections.investments
    .filter((i) => ids.includes(String(i.companyId)))
    .reduce((s, i) => s + (Number(i.dividendPayable) || 0), 0);
  const upcoming = [
    { label: "Supplier payables", amount: summary.payables },
    { label: "Monthly payroll (gross)", amount: summary.monthlyPayroll },
    { label: "Dividends payable", amount: dividends },
  ];
  const critical = notices.filter((n) => n.severity !== "info").slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Master Dashboard"
        description={`Group performance for ${PERIOD_LABELS[state.period].toLowerCase()} (${range.from} → ${range.to}). Every figure is calculated from posted ledger entries and registers.`}
        actions={
          <Button asChild size="sm">
            <Link to="/app/finance">Record transaction</Link>
          </Button>
        }
      />

      <StatGrid>
        <Stat
          label="Companies"
          value={String(companies.length)}
          hint={`${active.length} active · ${planned.length} planned / developing`}
        />
        <Stat
          label="Total group investment"
          value={moneyShort(summary.investment)}
          hint="From investment register"
        />
        <Stat label="Revenue" value={moneyShort(summary.revenue)} hint="Eliminates intercompany" />
        <Stat label="Expenses" value={moneyShort(summary.expenses)} />
        <Stat
          label="Net profit"
          value={moneyShort(summary.profit)}
          tone={summary.profit >= 0 ? "good" : "bad"}
        />
        <Stat label="Total assets" value={moneyShort(summary.assets)} />
        <Stat label="Total liabilities" value={moneyShort(summary.liabilities)} />
        <Stat
          label="Cash & bank"
          value={moneyShort(summary.cash + summary.bank)}
          hint={`Cash ${moneyShort(summary.cash)} · Bank ${moneyShort(summary.bank)}`}
        />
        <Stat label="Employees" value={String(summary.employees)} />
        <Stat label="Monthly payroll" value={moneyShort(summary.monthlyPayroll)} />
        <Stat
          label="Pending approvals"
          value={String(pendingApprovals.length)}
          tone={pendingApprovals.length ? "warn" : "default"}
        />
        <Stat
          label="Overdue tasks"
          value={String(overdue.length)}
          tone={overdue.length ? "bad" : "default"}
        />
      </StatGrid>

      <div className="mb-6 grid gap-4 xl:grid-cols-3">
        <Panel
          title="Six-month trend"
          description="Consolidated group revenue, expenses and profit"
          className="xl:col-span-2"
        >
          <div
            className="h-72"
            role="img"
            aria-label="Line chart of monthly revenue, expenses and profit"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(v: number) => moneyShort(v)}
                  tick={{ fontSize: 12 }}
                  width={64}
                />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Revenue"
                  stroke={COLORS[0]}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Expenses"
                  stroke={COLORS[3]}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Profit"
                  stroke={COLORS[2]}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Daily reporting status" description={`Active companies · ${today}`}>
          {reportStatus.length === 0 ? (
            <Empty>No active companies.</Empty>
          ) : (
            <ul className="divide-y">
              {reportStatus.map((r) => (
                <li
                  key={r.company.id}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <span className="truncate">{r.company.name}</span>
                  <StatusPill value={r.status === "Missing" ? "Delayed" : r.status} />
                </li>
              ))}
            </ul>
          )}
          <Button asChild variant="outline" size="sm" className="mt-3 w-full">
            <Link to="/app/daily">Open daily reports</Link>
          </Button>
        </Panel>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Company-wise profitability" description="Net profit in the selected period">
          {profitRows.length === 0 ? (
            <Empty>No operating companies in this selection.</Empty>
          ) : (
            <div className="h-64" role="img" aria-label="Bar chart of profit by company">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v: number) => moneyShort(v)}
                    tick={{ fontSize: 12 }}
                    width={64}
                  />
                  <Tooltip formatter={(v) => money(Number(v))} />
                  <Bar dataKey="Profit" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
        <Panel
          title="Company-wise expense comparison"
          description="Revenue vs expenses in the selected period"
        >
          {profitRows.length === 0 ? (
            <Empty>No operating companies in this selection.</Empty>
          ) : (
            <div
              className="h-64"
              role="img"
              aria-label="Bar chart comparing revenue and expenses by company"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v: number) => moneyShort(v)}
                    tick={{ fontSize: 12 }}
                    width={64}
                  />
                  <Tooltip formatter={(v) => money(Number(v))} />
                  <Legend />
                  <Bar dataKey="Revenue" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill={COLORS[3]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Panel
          title="Investment performance"
          description="Invested capital vs current valuation"
          className="lg:col-span-2"
        >
          <SimpleTable
            head={["Company", "Invested", "Valuation", "Multiple", "Break-even"]}
            align={["left", "right", "right", "right", "left"]}
            rows={perCompany
              .filter((p) => p.summary.investment > 0)
              .map((p) => [
                <Link
                  key="n"
                  to="/app/company/$companyId"
                  params={{ companyId: p.company.id }}
                  className="text-primary hover:underline"
                >
                  {p.company.name}
                </Link>,
                moneyShort(p.summary.investment),
                moneyShort(p.company.currentValuation),
                p.summary.investment
                  ? `${(p.company.currentValuation / p.summary.investment).toFixed(2)}×`
                  : "—",
                p.summary.breakEvenReached ? (
                  <StatusPill key="b" value="Active" />
                ) : (
                  <StatusPill key="b" value="Pending" />
                ),
              ])}
          />
        </Panel>
        <Panel title="Upcoming payments" description="Obligations from ledger and registers">
          <ul className="divide-y text-sm">
            {upcoming.map((u) => (
              <li key={u.label} className="flex justify-between gap-2 py-2">
                <span className="text-muted-foreground">{u.label}</span>
                <span className="font-mono tabular-nums">{money(u.amount)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Pending approvals">
          {pendingApprovals.length === 0 ? (
            <Empty>Nothing waiting for approval.</Empty>
          ) : (
            <ul className="divide-y text-sm">
              {pendingApprovals.map((a) => (
                <li key={a.id} className="py-2">
                  <p className="font-medium">{String(a.reason)}</p>
                  <p className="text-xs text-muted-foreground">
                    {name(a.companyId)} · {money(Number(a.amount))} · level {String(a.currentLevel)}
                    /{String(a.requiredLevels)}
                  </p>
                  <div className="mt-1.5">
                    <Meter
                      value={(Number(a.currentLevel) / Math.max(1, Number(a.requiredLevels))) * 100}
                      tone="warn"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Business risk notifications">
          {critical.length === 0 ? (
            <Empty>No risks flagged.</Empty>
          ) : (
            <ul className="divide-y text-sm">
              {critical.map((n) => (
                <li key={n.id} className="py-2">
                  <p
                    className={
                      n.severity === "critical" ? "font-medium text-destructive" : "font-medium"
                    }
                  >
                    {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{n.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Today at a glance" description="Generated from submitted reports and alerts">
          <ul className="list-disc space-y-2 pl-5 text-sm">
            {dailySummary(state).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
