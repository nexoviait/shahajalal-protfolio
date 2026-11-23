import { createFileRoute } from "@tanstack/react-router";

import { DataModule, type FieldDef } from "@/components/erp/DataModule";
import { Panel, SimpleTable, Stat, StatGrid } from "@/components/erp/kit";
import { money, moneyShort, percent } from "@/lib/erp/format";
import { useERP } from "@/lib/erp/store";

export const Route = createFileRoute("/app/investments")({
  head: () => ({
    meta: [
      { title: "Investment & Shareholders | b Group" },
      {
        name: "description",
        content:
          "Investor records, share allocation, dividends and returns, kept separate from company valuation.",
      },
    ],
  }),
  component: Investments,
});

const FIELDS: FieldDef[] = [
  { key: "investorName", label: "Investor / shareholder", required: true },
  { key: "amount", label: "Investment amount", type: "money", required: true },
  { key: "date", label: "Investment date", type: "date" },
  { key: "sharePct", label: "Shareholding %", type: "percent" },
  { key: "shareQty", label: "Share quantity", type: "number" },
  { key: "sharePrice", label: "Share price", type: "money" },
  { key: "purpose", label: "Investment purpose", table: false },
  { key: "agreement", label: "Investment agreement ref.", table: false },
  { key: "expectedReturn", label: "Expected return %", type: "percent", table: false },
  { key: "actualReturn", label: "Actual return %", type: "percent", table: false },
  { key: "dividendPaid", label: "Dividends paid", type: "money", table: false },
  { key: "dividendPayable", label: "Dividend payable", type: "money", table: false },
];

function Investments() {
  const state = useERP();
  const name = (id?: string) => state.companies.find((c) => c.id === id)?.name ?? "—";
  return (
    <DataModule
      collection="investments"
      module="investments"
      title="Investment & Shareholders"
      noun="Investment"
      description="Share allocation, ownership and company valuation are tracked as separate concepts: shares record who owns what percentage, while valuation lives on the company profile."
      fields={FIELDS}
      summary={(rows) => {
        const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
        const payable = rows.reduce((s, r) => s + Number(r.dividendPayable || 0), 0);
        const paid = rows.reduce((s, r) => s + Number(r.dividendPaid || 0), 0);
        const byInvestor = new Map<string, number>();
        const byCompany = new Map<string, number>();
        for (const r of rows) {
          byInvestor.set(
            String(r.investorName),
            (byInvestor.get(String(r.investorName)) ?? 0) + Number(r.amount || 0),
          );
          byCompany.set(
            name(r.companyId),
            (byCompany.get(name(r.companyId)) ?? 0) + Number(r.amount || 0),
          );
        }
        const weighted = total
          ? rows.reduce((s, r) => s + Number(r.actualReturn || 0) * Number(r.amount || 0), 0) /
            total
          : 0;
        return (
          <>
            <StatGrid>
              <Stat label="Total investment" value={moneyShort(total)} />
              <Stat
                label="Return on investment"
                value={percent(weighted)}
                hint="Amount-weighted actual return"
              />
              <Stat label="Dividends paid" value={moneyShort(paid)} />
              <Stat
                label="Dividend payable"
                value={moneyShort(payable)}
                tone={payable ? "warn" : "default"}
              />
            </StatGrid>
            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <Panel title="Investor-wise investment">
                <SimpleTable
                  head={["Investor", "Amount"]}
                  align={["left", "right"]}
                  rows={[...byInvestor.entries()].map(([k, v]) => [k, money(v)])}
                />
              </Panel>
              <Panel title="Company-wise investment">
                <SimpleTable
                  head={["Company", "Amount"]}
                  align={["left", "right"]}
                  rows={[...byCompany.entries()].map(([k, v]) => [k, money(v)])}
                />
              </Panel>
            </div>
            <Panel
              title="Capital & valuation"
              description="Valuation is set on each company profile, independent of share records"
              className="mb-6"
            >
              <SimpleTable
                head={["Company", "Invested", "Valuation", "Shares allocated %"]}
                align={["left", "right", "right", "right"]}
                rows={state.companies
                  .filter((c) => rows.some((r) => r.companyId === c.id))
                  .map((c) => [
                    c.name,
                    money(
                      rows
                        .filter((r) => r.companyId === c.id)
                        .reduce((s, r) => s + Number(r.amount || 0), 0),
                    ),
                    money(c.currentValuation),
                    `${rows.filter((r) => r.companyId === c.id).reduce((s, r) => s + Number(r.sharePct || 0), 0)}%`,
                  ])}
              />
            </Panel>
          </>
        );
      }}
    />
  );
}
