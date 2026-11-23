import { createFileRoute } from "@tanstack/react-router";

import { DataModule, type FieldDef } from "@/components/erp/DataModule";
import { Stat, StatGrid } from "@/components/erp/kit";
import { isoDate, moneyShort } from "@/lib/erp/format";

export const Route = createFileRoute("/app/personal")({
  head: () => ({
    meta: [
      { title: "Personal Owner Profile | b Group" },
      {
        name: "description",
        content:
          "Private owner finances, investments, assets, goals and reminders kept separate from company accounting.",
      },
    ],
  }),
  component: Personal,
});

const KINDS = [
  "Income",
  "Expense",
  "Investment",
  "Asset",
  "Liability",
  "Goal",
  "Idea",
  "Reminder",
  "Note",
  "Document",
];

const FIELDS: FieldDef[] = [
  { key: "kind", label: "Type", type: "select", options: KINDS, required: true },
  { key: "title", label: "Title", required: true },
  { key: "amount", label: "Amount", type: "money" },
  { key: "date", label: "Date", type: "date", defaultValue: isoDate(new Date()) },
  { key: "notes", label: "Notes", type: "textarea", table: false },
];

function Personal() {
  return (
    <DataModule
      collection="personal"
      module="personal"
      title="Personal Owner Profile"
      noun="Entry"
      companyScoped={false}
      description="Personal income, expenses, investments, assets, liabilities, goals and reminders. These records never touch any company ledger, so personal and group accounting stay separate."
      fields={FIELDS}
      summary={(rows) => {
        const sum = (k: string) =>
          rows.filter((r) => r.kind === k).reduce((s, r) => s + Number(r.amount || 0), 0);
        const net = sum("Asset") + sum("Investment") - sum("Liability");
        return (
          <StatGrid>
            <Stat label="Personal income" value={moneyShort(sum("Income"))} />
            <Stat label="Personal expenses" value={moneyShort(sum("Expense"))} />
            <Stat label="Investments" value={moneyShort(sum("Investment"))} />
            <Stat
              label="Net worth (assets + investments − liabilities)"
              value={moneyShort(net)}
              tone={net >= 0 ? "good" : "bad"}
            />
          </StatGrid>
        );
      }}
    />
  );
}
