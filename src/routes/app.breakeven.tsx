import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader, Panel, SimpleTable, Stat, StatGrid } from "@/components/erp/kit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { companyBreakEvenStatus, visibleCompanies } from "@/lib/erp/analytics";
import { addMonthsISO, breakEven, scenarios, type BreakEvenInput } from "@/lib/erp/breakeven";
import { isoDate, money, moneyShort, percent } from "@/lib/erp/format";
import { useERP } from "@/lib/erp/store";

export const Route = createFileRoute("/app/breakeven")({
  head: () => ({
    meta: [
      { title: "Break-even Analysis | b Group" },
      {
        name: "description",
        content:
          "Break-even quantity and revenue, ROI, payback and best, base and worst case scenarios for every company and new venture.",
      },
    ],
  }),
  component: BreakEvenPage,
});

type Source = { id: string; label: string; input: BreakEvenInput };

function BreakEvenPage() {
  const state = useERP();
  const sources = useMemo<Source[]>(() => {
    const list: Source[] = [];
    for (const c of visibleCompanies(state)) {
      const idea = state.collections.ideas.find((i) => i.companyId === c.id);
      if (idea) {
        const units = Number(idea.expectedUnits) || 0;
        const vc = Number(idea.variableCostPerUnit) || 0;
        list.push({
          id: c.id,
          label: `${c.name} (planned venture)`,
          input: {
            initialInvestment: Number(idea.requiredInvestment) || Number(idea.startupCost) || 0,
            fixedMonthlyCosts: Math.max(0, Number(idea.monthlyExpenses) - vc * units),
            variableCostPerUnit: vc,
            pricePerUnit: Number(idea.pricePerUnit) || 0,
            expectedUnitsPerMonth: units,
          },
        });
      } else if (c.fixedMonthlyCosts > 0) {
        const be = companyBreakEvenStatus(state, c.id);
        if (be) {
          list.push({
            id: c.id,
            label: `${c.name} (from ledger, normalised to 100 BDT per unit)`,
            input: {
              initialInvestment: c.initialInvestment,
              fixedMonthlyCosts: c.fixedMonthlyCosts,
              variableCostPerUnit: Math.max(
                0,
                be.avgRevenue > 0
                  ? ((be.avgExpenses - c.fixedMonthlyCosts) / be.avgRevenue) * 100
                  : 0,
              ),
              pricePerUnit: 100,
              expectedUnitsPerMonth: be.avgRevenue / 100,
            },
          });
        }
      }
    }
    return list;
  }, [state]);

  const [sourceId, setSourceId] = useState<string>("");
  const source = sources.find((s) => s.id === sourceId) ?? sources[0];
  return source ? (
    <Analyzer key={source.id} source={source} sources={sources} onSelect={setSourceId} />
  ) : (
    <div>
      <PageHeader
        title="Break-even Analysis"
        description="Add a company with fixed monthly costs, or a business idea, to analyse it."
      />
      <p className="text-sm text-muted-foreground">Nothing to analyse yet.</p>
    </div>
  );
}

