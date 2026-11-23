import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Pencil } from "lucide-react";

import { CompanyForm } from "@/components/erp/CompanyForm";
import {
  Meter,
  PageHeader,
  Panel,
  SimpleTable,
  Stat,
  StatGrid,
  StatusPill,
} from "@/components/erp/kit";
import { Button } from "@/components/ui/button";
import { companyBreakEvenStatus, currentRange, summarize } from "@/lib/erp/analytics";
import { isoDate, money, moneyShort, percent } from "@/lib/erp/format";
import { canEdit } from "@/lib/erp/rbac";
import { currentRole, useERP } from "@/lib/erp/store";

export const Route = createFileRoute("/app/company/$companyId")({
  head: () => ({
    meta: [
      { title: "Company Workspace | b Group" },
      {
        name: "description",
        content:
          "Dedicated workspace for one company: dashboard, daily log, team, assets and break-even.",
      },
    ],
  }),
  component: CompanyWorkspace,
});

function CompanyWorkspace() {
  const { companyId } = Route.useParams();
  const state = useERP();
  const [editing, setEditing] = useState(false);
  const company = state.companies.find((c) => c.id === companyId);
  if (!company) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-semibold">Company not found</h1>
        <Button asChild className="mt-4">
          <Link to="/app/companies">Back to portfolio</Link>
        </Button>
      </div>
    );
  }
  const s = summarize(state, [companyId], currentRange(state));
  const be = companyBreakEvenStatus(state, companyId);
  const col = state.collections;
  const mine = <T extends { companyId?: string | undefined }>(rows: T[]) =>
    rows.filter((r) => r.companyId === companyId);
  const reports = mine(col.dailyReports)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 7);
  const projects = mine(col.projects);
  const tasks = mine(col.tasks).filter((t) => t.status !== "Completed" && t.status !== "Cancelled");
  const team = mine(col.employees);
  const today = isoDate(new Date());
  const beProgress =
    be && Number.isFinite(be.result.breakEvenRevenue) && be.result.breakEvenRevenue > 0
      ? (be.avgRevenue / be.result.breakEvenRevenue) * 100
      : 0;

  return (
    <div>
      <PageHeader
        title={company.name}
        description={`${company.category || "Company"} · ${company.registrationNo || "Registration not set"}`}
        actions={
          <>
            <StatusPill value={company.status} />
            {canEdit(currentRole(state), "companies") ? (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="size-4" /> Edit profile
              </Button>
            ) : null}
          </>
        }
      />
      <StatGrid>
        <Stat label="Revenue" value={moneyShort(s.revenue)} />
        <Stat label="Expenses" value={moneyShort(s.expenses)} />
        <Stat
          label="Net profit / loss"
          value={moneyShort(s.profit)}
          tone={s.profit >= 0 ? "good" : "bad"}
        />
        <Stat label="Cash & bank" value={moneyShort(s.cash + s.bank)} />
        <Stat label="Total assets" value={moneyShort(s.assets)} />
        <Stat label="Total liabilities" value={moneyShort(s.liabilities)} />
        <Stat
          label="Employees"
          value={String(s.employees)}
          hint={`Payroll ${moneyShort(s.monthlyPayroll)}/mo`}
        />
        <Stat
          label="Valuation"
          value={moneyShort(company.currentValuation)}
          hint={`Invested ${moneyShort(s.investment)}`}
        />
      </StatGrid>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Company profile">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {[
              ["Trade license", company.tradeLicense],
              ["TIN", company.tin],
              ["BIN", company.bin],
              ["Incorporated", company.incorporationDate],
              ["Managing director", company.managingDirector],
              ["Administrator", company.administrator],
              ["Website", company.website],
              ["Contact", company.contact],
              ["Address", company.address],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd>{v || "—"}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Vision: </span>
              {company.vision || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Mission: </span>
              {company.mission || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Objectives: </span>
              {company.objectives || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Business model: </span>
              {company.businessModel || "—"}
            </p>
          </div>
        </Panel>
        <Panel
          title="Break-even status"
          description="Average of the last three months vs fixed monthly costs"
        >
          {be && company.fixedMonthlyCosts > 0 ? (
            <>
              <p className="text-sm">
                Average revenue <span className="font-mono">{money(be.avgRevenue)}</span> vs
                break-even revenue{" "}
                <span className="font-mono">
                  {Number.isFinite(be.result.breakEvenRevenue)
                    ? money(be.result.breakEvenRevenue)
                    : "n/a"}
                </span>
              </p>
              <div className="my-3">
                <Meter value={beProgress} tone={be.reached ? "primary" : "warn"} />
              </div>
              <p className="text-sm">
                {be.reached
                  ? "Break-even reached."
                  : `${percent(Math.max(0, 100 - beProgress))} of revenue still needed to break even.`}
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to="/app/breakeven">Open break-even analysis</Link>
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Set the company's fixed monthly costs in its profile to track break-even.
            </p>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Daily log" description="Latest reports" className="lg:col-span-2">
          <SimpleTable
            head={["Date", "Submitted by", "Revenue", "Expenses", "Status"]}
            align={["left", "left", "right", "right", "left"]}
            rows={reports.map((r) => [
              String(r.date),
              String(r.submittedBy),
              money(Number(r.revenue)),
              money(Number(r.expenses)),
              <StatusPill key="s" value={String(r.status)} />,
            ])}
            empty={`No reports yet. ${today} report not submitted.`}
          />
        </Panel>
        <Panel title="Open tasks">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open tasks.</p>
          ) : (
            <ul className="divide-y text-sm">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="truncate">{String(t.title)}</span>
                  <StatusPill value={String(t.status)} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Projects" className="lg:col-span-2">
          <SimpleTable
            head={["Project", "Budget", "Actual", "Progress", "Status"]}
            align={["left", "right", "right", "right", "left"]}
            rows={projects.map((p) => [
              String(p.name),
              moneyShort(Number(p.budget)),
              moneyShort(Number(p.actualCost)),
              `${p.progressPct}%`,
              <StatusPill key="s" value={String(p.status)} />,
            ])}
            empty="No projects."
          />
        </Panel>
        <Panel title="Team">
          <p className="text-sm text-muted-foreground">{team.length} employees on the register.</p>
          <ul className="mt-2 divide-y text-sm">
            {team.slice(0, 6).map((e) => (
              <li key={e.id} className="flex justify-between gap-2 py-1.5">
                <span className="truncate">{String(e.name)}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {String(e.designation)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      {editing ? <CompanyForm open={editing} onOpenChange={setEditing} company={company} /> : null}
    </div>
  );
}
