import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useState } from "react";

import { DataModule, type FieldDef } from "@/components/erp/DataModule";
import { Stat, StatGrid, StatusPill } from "@/components/erp/kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { scopeCompanies } from "@/lib/erp/analytics";
import { isoDate, money } from "@/lib/erp/format";
import { canEdit } from "@/lib/erp/rbac";
import { currentRole, currentUser, data, useERP } from "@/lib/erp/store";
import type { Row } from "@/lib/erp/types";

export const Route = createFileRoute("/app/daily")({
  head: () => ({
    meta: [
      { title: "Daily Reports | b Group" },
      {
        name: "description",
        content:
          "Daily operations, financial and management reports from every company, with owner review.",
      },
    ],
  }),
  component: DailyReports,
});

const today = () => isoDate(new Date());

const FIELDS: FieldDef[] = [
  {
    key: "date",
    label: "Report date",
    type: "date",
    required: true,
    defaultValue: today(),
    section: "Report",
  },
  { key: "submittedBy", label: "Submitted by", table: true },
  { key: "revenue", label: "Today's revenue", type: "money", section: "B. Financial updates" },
  { key: "expenses", label: "Today's expenses", type: "money" },
  {
    key: "status",
    extensible: false,
    label: "Status",
    type: "select",
    options: ["Submitted", "Approved", "Correction Requested"],
    defaultValue: "Submitted",
  },
  { key: "requiredInvestment", label: "Required investment", type: "money", table: true },
  {
    key: "completedWork",
    label: "Work completed today",
    type: "textarea",
    table: false,
    section: "A. Business activities",
  },
  { key: "ongoingActivities", label: "Ongoing activities", type: "textarea", table: false },
  { key: "problems", label: "Problems that occurred", type: "textarea", table: false },
  { key: "decisions", label: "Decisions made", type: "textarea", table: false },
  { key: "needsApproval", label: "Needs management approval", type: "textarea", table: false },
  { key: "cashReceived", label: "Cash received", type: "money", table: false },
  { key: "bankReceived", label: "Bank received", type: "money", table: false },
  { key: "outstandingPayments", label: "Outstanding payments", type: "money", table: false },
  { key: "receivables", label: "Customer receivables", type: "money", table: false },
  { key: "payables", label: "Supplier payables", type: "money", table: false },
  { key: "cashBalance", label: "Cash balance", type: "money", table: false },
  {
    key: "customers",
    label: "Number of customers",
    type: "number",
    table: false,
    section: "C. Operational updates",
  },
  { key: "sales", label: "Number of sales", type: "number", table: false },
  { key: "ordersReceived", label: "Orders received", type: "number", table: false },
  { key: "ordersCompleted", label: "Orders completed", type: "number", table: false },
  { key: "projectProgress", label: "Projects progress", table: false },
  { key: "attendance", label: "Employee attendance", table: false },
  { key: "operationalIssues", label: "Operational issues", type: "textarea", table: false },
  {
    key: "achievements",
    label: "Today's achievements",
    type: "textarea",
    table: false,
    section: "D. Management updates",
  },
  { key: "challenges", label: "Problems and challenges", type: "textarea", table: false },
  { key: "tomorrowPlan", label: "Tomorrow's plan", type: "textarea", table: false },
  { key: "pendingDecisions", label: "Pending decisions", type: "textarea", table: false },
  { key: "ownerAttention", label: "Owner's attention required", type: "textarea", table: false },
  {
    key: "evidence",
    label: "Evidence (bill, receipt, photo, document file names)",
    type: "textarea",
    table: false,
    section: "E. Supporting evidence",
    placeholder: "bill-123.jpg, receipt.pdf",
  },
  { key: "notes", label: "Notes / voice-note reference", type: "textarea", table: false },
];

function Review({ row }: { row: Row }) {
  const state = useERP();
  const [comment, setComment] = useState(String(row.ownerComment ?? ""));
  if (!canEdit(currentRole(state), "dashboard") && currentRole(state) !== "Company Director")
    return null;
  const act = (status: "Approved" | "Correction Requested") => {
    const res = data.reviewReport(row.id, status, comment);
    if (res.ok) toast.success(`Report ${status.toLowerCase()}`);
    else toast.error(res.error);
  };
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="mb-2 text-sm font-medium">Owner review</p>
      <Textarea
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comment or correction request"
        aria-label="Review comment"
      />
      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={() => act("Approved")}>
          Approve
        </Button>
        <Button size="sm" variant="outline" onClick={() => act("Correction Requested")}>
          Request correction
        </Button>
      </div>
    </div>
  );
}

function DailyReports() {
  const state = useERP();
  const t = today();
  const companies = scopeCompanies(state).filter((c) => c.status === "Active");
  const submitted = companies.filter((c) =>
    state.collections.dailyReports.some((r) => r.companyId === c.id && r.date === t),
  );
  const missing = companies.filter((c) => !submitted.includes(c));
  return (
    <DataModule
      collection="dailyReports"
      module="daily"
      title="Daily Reports"
      noun="Report"
      description="Responsible persons submit a daily report per company. Reports are stored permanently in each company's daily log; the owner reviews, comments, approves or requests corrections."
      fields={FIELDS}
      statusKey="status"
      canDelete={(r) => r.status !== "Approved"}
      beforeSave={(row, isNew) =>
        isNew
          ? { ...row, submittedBy: String(currentUser().name), status: row.status || "Submitted" }
          : row
      }
      summary={(rows) => (
        <>
          <StatGrid>
            <Stat
              label="Submitted today"
              value={`${submitted.length}/${companies.length}`}
              tone={missing.length ? "warn" : "good"}
            />
            <Stat
              label="Missing today"
              value={String(missing.length)}
              hint={missing.map((c) => c.name).join(", ") || "None"}
              tone={missing.length ? "bad" : "default"}
            />
            <Stat
              label="Awaiting review"
              value={String(rows.filter((r) => r.status === "Submitted").length)}
            />
            <Stat
              label="Revenue reported"
              value={money(
                rows.filter((r) => r.date === t).reduce((s, r) => s + Number(r.revenue || 0), 0),
              )}
              hint="Today"
            />
          </StatGrid>
          {missing.length ? (
            <ul className="mb-4 flex flex-wrap gap-2" aria-label="Companies without a report today">
              {missing.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-sm"
                >
                  {c.name} <StatusPill value="Delayed" />
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
      detail={(row) => <Review row={row} />}
    />
  );
}
