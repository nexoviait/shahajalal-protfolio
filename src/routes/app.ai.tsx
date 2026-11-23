import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Send } from "lucide-react";

import { PageHeader, Panel, SimpleTable } from "@/components/erp/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EXAMPLE_QUESTIONS,
  answerQuestion,
  dailySummary,
  forecast,
  riskReport,
  type AiAnswer,
} from "@/lib/erp/ai";
import { detectExpenseAnomalies } from "@/lib/erp/analytics";
import { money, moneyShort } from "@/lib/erp/format";
import { useERP } from "@/lib/erp/store";

export const Route = createFileRoute("/app/ai")({
  head: () => ({
    meta: [
      { title: "AI Business Intelligence | b Group" },
      {
        name: "description",
        content:
          "Ask questions about group performance and get answers grounded in recorded data, with the period and sources shown.",
      },
    ],
  }),
  component: AiPage,
});

function AiPage() {
  const state = useERP();
  const [q, setQ] = useState("");
  const [history, setHistory] = useState<{ q: string; a: AiAnswer }[]>([]);
  const ask = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setHistory((h) => [{ q: t, a: answerQuestion(state, t) }, ...h]);
    setQ("");
  };
  const summary = useMemo(() => dailySummary(state), [state]);
  const fc = useMemo(() => forecast(state, 3), [state]);
  const anomalies = useMemo(() => detectExpenseAnomalies(state), [state]);
  const risks = useMemo(() => riskReport(state), [state]);
  const name = (id: string) => state.companies.find((c) => c.id === id)?.name ?? id;

  return (
    <div>
      <PageHeader
        title="AI Business Intelligence"
        description="The assistant analyses only data already recorded in the system. Every answer shows its reporting period and source figures. It never invents financial information and never executes transactions."
      />
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Panel title="Ask the AI CFO" className="lg:col-span-2">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask(q);
            }}
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. Which company spent the most money this month?"
              aria-label="Question"
            />
            <Button type="submit">
              <Send className="size-4" /> Ask
            </Button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => ask(ex)}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {ex}
              </button>
            ))}
          </div>
          <div className="mt-5 space-y-4" aria-live="polite">
            {history.map((h, i) => (
              <div key={i} className="rounded-md border p-4">
                <p className="text-sm font-medium">{h.q}</p>
                <p className="mt-2 text-sm">{h.a.answer}</p>
                {h.a.supported ? (
                  <div className="mt-3 rounded bg-muted/50 p-3 text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Period:</span> {h.a.period}
                    </p>
                    {h.a.sources.length ? (
                      <ul className="mt-1 list-disc pl-4">
                        {h.a.sources.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ask a question or pick an example above.
              </p>
            ) : null}
          </div>
        </Panel>
        <Panel title="Daily business summary">
          <ul className="list-disc space-y-2 pl-5 text-sm">
            {summary.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Cash flow & profitability forecast"
          description="Linear trend of the last completed months (group, intercompany eliminated). A projection, not a promise."
        >
          <div className="h-56" role="img" aria-label="Bar chart of projected revenue and expenses">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={fc.map((f) => ({
                  month: f.month,
                  Revenue: Math.round(f.projectedRevenue),
                  Expenses: Math.round(f.projectedExpenses),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(v: number) => moneyShort(v)}
                  width={64}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Legend />
                <Bar dataKey="Revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <SimpleTable
            head={["Month", "Revenue", "Expenses", "Projected cash"]}
            align={["left", "right", "right", "right"]}
            rows={fc.map((f) => [
              f.month,
              money(f.projectedRevenue),
              money(f.projectedExpenses),
              money(f.projectedCash),
            ])}
          />
        </Panel>
        <div className="space-y-4">
          <Panel
            title="Expense anomaly detection"
            description="Months where expenses exceed 1.6× the company's recent average"
          >
            <SimpleTable
              head={["Company", "Month", "Expenses", "Average", "Ratio"]}
              align={["left", "left", "right", "right", "right"]}
              rows={anomalies.map((a) => [
                name(a.companyId),
                a.month,
                money(a.amount),
                money(a.average),
                `${a.ratio.toFixed(1)}×`,
              ])}
              empty="No unusual expenses detected."
            />
          </Panel>
          <Panel title="Business risks identified">
            {risks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No risks identified from current data.
              </p>
            ) : (
              <ul className="list-disc space-y-1.5 pl-5 text-sm">
                {risks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
