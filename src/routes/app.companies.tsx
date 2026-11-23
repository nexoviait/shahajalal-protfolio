import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { CompanyForm } from "@/components/erp/CompanyForm";
import { useScope } from "@/components/erp/hooks";
import { ExportMenu, PageHeader, Panel, StatusPill } from "@/components/erp/kit";
import { Button } from "@/components/ui/button";
import { moneyShort } from "@/lib/erp/format";
import { canEdit } from "@/lib/erp/rbac";
import { currentRole, ui } from "@/lib/erp/store";

export const Route = createFileRoute("/app/companies")({
  head: () => ({
    meta: [
      { title: "Company Portfolio | b Group" },
      {
        name: "description",
        content:
          "Every company and planned venture in the group, with profiles, status and performance.",
      },
    ],
  }),
  component: Portfolio,
});

function Portfolio() {
  const { state, companies, perCompany } = useScope();
  const [open, setOpen] = useState(false);
  const editable = canEdit(currentRole(state), "companies");

  const rows = perCompany.map(({ company: c, summary: s }) => ({
    Company: c.name,
    Status: c.status,
    Category: c.category,
    "Managing Director": c.managingDirector,
    Revenue: Math.round(s.revenue),
    Expenses: Math.round(s.expenses),
    "Net Profit": Math.round(s.profit),
    Assets: Math.round(s.assets),
    Liabilities: Math.round(s.liabilities),
    Employees: s.employees,
    Investment: Math.round(s.investment),
    Valuation: c.currentValuation,
  }));

  return (
    <div>
      <PageHeader
        title="Company Portfolio"
        description="Add unlimited companies and ventures. Every company keeps its own profile, ledger, team and reports."
        actions={
          <>
            <ExportMenu name="company-portfolio" rows={rows} />
            {editable ? (
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="size-4" /> Add company
              </Button>
            ) : null}
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {perCompany.map(({ company: c, summary: s }) => (
          <Panel key={c.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">{c.name}</h2>
                <p className="text-xs text-muted-foreground">{c.category || "Category not set"}</p>
              </div>
              <StatusPill value={c.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Revenue</dt>
                <dd className="font-mono tabular-nums">{moneyShort(s.revenue)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Net profit</dt>
                <dd className={`font-mono tabular-nums ${s.profit < 0 ? "text-destructive" : ""}`}>
                  {moneyShort(s.profit)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Assets</dt>
                <dd className="font-mono tabular-nums">{moneyShort(s.assets)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Employees</dt>
                <dd className="font-mono tabular-nums">{s.employees}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Investment</dt>
                <dd className="font-mono tabular-nums">{moneyShort(s.investment)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Valuation</dt>
                <dd className="font-mono tabular-nums">{moneyShort(c.currentValuation)}</dd>
              </div>
            </dl>
            <p className="mt-3 truncate text-xs text-muted-foreground">
              MD: {c.managingDirector || "—"} · Admin: {c.administrator || "—"}
            </p>
            <div className="mt-4 flex gap-2">
              <Button asChild size="sm" variant="outline" className="flex-1">
                <Link
                  to="/app/company/$companyId"
                  params={{ companyId: c.id }}
                  onClick={() => ui.setActiveCompany(c.id)}
                >
                  Open workspace
                </Link>
              </Button>
            </div>
          </Panel>
        ))}
      </div>
      {companies.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No companies yet.</p>
      ) : null}
      {open ? <CompanyForm open={open} onOpenChange={setOpen} /> : null}
    </div>
  );
}
