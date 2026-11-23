import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { DataModule, type FieldDef } from "@/components/erp/DataModule";
import { Panel, SimpleTable, Stat, StatGrid } from "@/components/erp/kit";
import { Button } from "@/components/ui/button";
import { scopeCompanies } from "@/lib/erp/analytics";
import { isoDate, money, moneyShort } from "@/lib/erp/format";
import { grossSalary, netSalary, toPayroll } from "@/lib/erp/payroll";
import { ledger, useERP } from "@/lib/erp/store";
import type { Row } from "@/lib/erp/types";

export const Route = createFileRoute("/app/hr")({
  head: () => ({
    meta: [
      { title: "HR & Payroll | b Group" },
      {
        name: "description",
        content:
          "Employee database, organization chart and payroll for every company, with a group payroll dashboard.",
      },
    ],
  }),
  component: HR,
});

const FIELDS: FieldDef[] = [
  { key: "name", label: "Employee name", required: true },
  { key: "employeeCode", label: "Employee ID", required: true },
  { key: "designation", label: "Designation" },
  { key: "department", label: "Department" },
  { key: "basicSalary", label: "Basic salary", type: "money", required: true },
  {
    key: "status",
    label: "Employment status",
    type: "select",
    options: ["Active", "On Leave", "Resigned", "Terminated"],
    defaultValue: "Active",
  },
  { key: "joiningDate", label: "Joining date", type: "date", table: false },
  { key: "reportingManager", label: "Reporting manager", table: false },
  { key: "phone", label: "Contact", table: false },
  { key: "address", label: "Address", table: false },
  { key: "emergencyContact", label: "Emergency contact", table: false },
  { key: "allowances", label: "Allowances", type: "money", table: false, section: "Payroll" },
  { key: "bonus", label: "Bonus", type: "money", table: false },
  { key: "overtime", label: "Overtime", type: "money", table: false },
  { key: "deductions", label: "Deductions", type: "money", table: false },
  { key: "loanRecovery", label: "Loans & advances recovery", type: "money", table: false },
  { key: "taxDeduction", label: "Tax deduction", type: "money", table: false },
];

function OrgChart({ rows }: { rows: Row[] }) {
  const top = rows.filter((r) => /managing director/i.test(String(r.designation)));
  const rest = rows.filter((r) => !top.includes(r));
  const byDept = new Map<string, Row[]>();
  for (const r of rest)
    byDept.set(String(r.department ?? "—"), [
      ...(byDept.get(String(r.department ?? "—")) ?? []),
      r,
    ]);
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No employees.</p>;
  return (
    <div className="space-y-3 text-sm">
      {top.map((m) => (
        <div
          key={m.id}
          className="mx-auto w-fit rounded-md border bg-primary/10 px-4 py-2 text-center"
        >
          <p className="font-semibold">{String(m.name)}</p>
          <p className="text-xs text-muted-foreground">{String(m.designation)}</p>
        </div>
      ))}
      <div className="flex flex-wrap justify-center gap-3 border-t pt-3">
        {[...byDept.entries()].map(([dept, list]) => (
          <div key={dept} className="min-w-40 rounded-md border p-2">
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{dept}</p>
            <ul className="space-y-0.5">
              {list.map((e) => (
                <li key={e.id}>
                  {String(e.name)}{" "}
                  <span className="text-xs text-muted-foreground">· {String(e.designation)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function HR() {
  const state = useERP();
  const [month, setMonth] = useState(isoDate(new Date()).slice(0, 7));
  const companies = scopeCompanies(state);

  const runPayroll = () => {
    let done = 0;
    let skipped = 0;
    for (const c of companies) {
      const r = ledger.runPayroll(c.id, month);
      if (r.ok) done += 1;
      else skipped += 1;
    }
    if (done)
      toast.success(`Payroll for ${month} posted for ${done} compan${done === 1 ? "y" : "ies"}`);
    else
      toast.info(
        skipped ? "Payroll already posted or no active employees." : "No companies in scope.",
      );
  };

  const emps = useMemo(
    () => state.collections.employees.filter((e) => companies.some((c) => c.id === e.companyId)),
    [state.collections.employees, companies],
  );

  return (
    <DataModule
      collection="employees"
      module="hr"
      title="HR & Payroll"
      noun="Employee"
      description="Employee profiles, organization chart and payroll per company, plus the group payroll dashboard. Running payroll posts salary expense, bank payment and tax withheld to the ledger."
      fields={FIELDS}
      statusKey="status"
      actions={
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            aria-label="Payroll month"
            className="h-8 rounded-md border bg-background px-2 text-sm"
          />
          <Button size="sm" variant="outline" onClick={runPayroll}>
            Run payroll
          </Button>
        </div>
      }
      summary={(rows) => {
        const active = rows.filter((r) => r.status === "Active");
        const gross = active.reduce((s, r) => s + grossSalary(toPayroll(r)), 0);
        const net = active.reduce((s, r) => s + netSalary(toPayroll(r)), 0);
        const dept = new Map<string, number>();
        for (const r of active)
          dept.set(
            String(r.department ?? "—"),
            (dept.get(String(r.department ?? "—")) ?? 0) + grossSalary(toPayroll(r)),
          );
        const posted = new Set(
          state.journal.filter((e) => e.source?.startsWith("payroll:")).map((e) => e.source),
        );
        const outstanding = companies.filter(
          (c) => emps.some((e) => e.companyId === c.id) && !posted.has(`payroll:${c.id}:${month}`),
        );
        return (
          <>
            <StatGrid>
              <Stat label="Employees" value={String(active.length)} />
              <Stat label="Monthly payroll (gross)" value={moneyShort(gross)} />
              <Stat label="Net salary payable" value={moneyShort(net)} />
              <Stat label="Annual payroll" value={moneyShort(gross * 12)} />
            </StatGrid>
            <div className="mb-6 grid gap-4 lg:grid-cols-3">
              <Panel title="Company-wise payroll" className="lg:col-span-1">
                <SimpleTable
                  head={["Company", "Staff", "Monthly"]}
                  align={["left", "right", "right"]}
                  rows={companies
                    .map((c) => {
                      const list = active.filter((r) => r.companyId === c.id);
                      return [
                        c.name,
                        String(list.length),
                        money(list.reduce((s, r) => s + grossSalary(toPayroll(r)), 0)),
                      ] as const;
                    })
                    .filter((r) => r[1] !== "0")
                    .map((r) => [...r])}
                />
              </Panel>
              <Panel title="Department-wise payroll">
                <SimpleTable
                  head={["Department", "Monthly"]}
                  align={["left", "right"]}
                  rows={[...dept.entries()].map(([d, a]) => [d, money(a)])}
                />
              </Panel>
              <Panel
                title={`Payroll status – ${month}`}
                description="Salary outstanding = not yet posted"
              >
                {outstanding.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Payroll posted for every company in scope.
                  </p>
                ) : (
                  <ul className="divide-y text-sm">
                    {outstanding.map((c) => (
                      <li key={c.id} className="flex justify-between py-1.5">
                        <span>{c.name}</span>
                        <span className="text-chart-2">Outstanding</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
            <Panel
              title="Organization chart"
              description={
                state.activeCompanyId === "all"
                  ? "Select a company to see its chart"
                  : "Reporting structure"
              }
              className="mb-6"
            >
              {state.activeCompanyId === "all" ? (
                <p className="text-sm text-muted-foreground">
                  Use the company switcher to view one company's organization chart.
                </p>
              ) : (
                <OrgChart rows={rows} />
              )}
            </Panel>
          </>
        );
      }}
    />
  );
}
