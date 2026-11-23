import { createFileRoute } from "@tanstack/react-router";

import { DataModule, type FieldDef } from "@/components/erp/DataModule";
import { Meter, Panel, SimpleTable, Stat, StatGrid, StatusPill } from "@/components/erp/kit";
import { isoDate, money, moneyShort, percent } from "@/lib/erp/format";
import type { Row, RowKey } from "@/lib/erp/types";

export const Route = createFileRoute("/app/projects")({
  head: () => ({
    meta: [
      { title: "Projects | b Group" },
      {
        name: "description",
        content:
          "Project budgets, cost tracking, progress, ROI and delayed activities for every company.",
      },
    ],
  }),
  component: Projects,
});

const COST_KEYS: RowKey[] = [
  "landCost",
  "constructionCost",
  "materials",
  "labor",
  "equipment",
  "consultantFees",
  "registration",
  "marketing",
  "otherCosts",
];

const FIELDS: FieldDef[] = [
  { key: "name", label: "Project name", required: true },
  { key: "manager", label: "Project manager" },
  { key: "startDate", label: "Start date", type: "date" },
  { key: "expectedCompletion", label: "Expected completion", type: "date" },
  { key: "budget", label: "Project budget", type: "money", required: true },
  { key: "progressPct", label: "Progress %", type: "percent" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["Planned", "In Progress", "On Hold", "Completed", "Cancelled"],
    defaultValue: "Planned",
  },
  { key: "investment", label: "Investment", type: "money", table: false },
  { key: "revenueTarget", label: "Revenue target", type: "money", table: false },
  { key: "team", label: "Team members", table: false },
  { key: "outstandingPayments", label: "Outstanding payments", type: "money", table: false },
  { key: "documents", label: "Documents (file names)", table: false, span: 2 },
  {
    key: "landCost",
    label: "Land cost",
    type: "money",
    table: false,
    section: "Cost tracking (actual cost is the sum of these)",
  },
  { key: "constructionCost", label: "Construction cost", type: "money", table: false },
  { key: "materials", label: "Materials", type: "money", table: false },
  { key: "labor", label: "Labor", type: "money", table: false },
  { key: "equipment", label: "Equipment", type: "money", table: false },
  { key: "consultantFees", label: "Consultant fees", type: "money", table: false },
  { key: "registration", label: "Registration", type: "money", table: false },
  { key: "marketing", label: "Marketing", type: "money", table: false },
  { key: "otherCosts", label: "Other costs", type: "money", table: false },
];

const actual = (r: Row) => COST_KEYS.reduce((s, k) => s + (Number(r[k]) || 0), 0);

function metrics(r: Row) {
  const cost = actual(r) || Number(r.actualCost) || 0;
  const budget = Number(r.budget) || 0;
  const revenue = Number(r.revenueTarget) || 0;
  const invested = Number(r.investment) || cost;
  const profit = revenue - cost;
  return {
    cost,
    budget,
    remaining: budget - cost,
    profit,
    roi: invested > 0 ? (profit / invested) * 100 : 0,
  };
}

function Projects() {
  const today = isoDate(new Date());
  return (
    <DataModule
      collection="projects"
      module="projects"
      title="Projects"
      noun="Project"
      description="Every company can run multiple projects. Actual cost is the sum of land, construction, materials, labor, equipment, consultants, registration, marketing and other costs."
      fields={FIELDS}
      statusKey="status"
      beforeSave={(row) => ({ ...row, actualCost: actual(row) })}
      detail={(row) => {
        const m = metrics(row);
        return (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p className="mb-2 font-medium">Budget vs actual</p>
            <Meter
              value={m.budget ? (m.cost / m.budget) * 100 : 0}
              tone={m.remaining < 0 ? "bad" : "primary"}
            />
            <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Actual cost</dt>
                <dd className="font-mono">{money(m.cost)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Remaining budget</dt>
                <dd className={`font-mono ${m.remaining < 0 ? "text-destructive" : ""}`}>
                  {money(m.remaining)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Estimated profit</dt>
                <dd className="font-mono">{money(m.profit)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">ROI</dt>
                <dd className="font-mono">{percent(m.roi)}</dd>
              </div>
            </dl>
          </div>
        );
      }}
      summary={(rows) => {
        const totals = rows.reduce(
          (s, r) => {
            const m = metrics(r);
            return {
              budget: s.budget + m.budget,
              cost: s.cost + m.cost,
              profit: s.profit + m.profit,
              out: s.out + (Number(r.outstandingPayments) || 0),
            };
          },
          { budget: 0, cost: 0, profit: 0, out: 0 },
        );
        const delayed = rows.filter(
          (r) =>
            String(r.expectedCompletion ?? "") &&
            String(r.expectedCompletion) < today &&
            r.status !== "Completed",
        );
        return (
          <>
            <StatGrid>
              <Stat label="Projects" value={String(rows.length)} />
              <Stat
                label="Budget"
                value={moneyShort(totals.budget)}
                hint={`Remaining ${moneyShort(totals.budget - totals.cost)}`}
              />
              <Stat
                label="Actual cost"
                value={moneyShort(totals.cost)}
                tone={totals.cost > totals.budget ? "bad" : "default"}
              />
              <Stat
                label="Outstanding payments"
                value={moneyShort(totals.out)}
                hint={`Expected profit ${moneyShort(totals.profit)}`}
              />
            </StatGrid>
            <Panel title="Project dashboard" className="mb-6">
              <SimpleTable
                head={["Project", "Budget", "Actual", "Remaining", "Progress", "ROI", "Status"]}
                align={["left", "right", "right", "right", "left", "right", "left"]}
                rows={rows.map((r) => {
                  const m = metrics(r);
                  return [
                    String(r.name),
                    moneyShort(m.budget),
                    moneyShort(m.cost),
                    moneyShort(m.remaining),
                    <div key="p" className="w-28">
                      <Meter value={Number(r.progressPct) || 0} />
                    </div>,
                    percent(m.roi, 0),
                    <StatusPill
                      key="s"
                      value={delayed.includes(r) ? "Delayed" : String(r.status)}
                    />,
                  ];
                })}
              />
            </Panel>
          </>
        );
      }}
    />
  );
}