function Analyzer({
  source,
  sources,
  onSelect,
}: {
  source: Source;
  sources: Source[];
  onSelect: (id: string) => void;
}) {
  const [input, setInput] = useState<BreakEvenInput>(source.input);
  const base = breakEven(input);
  const sc = scenarios(input);
  const num = (k: keyof BreakEvenInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInput({ ...input, [k]: Number(e.target.value) || 0 });

  const projection = useMemo(() => {
    const out: { month: number; Base: number; Worst: number; Best: number }[] = [];
    for (let m = 0; m <= 36; m += 3) {
      out.push({
        month: m,
        Base: Math.round(sc.Base.monthlyProfit * m - input.initialInvestment),
        Worst: Math.round(sc.Worst.monthlyProfit * m - input.initialInvestment),
        Best: Math.round(sc.Best.monthlyProfit * m - input.initialInvestment),
      });
    }
    return out;
  }, [
    sc.Base.monthlyProfit,
    sc.Worst.monthlyProfit,
    sc.Best.monthlyProfit,
    input.initialInvestment,
  ]);

  const finite = (n: number, fmt: (x: number) => string) =>
    Number.isFinite(n) ? fmt(n) : "Not achievable";
  const date =
    base.monthsToRecoverInvestment !== null
      ? addMonthsISO(isoDate(new Date()), base.monthsToRecoverInvestment)
      : "—";

  return (
    <div>
      <PageHeader
        title="Break-even Analysis"
        description="Contribution per unit = price − variable cost. Break-even quantity = fixed costs ÷ contribution per unit. Break-even revenue = fixed costs ÷ contribution margin ratio. Change any assumption to simulate scenarios."
      />
      <div className="mb-6 max-w-lg">
        <Label htmlFor="be-source">Company / venture</Label>
        <Select value={source.id} onValueChange={onSelect}>
          <SelectTrigger id="be-source" className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sources.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Panel title="Assumptions" className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {(
            [
              ["initialInvestment", "Initial investment"],
              ["fixedMonthlyCosts", "Fixed monthly costs"],
              ["variableCostPerUnit", "Variable cost per unit"],
              ["pricePerUnit", "Selling price per unit"],
              ["expectedUnitsPerMonth", "Expected units / month"],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="grid gap-1.5">
              <Label htmlFor={`be-${k}`}>{label}</Label>
              <Input
                id={`be-${k}`}
                type="number"
                min={0}
                value={Math.round(input[k] * 100) / 100}
                onChange={num(k)}
              />
            </div>
          ))}
        </div>
      </Panel>
      <StatGrid>
        <Stat
          label="Contribution per unit"
          value={money(base.contributionPerUnit)}
          tone={base.feasible ? "default" : "bad"}
          hint={
            base.feasible
              ? `Margin ratio ${percent(base.contributionMarginRatio * 100)}`
              : "Price must exceed variable cost"
          }
        />
        <Stat
          label="Break-even quantity / month"
          value={finite(base.breakEvenUnits, (n) => n.toLocaleString("en-BD"))}
          hint={`Remaining ${finite(base.remainingUnitsToBreakEven, (n) => n.toLocaleString("en-BD"))} units`}
        />
        <Stat
          label="Break-even revenue / month"
          value={finite(base.breakEvenRevenue, moneyShort)}
        />
        <Stat
          label="Monthly profit"
          value={moneyShort(base.monthlyProfit)}
          tone={base.monthlyProfit >= 0 ? "good" : "bad"}
          hint={`Margin ${percent(base.profitMarginPct)}`}
        />
        <Stat label="Annual ROI" value={percent(base.annualRoiPct)} />
        <Stat
          label="Payback period"
          value={
            base.monthsToRecoverInvestment === null
              ? "Never"
              : `${base.monthsToRecoverInvestment} months`
          }
        />
        <Stat label="Estimated break-even date" value={date} hint="Investment recovered" />
        <Stat label="Monthly revenue" value={moneyShort(base.monthlyRevenue)} />
      </StatGrid>
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Scenarios"
          description="Worst: volume −30%, price −5%, costs +10%. Best: volume +30%, price +5%, costs −5%."
        >
          <SimpleTable
            head={["Scenario", "Monthly profit", "Break-even units", "Payback", "ROI"]}
            align={["left", "right", "right", "right", "right"]}
            rows={(["Worst", "Base", "Best"] as const).map((k) => [
              k,
              money(sc[k].monthlyProfit),
              finite(sc[k].breakEvenUnits, (n) => n.toLocaleString("en-BD")),
              sc[k].monthsToRecoverInvestment === null
                ? "Never"
                : `${sc[k].monthsToRecoverInvestment} mo`,
              percent(sc[k].annualRoiPct),
            ])}
          />
        </Panel>
        <Panel title="Cumulative profit after investment" description="Crosses zero at payback">
          <div className="h-64" role="img" aria-label="Line chart of cumulative profit by scenario">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projection}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  label={{ value: "Months", position: "insideBottom", offset: -2, fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(v: number) => moneyShort(v)}
                  tick={{ fontSize: 12 }}
                  width={64}
                />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Legend />
                <ReferenceLine y={0} stroke="var(--muted-foreground)" />
                <Line
                  type="monotone"
                  dataKey="Worst"
                  stroke="var(--chart-4)"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="Base"
                  stroke="var(--chart-3)"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="Best"
                  stroke="var(--chart-1)"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}
