import { createFileRoute } from "@tanstack/react-router";

import { DataModule, type FieldDef } from "@/components/erp/DataModule";
import { Meter, Panel, Stat, StatGrid } from "@/components/erp/kit";
import { isoDate } from "@/lib/erp/format";

export const Route = createFileRoute("/app/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks & Workflow | b Group" },
      {
        name: "description",
        content: "Create, assign and track tasks across every company from one board.",
      },
    ],
  }),
  component: Tasks,
});

const STATUSES = [
  "Not Started",
  "In Progress",
  "Under Review",
  "Pending Approval",
  "Completed",
  "Delayed",
  "Cancelled",
];

const FIELDS: FieldDef[] = [
  { key: "title", label: "Task", required: true },
  { key: "assignedTo", label: "Responsible person" },
  {
    key: "priority",
    label: "Priority",
    type: "select",
    options: ["Low", "Medium", "High", "Urgent"],
    defaultValue: "Medium",
  },
  { key: "deadline", label: "Deadline", type: "date", required: true },
  { key: "progress", label: "Progress %", type: "percent" },
  {
    key: "status",
    extensible: false,
    label: "Status",
    type: "select",
    options: STATUSES,
    defaultValue: "Not Started",
  },
  { key: "department", label: "Department", table: false },
  { key: "description", label: "Description", type: "textarea", table: false },
  { key: "documents", label: "Attached files", table: false },
  { key: "comments", label: "Comments", type: "textarea", table: false },
];

function Tasks() {
  const today = isoDate(new Date());
  return (
    <DataModule
      collection="tasks"
      module="tasks"
      title="Tasks & Workflow"
      noun="Task"
      description="Assign work to a company, department and person with a priority and deadline. Moving a task to Pending Approval requests sign-off."
      fields={FIELDS}
      statusKey="status"
      beforeSave={(row) => ({
        ...row,
        status:
          row.status !== "Completed" &&
          row.status !== "Cancelled" &&
          String(row.deadline ?? "") < today &&
          Number(row.progress) < 100 &&
          row.status === "Not Started"
            ? "Delayed"
            : Number(row.progress) >= 100 && row.status !== "Cancelled"
              ? "Completed"
              : row.status,
      })}
      summary={(rows) => (
        <>
          <StatGrid>
            {["In Progress", "Pending Approval", "Delayed", "Completed"].map((s) => (
              <Stat
                key={s}
                label={s}
                value={String(rows.filter((r) => r.status === s).length)}
                tone={s === "Delayed" ? "bad" : "default"}
              />
            ))}
          </StatGrid>
          <Panel title="Overall completion" className="mb-6">
            <Meter
              value={
                rows.length
                  ? (rows.filter((r) => r.status === "Completed").length / rows.length) * 100
                  : 0
              }
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {rows.filter((r) => r.status === "Completed").length} of {rows.length} tasks completed
            </p>
          </Panel>
        </>
      )}
    />
  );
}
