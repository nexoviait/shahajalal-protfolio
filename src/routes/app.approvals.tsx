import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { DataModule, type FieldDef } from "@/components/erp/DataModule";
import { Meter, Panel, SimpleTable, Stat, StatGrid } from "@/components/erp/kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { isoDate, money, moneyShort } from "@/lib/erp/format";
import { canEdit } from "@/lib/erp/rbac";
import { currentRole, currentUser, data, useERP } from "@/lib/erp/store";
import type { Row } from "@/lib/erp/types";

export const Route = createFileRoute("/app/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals | b Group" },
      {
        name: "description",
        content:
          "Multi-level approval workflow for expenses, purchases, salaries, assets, budgets, investments, contracts and payments.",
      },
    ],
  }),
  component: Approvals,
});

const TYPES = [
  "Expense approval",
  "Purchase approval",
  "Salary approval",
  "Asset purchase approval",
  "Project budget approval",
  "Investment approval",
  "Contract approval",
  "Bank payment approval",
];

const FIELDS: FieldDef[] = [
  { key: "type", label: "Request type", type: "select", options: TYPES, required: true },
  { key: "reason", label: "Reason", required: true },
  { key: "amount", label: "Amount", type: "money", required: true },
  { key: "requestedBy", label: "Requested by" },
  { key: "requestDate", label: "Request date", type: "date", defaultValue: isoDate(new Date()) },
  { key: "status", label: "Approval status", readOnly: true, defaultValue: "Pending" },
  { key: "documents", label: "Supporting documents", table: false },
  { key: "approvedBy", label: "Approved by", table: false, readOnly: true },
  { key: "approvalDate", label: "Approval date", table: false, readOnly: true },
  { key: "remarks", label: "Remarks", type: "textarea", table: false, readOnly: true },
];

function Decision({ row }: { row: Row }) {
  const state = useERP();
  const [remarks, setRemarks] = useState("");
  if (row.status !== "Pending" || !canEdit(currentRole(state), "approvals")) return null;
  const act = (approve: boolean) => {
    const res = data.decide(row.id, approve, remarks);
    if (res.ok) toast.success(approve ? "Approval recorded" : "Request rejected");
    else toast.error(res.error);
  };
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="mb-1 text-sm font-medium">
        Level {String(row.currentLevel)} of {String(row.requiredLevels)} approved
      </p>
      <Meter
        value={(Number(row.currentLevel) / Math.max(1, Number(row.requiredLevels))) * 100}
        tone="warn"
      />
      <Textarea
        className="mt-3"
        rows={2}
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder="Remarks"
        aria-label="Remarks"
      />
      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={() => act(true)}>
          Approve as {String(currentUser().name)}
        </Button>
        <Button size="sm" variant="outline" className="text-destructive" onClick={() => act(false)}>
          Reject
        </Button>
      </div>
    </div>
  );
}

function Approvals() {
  const state = useERP();
  return (
    <DataModule
      collection="approvals"
      module="approvals"
      title="Approvals"
      noun="Request"
      description="Requests are routed through the approval ladder configured in System Settings: larger amounts need more approval levels. Approved records are locked and cannot be edited or deleted."
      fields={FIELDS}
      statusKey="status"
      canDelete={(r) => r.status !== "Approved"}
      beforeSave={(row, isNew) =>
        isNew ? { ...row, requestedBy: row.requestedBy || String(currentUser().name) } : row
      }
      detail={(row) => <Decision row={row} />}
      summary={(rows) => (
        <>
          <StatGrid>
            <Stat
              label="Pending"
              value={String(rows.filter((r) => r.status === "Pending").length)}
              tone="warn"
            />
            <Stat
              label="Pending amount"
              value={moneyShort(
                rows
                  .filter((r) => r.status === "Pending")
                  .reduce((s, r) => s + Number(r.amount || 0), 0),
              )}
            />
            <Stat
              label="Approved"
              value={String(rows.filter((r) => r.status === "Approved").length)}
              tone="good"
            />
            <Stat
              label="Rejected"
              value={String(rows.filter((r) => r.status === "Rejected").length)}
            />
          </StatGrid>
          <Panel
            title="Approval limits"
            description="Configured in System Settings"
            className="mb-6"
          >
            <SimpleTable
              head={["Amount up to", "Approval levels required"]}
              align={["left", "right"]}
              rows={state.settings.approvalLimits.map((l) => [
                l.upTo > 1e12 ? "Above" : money(l.upTo),
                String(l.levels),
              ])}
            />
          </Panel>
        </>
      )}
    />
  );
}
