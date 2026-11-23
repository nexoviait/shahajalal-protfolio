import { createFileRoute } from "@tanstack/react-router";

import { DataModule, type FieldDef } from "@/components/erp/DataModule";
import { Meter, Panel, Stat, StatGrid } from "@/components/erp/kit";
import { addMonthsISO, breakEven } from "@/lib/erp/breakeven";
import { money, moneyShort } from "@/lib/erp/format";
import type { Row } from "@/lib/erp/types";

export const Route = createFileRoute("/app/planning")({
  head: () => ({
    meta: [
      { title: "Business Planning | b Group" },
      {
        name: "description",
        content:
          "Track new venture ideas from concept to profitability with a 14-stage milestone tracker.",
      },
    ],
  }),
  component: Planning,
});

const STAGES = [
  "Business Idea",
  "Market Research",
  "Feasibility Study",
  "Business Plan",
  "Investment Approval",
  "Legal Registration",
  "Infrastructure Development",
  "Team Recruitment",
  "Business Launch",
  "Initial Operations",
  "Revenue Generation",
  "Break-even",
  "Profitability",
  "Expansion",
];

const FIELDS: FieldDef[] = [
  { key: "name", label: "Business name", required: true },
  { key: "category", label: "Business category" },
  {
    key: "stage",
    label: "Development stage",
    type: "select",
    options: STAGES,
    defaultValue: STAGES[0] ?? "",
  },
  { key: "requiredInvestment", label: "Required investment", type: "money" },
  { key: "monthlyRevenue", label: "Expected monthly revenue", type: "money" },
  { key: "monthlyExpenses", label: "Expected monthly expenses", type: "money" },
  { key: "startDate", label: "Start date", type: "date", table: false },
  { key: "concept", label: "Business concept", type: "textarea", table: false },
  { key: "vision", label: "Vision", type: "textarea", table: false },
  { key: "mission", label: "Mission", type: "textarea", table: false },
  { key: "targetMarket", label: "Target market / customer profile", table: false },
  { key: "competitors", label: "Competitor analysis", type: "textarea", table: false },
  { key: "revenueModel", label: "Business & revenue model", table: false },
  { key: "requiredManpower", label: "Required manpower", type: "number", table: false },
  { key: "requiredAssets", label: "Required assets", table: false },
  { key: "location", label: "Location", table: false },
  { key: "legalRequirements", label: "Legal requirements", type: "textarea", table: false },
  { key: "startupCost", label: "Estimated startup cost", type: "money", table: false },
  {
    key: "pricePerUnit",
    label: "Selling price per unit",
    type: "money",
    table: false,
    section: "Unit economics (for break-even)",
  },
  { key: "variableCostPerUnit", label: "Variable cost per unit", type: "money", table: false },
  { key: "expectedUnits", label: "Expected units per month", type: "number", table: false },
  { key: "risks", label: "Risk analysis", type: "textarea", table: false },
];

function ideaResult(r: Row) {
  const fixed = Math.max(
    0,
    Number(r.monthlyExpenses) - Number(r.variableCostPerUnit) * Number(r.expectedUnits),
  );
  return breakEven({
    initialInvestment: Number(r.requiredInvestment) || Number(r.startupCost) || 0,
    fixedMonthlyCosts: fixed,
    variableCostPerUnit: Number(r.variableCostPerUnit) || 0,
    pricePerUnit: Number(r.pricePerUnit) || 0,
    expectedUnitsPerMonth: Number(r.expectedUnits) || 0,
  });
}

function Planning() {
  return (
    <DataModule
      collection="ideas"
      module="planning"
      title="Business Planning"
      noun="Venture"
      description="Add a business idea before it is registered or operating, then move it through the development stages. Each venture shows its projected profit, break-even and risks."
      fields={FIELDS}
      detail={(row) => {
        const idx = Math.max(0, STAGES.indexOf(String(row.stage)));
        const res = ideaResult(row);
        const net = Number(row.monthlyRevenue) - Number(row.monthlyExpenses);
        return (
          <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
            <div>
              <p className="mb-1 font-medium">
                Milestone tracker – stage {idx + 1} of {STAGES.length}
              </p>
              <Meter value={((idx + 1) / STAGES.length) * 100} />
              <ol className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                {STAGES.map((s, i) => (
                  <li
                    key={s}
                    className={i <= idx ? "font-medium text-primary" : "text-muted-foreground"}
                  >
                    {i + 1}. {s}
                  </li>
                ))}
              </ol>
            </div>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Expected net profit / month</dt>
                <dd className="font-mono">{money(net)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Break-even units</dt>
                <dd className="font-mono">
                  {Number.isFinite(res.breakEvenUnits) ? res.breakEvenUnits : "n/a"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Payback (months)</dt>
                <dd className="font-mono">{res.monthsToRecoverInvestment ?? "never"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Expected break-even date</dt>
                <dd className="font-mono">
                  {res.monthsToRecoverInvestment !== null && row.startDate
                    ? addMonthsISO(String(row.startDate), res.monthsToRecoverInvestment)
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>
        );
      }}
      summary={(rows) => (
        <>
          <StatGrid>
            <Stat label="Ventures in pipeline" value={String(rows.length)} />
            <Stat
              label="Investment required"
              value={moneyShort(rows.reduce((s, r) => s + Number(r.requiredInvestment || 0), 0))}
            />
            <Stat
              label="Expected monthly revenue"
              value={moneyShort(rows.reduce((s, r) => s + Number(r.monthlyRevenue || 0), 0))}
            />
            <Stat
              label="Expected monthly profit"
              value={moneyShort(
                rows.reduce(
                  (s, r) => s + Number(r.monthlyRevenue || 0) - Number(r.monthlyExpenses || 0),
                  0,
                ),
              )}
              tone="good"
            />
          </StatGrid>
          <Panel
            title="Development timeline"
            description="Where each venture is today"
            className="mb-6"
          >
            <ul className="space-y-3">
              {rows.map((r) => {
                const idx = Math.max(0, STAGES.indexOf(String(r.stage)));
                return (
                  <li key={r.id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium">{String(r.name)}</span>
                      <span className="text-muted-foreground">{String(r.stage)}</span>
                    </div>
                    <Meter value={((idx + 1) / STAGES.length) * 100} />
                  </li>
                );
              })}
            </ul>
          </Panel>
        </>
      )}
    />
  );
}
