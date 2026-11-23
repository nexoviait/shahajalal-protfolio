import { createFileRoute } from "@tanstack/react-router";

import { DataModule, type FieldDef } from "@/components/erp/DataModule";
import { Stat, StatGrid } from "@/components/erp/kit";
import { money, moneyShort } from "@/lib/erp/format";

export const Route = createFileRoute("/app/land")({
  head: () => ({
    meta: [
      { title: "Land & Properties | b Group" },
      {
        name: "description",
        content:
          "Land profiles with Bangladesh survey references, legal status, valuation and property income.",
      },
    ],
  }),
  component: Land,
});

const FIELDS: FieldDef[] = [
  { key: "name", label: "Land / property name", required: true },
  { key: "district", label: "District" },
  { key: "upazila", label: "Upazila" },
  { key: "mouza", label: "Mouza" },
  { key: "areaDecimal", label: "Land area (decimal)", type: "number" },
  { key: "currentValuation", label: "Current valuation", type: "money" },
  { key: "jlNumber", label: "JL number", table: false },
  { key: "khatianNumber", label: "Khatian number", table: false },
  { key: "dagNumber", label: "Dag number", table: false },
  { key: "ownership", label: "Ownership information", table: false },
  { key: "purchasePrice", label: "Purchase price", type: "money", table: false },
  { key: "registrationCost", label: "Registration cost", type: "money", table: false },
  {
    key: "mutationStatus",
    label: "Mutation status",
    type: "select",
    options: ["Not Started", "In Progress", "Completed"],
    table: false,
  },
  { key: "legalStatus", label: "Legal status", table: false },
  { key: "gps", label: "GPS coordinates", table: false, placeholder: "22.6603, 89.7858" },
  {
    key: "propertyType",
    label: "Property type",
    type: "select",
    options: ["Land only", "Commercial", "Residential", "Rental", "Building project"],
    table: false,
    section: "Property management",
  },
  { key: "rentalIncome", label: "Rental income (monthly)", type: "money", table: false },
  { key: "maintenanceExpense", label: "Maintenance expense", type: "money", table: false },
  { key: "constructionCost", label: "Construction cost", type: "money", table: false },
  {
    key: "documents",
    label: "Documents (deed, khatian, mutation, DCR, tax receipts, survey, POA)",
    type: "textarea",
    table: false,
    section: "Land documents",
  },
];

function Land() {
  return (
    <DataModule
      collection="land"
      module="land"
      title="Land & Properties"
      noun="Property"
      description="A complete digital profile for each land parcel or property, including survey references, legal status, valuation and project profitability. Store the actual deed and survey files under Documents."
      fields={FIELDS}
      summary={(rows) => {
        const cost = rows.reduce(
          (s, r) =>
            s +
            Number(r.purchasePrice || 0) +
            Number(r.registrationCost || 0) +
            Number(r.constructionCost || 0),
          0,
        );
        const value = rows.reduce((s, r) => s + Number(r.currentValuation || 0), 0);
        return (
          <StatGrid>
            <Stat
              label="Properties"
              value={String(rows.length)}
              hint={`${rows.reduce((s, r) => s + Number(r.areaDecimal || 0), 0)} decimal`}
            />
            <Stat
              label="Total cost"
              value={moneyShort(cost)}
              hint="Purchase + registration + construction"
            />
            <Stat label="Current valuation" value={moneyShort(value)} />
            <Stat
              label="Unrealised gain"
              value={moneyShort(value - cost)}
              tone={value >= cost ? "good" : "bad"}
              hint={`Monthly rent ${money(rows.reduce((s, r) => s + Number(r.rentalIncome || 0), 0))}`}
            />
          </StatGrid>
        );
      }}
    />
  );
}
