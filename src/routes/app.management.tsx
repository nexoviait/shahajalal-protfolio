import { createFileRoute } from "@tanstack/react-router";

import { DataModule, type FieldDef } from "@/components/erp/DataModule";
import { Meter, Panel, SimpleTable, Stat, StatGrid } from "@/components/erp/kit";
import type { Row } from "@/lib/erp/types";

export const Route = createFileRoute("/app/management")({
  head: () => ({
    meta: [
      { title: "Management Team | b Group" },
      {
        name: "description",
        content:
          "Assign responsibilities, targets and KPIs to company managers and track performance scores.",
      },
    ],
  }),
  component: Management,
});

const FIELDS: FieldDef[] = [
  { key: "name", label: "Name", required: true },
  { key: "designation", label: "Designation", required: true },
  { key: "department", label: "Department" },
  { key: "monthlyTarget", label: "Monthly target", type: "money" },
  {
    key: "reportingFrequency",
    label: "Reporting frequency",
    type: "select",
    options: ["Daily", "Weekly", "Monthly"],
    defaultValue: "Daily",
  },
  { key: "kpi", label: "Performance KPI" },
  { key: "description", label: "Responsibility description", type: "textarea", table: false },
  { key: "reportingManager", label: "Reporting manager", table: false },
  {
    key: "tasksAssigned",
    label: "Tasks assigned",
    type: "number",
    table: false,
    section: "Performance inputs",
  },
  { key: "tasksCompleted", label: "Tasks completed", type: "number", table: false },
  { key: "delayedTasks", label: "Delayed tasks", type: "number", table: false },
  { key: "reportsExpected", label: "Reports expected", type: "number", table: false },
  { key: "reportsSubmitted", label: "Reports submitted", type: "number", table: false },
  { key: "targetAchievedPct", label: "Target achievement %", type: "percent", table: false },
  { key: "financialScore", label: "Financial performance (0-100)", type: "number", table: false },
  {
    key: "operationalScore",
    label: "Operational performance (0-100)",
    type: "number",
    table: false,
  },
];

/** Weighted score: reporting 20%, tasks 20%, target 25%, financial 20%, operational 15%. */
function performanceScore(r: Row): number {
  const pct = (a: unknown, b: unknown) =>
    Number(b) > 0 ? Math.min(100, (Number(a) / Number(b)) * 100) : 0;
  const reporting = pct(r.reportsSubmitted, r.reportsExpected);
  const tasks = pct(r.tasksCompleted, r.tasksAssigned);
  const delayPenalty = Math.min(20, Number(r.delayedTasks || 0) * 5);
  const score =
    reporting * 0.2 +
    tasks * 0.2 +
    Math.min(100, Number(r.targetAchievedPct || 0)) * 0.25 +
    Math.min(100, Number(r.financialScore || 0)) * 0.2 +
    Math.min(100, Number(r.operationalScore || 0)) * 0.15;
  return Math.max(0, Math.round(score - delayPenalty));
}

function Management() {
  return (
    <DataModule
      collection="responsibilities"
      module="management"
      title="Management Team"
      noun="Manager"
      description="Each company has its own management team. Assign responsibilities, targets and KPIs; the performance score combines reporting discipline, task completion, target achievement and financial and operational results."
      fields={FIELDS}
      summary={(rows) => {
        const scored = rows.map((r) => ({ r, score: performanceScore(r) }));
        const avg = scored.length
          ? Math.round(scored.reduce((s, x) => s + x.score, 0) / scored.length)
          : 0;
        return (
          <>
            <StatGrid>
              <Stat label="Team members tracked" value={String(rows.length)} />
              <Stat
                label="Average performance"
                value={`${avg}/100`}
                tone={avg >= 80 ? "good" : avg >= 60 ? "warn" : "bad"}
              />
              <Stat
                label="Delayed tasks"
                value={String(rows.reduce((s, r) => s + Number(r.delayedTasks || 0), 0))}
              />
              <Stat
                label="Reports missed"
                value={String(
                  rows.reduce(
                    (s, r) =>
                      s +
                      Math.max(0, Number(r.reportsExpected || 0) - Number(r.reportsSubmitted || 0)),
                    0,
                  ),
                )}
              />
            </StatGrid>
            <Panel title="Individual performance reports" className="mb-6">
              <SimpleTable
                head={["Name", "Designation", "Reports", "Tasks", "Target", "Score"]}
                align={["left", "left", "right", "right", "right", "left"]}
                rows={scored.map(({ r, score }) => [
                  String(r.name),
                  String(r.designation),
                  `${r.reportsSubmitted ?? 0}/${r.reportsExpected ?? 0}`,
                  `${r.tasksCompleted ?? 0}/${r.tasksAssigned ?? 0}`,
                  `${r.targetAchievedPct ?? 0}%`,
                  <div key="m" className="flex items-center gap-2">
                    <div className="w-24">
                      <Meter
                        value={score}
                        tone={score >= 80 ? "primary" : score >= 60 ? "warn" : "bad"}
                      />
                    </div>
                    <span className="font-mono text-xs">{score}</span>
                  </div>,
                ])}
              />
            </Panel>
          </>
        );
      }}
    />
  );
}
