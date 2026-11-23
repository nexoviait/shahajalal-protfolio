import { createFileRoute } from "@tanstack/react-router";

import { DataModule, type FieldDef } from "@/components/erp/DataModule";
import { Stat, StatGrid } from "@/components/erp/kit";
import { isoDate } from "@/lib/erp/format";
import { useERP } from "@/lib/erp/store";

export const Route = createFileRoute("/app/documents")({
  head: () => ({
    meta: [
      { title: "Documents | b Group" },
      {
        name: "description",
        content:
          "Company document register with categories, expiry reminders, versions and access permissions.",
      },
    ],
  }),
  component: Documents,
});

const DOCUMENT_CATEGORIES = [
  "Company Registration",
  "Trade License",
  "TIN",
  "BIN",
  "VAT Documents",
  "Bank Documents",
  "Director Documents",
  "Shareholder Documents",
  "Contracts",
  "Agreements",
  "Legal Documents",
  "Licenses",
  "Government Approvals",
  "Medical Licenses",
  "Insurance",
  "Land Documents",
  "Construction Documents",
  "Employee Documents",
  "Tax Returns",
  "Audit Reports",
  "Meeting Minutes",
];

const FIELDS: FieldDef[] = [
  { key: "title", label: "Document title", required: true },
  { key: "category", label: "Category", type: "select", options: DOCUMENT_CATEGORIES },
  { key: "issueDate", label: "Issue date", type: "date" },
  { key: "expiryDate", label: "Expiry date", type: "date" },
  { key: "version", label: "Version", type: "number", defaultValue: 1 },
  {
    key: "fileName",
    label: "File name (PDF, image, Word, Excel)",
    placeholder: "license-2026.pdf",
  },
  { key: "tags", label: "Tags (comma separated)", table: false },
  { key: "access", label: "Access permissions", table: false, placeholder: "Owner, Director" },
  { key: "downloads", label: "Download count", type: "number", table: false, readOnly: true },
];

function Documents() {
  const state = useERP();
  const today = isoDate(new Date());
  const soon = isoDate(
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate() + state.settings.documentExpiryDays,
    ),
  );
  return (
    <DataModule
      collection="documents"
      module="documents"
      title="Documents"
      noun="Document"
      description="A separate document register for each company. The owner is notified automatically before any dated document expires. File contents are held in secure object storage once the backend is connected; this register records the metadata, versions and permissions."
      fields={FIELDS}
      beforeSave={(row, isNew) => (isNew ? row : { ...row, version: Number(row.version || 1) })}
      summary={(rows) => {
        const expired = rows.filter((r) => r.expiryDate && String(r.expiryDate) < today);
        const expiring = rows.filter(
          (r) => r.expiryDate && String(r.expiryDate) >= today && String(r.expiryDate) <= soon,
        );
        return (
          <StatGrid>
            <Stat label="Documents" value={String(rows.length)} />
            <Stat
              label="Expiring soon"
              value={String(expiring.length)}
              tone={expiring.length ? "warn" : "default"}
              hint={`Within ${state.settings.documentExpiryDays} days`}
            />
            <Stat
              label="Expired"
              value={String(expired.length)}
              tone={expired.length ? "bad" : "default"}
            />
            <Stat
              label="Categories used"
              value={String(new Set(rows.map((r) => r.category)).size)}
            />
          </StatGrid>
        );
      }}
    />
  );
}
