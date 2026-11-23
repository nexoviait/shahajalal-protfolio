import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { DataModule, type FieldDef } from "@/components/erp/DataModule";
import { Panel, SimpleTable, Stat, StatGrid } from "@/components/erp/kit";
import { Button } from "@/components/ui/button";
import {
  annualDepreciation,
  asOf,
  cost,
  DEP_METHODS,
  schedule,
  toDepInput,
} from "@/lib/erp/depreciation";
import { isoDate, money, moneyShort } from "@/lib/erp/format";
import { ledger, useERP } from "@/lib/erp/store";
import type { Row } from "@/lib/erp/types";

export const Route = createFileRoute("/app/assets")({
  head: () => ({
    meta: [
      { title: "Assets & Depreciation | b Group" },
      {
        name: "description",
        content:
          "Asset register per company with straight-line, written-down-value and custom depreciation posted to the ledger.",
      },
    ],
  }),
  component: Assets,
});

const CATEGORIES = [
  "Land",
  "Buildings",
  "Office Equipment",
  "Medical Equipment",
  "Diagnostic Machines",
  "Laboratory Equipment",
  "Computers",
  "Vehicles",
  "Furniture",
  "Machinery",
  "Software",
  "Other Fixed Assets",
];

const FIELDS: FieldDef[] = [
  { key: "name", label: "Asset name", required: true },
  { key: "assetCode", label: "Asset ID", required: true },
  { key: "category", label: "Category", type: "select", options: CATEGORIES },
  { key: "purchaseDate", label: "Purchase date", type: "date", required: true },
  { key: "purchasePrice", label: "Purchase price", type: "money", required: true },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["In Use", "Under Maintenance", "Transferred", "Impaired", "Disposed"],
    defaultValue: "In Use",
  },
  { key: "department", label: "Department", table: false },
  { key: "supplier", label: "Supplier", table: false },
  { key: "invoiceNo", label: "Invoice", table: false },
  { key: "installationCost", label: "Installation cost", type: "money", table: false },
  { key: "usefulLifeYears", label: "Useful life (years)", type: "number", table: false },
  {
    key: "method",
    label: "Depreciation method",
    type: "select",
    options: DEP_METHODS,
    table: false,
  },
  { key: "ratePercent", label: "Depreciation rate % (WDV)", type: "percent", table: false },
  { key: "salvageValue", label: "Salvage value", type: "money", table: false },
  {
    key: "customSchedule",
    label: "Custom yearly schedule (comma separated)",
    table: false,
    span: 2,
    placeholder: "500000,400000,300000",
  },
  { key: "warranty", label: "Warranty", table: false },
  { key: "insurance", label: "Insurance", table: false },
  { key: "location", label: "Physical location", table: false },
  { key: "responsiblePerson", label: "Responsible person", table: false },
  { key: "maintenance", label: "Maintenance history", type: "textarea", table: false },
];

function DepreciationDetail({ row }: { row: Row }) {
  const input = toDepInput(row);
  const month = isoDate(new Date()).slice(0, 7);
  const now = asOf(input, month);
  const first = schedule(input, 12);
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-sm">
      <p className="mb-2 font-medium">Depreciation (live calculation)</p>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Cost</dt>
          <dd className="font-mono">{money(cost(input))}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Year-1 depreciation</dt>
          <dd className="font-mono">{money(annualDepreciation(input))}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Monthly (first)</dt>
          <dd className="font-mono">{money(first[0]?.charge ?? 0)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Book value now</dt>
          <dd className="font-mono">{money(now.bookValue)}</dd>
        </div>
      </dl>
    </div>
  );
}

function Assets() {
  const state = useERP();
  const [busy, setBusy] = useState(false);
  const month = isoDate(new Date()).slice(0, 7);

  const post = () => {
    setBusy(true);
    const n = ledger.postDepreciation(month);
    setBusy(false);
    if (n > 0) toast.success(`Posted ${n} depreciation entr${n === 1 ? "y" : "ies"} to the ledger`);
    else toast.info("Depreciation is already up to date.");
  };

  return (
    <DataModule
      collection="assets"
      module="assets"
      title="Assets & Depreciation"
      noun="Asset"
      description="A separate asset register for every company. Monthly and yearly depreciation is calculated automatically and posted to the accounting ledger, updating each asset's book value. New assets post their purchase to the ledger."
      fields={FIELDS}
      beforeSave={(row) => ({
        ...row,
        assetCode: row.assetCode || `AST-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      })}
      canDelete={(r) => !state.journal.some((e) => e.source?.includes(`:${r.id}`))}
      actions={
        <Button size="sm" variant="outline" onClick={post} disabled={busy}>
          Post depreciation to {month}
        </Button>
      }
      detail={(row) => <DepreciationDetail row={row} />}
      summary={(rows) => {
        const calc = rows.map((r) => {
          const input = toDepInput(r);
          const a = asOf(input, month);
          return { r, input, ...a };
        });
        const totalCost = calc.reduce((s, c) => s + cost(c.input), 0);
        const acc = calc.reduce((s, c) => s + c.accumulated, 0);
        const monthly = calc.reduce((s, c) => s + (schedule(c.input, 12)[0]?.charge ?? 0), 0);
        return (
          <>
            <StatGrid>
              <Stat label="Assets" value={String(rows.length)} />
              <Stat label="Cost" value={moneyShort(totalCost)} />
              <Stat label="Accumulated depreciation" value={moneyShort(acc)} />
              <Stat
                label="Book value"
                value={moneyShort(totalCost - acc)}
                hint={`≈ ${moneyShort(monthly)} depreciation per month`}
              />
            </StatGrid>
            <Panel title="Depreciation by asset" description={`As of ${month}`} className="mb-6">
              <SimpleTable
                head={["Asset", "Method", "Year-1 charge", "Accumulated", "Book value"]}
                align={["left", "left", "right", "right", "right"]}
                rows={calc.map((c) => [
                  String(c.r.name),
                  String(c.r.method ?? "Straight-Line"),
                  money(annualDepreciation(c.input)),
                  money(c.accumulated),
                  money(c.bookValue),
                ])}
              />
            </Panel>
          </>
        );
      }}
    />
  );
}
