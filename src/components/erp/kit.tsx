import type { ReactNode } from "react";
import { Download, FileSpreadsheet, Printer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadCSV, downloadExcel, printPDF, type Cell } from "@/lib/erp/export";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div data-anim="header" className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div>
      ) : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      data-anim="card"
      className={cn("min-w-0 rounded-lg border bg-card p-5 shadow-sm", className)}
    >
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            {title ? <h2 className="text-base font-semibold text-foreground">{title}</h2> : null}
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "bad" | "warn";
}) {
  const color =
    tone === "good"
      ? "text-primary"
      : tone === "bad"
        ? "text-destructive"
        : tone === "warn"
          ? "text-chart-2"
          : "text-foreground";
  return (
    <div data-anim="card" className="min-w-0 rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 truncate font-mono text-base font-semibold tabular-nums sm:text-xl",
          color,
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 break-words text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{children}</div>
  );
}

const STATUS_TONES: Record<string, string> = {
  Active: "border-primary/30 bg-primary/10 text-primary",
  Approved: "border-primary/30 bg-primary/10 text-primary",
  Completed: "border-primary/30 bg-primary/10 text-primary",
  Submitted: "border-chart-3/30 bg-chart-3/10 text-chart-3",
  Pending: "border-chart-2/30 bg-chart-2/10 text-chart-2",
  "Pending Approval": "border-chart-2/30 bg-chart-2/10 text-chart-2",
  "In Progress": "border-chart-3/30 bg-chart-3/10 text-chart-3",
  "Under Development": "border-chart-3/30 bg-chart-3/10 text-chart-3",
  Planned: "border-muted-foreground/30 bg-muted text-muted-foreground",
  Delayed: "border-destructive/30 bg-destructive/10 text-destructive",
  Rejected: "border-destructive/30 bg-destructive/10 text-destructive",
  Closed: "border-destructive/30 bg-destructive/10 text-destructive",
  "Correction Requested": "border-destructive/30 bg-destructive/10 text-destructive",
};

export function StatusPill({ value }: { value: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "whitespace-nowrap",
        STATUS_TONES[value] ?? "border-border bg-muted text-muted-foreground",
      )}
    >
      {value}
    </Badge>
  );
}

export function ExportMenu({
  name,
  rows,
  columns,
}: {
  name: string;
  rows: Record<string, Cell>[];
  columns?: string[];
}) {
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => downloadCSV(name, rows, columns)}>
        <Download className="size-4" /> CSV
      </Button>
      <Button variant="outline" size="sm" onClick={() => downloadExcel(name, rows, columns)}>
        <FileSpreadsheet className="size-4" /> Excel
      </Button>
      <Button variant="outline" size="sm" onClick={printPDF}>
        <Printer className="size-4" /> PDF
      </Button>
    </>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

export function Meter({
  value,
  tone = "primary",
}: {
  value: number;
  tone?: "primary" | "warn" | "bad";
}) {
  const v = Math.max(0, Math.min(100, value));
  const bar = tone === "bad" ? "bg-destructive" : tone === "warn" ? "bg-chart-2" : "bg-primary";
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={cn("h-full rounded-full", bar)} style={{ width: `${v}%` }} />
    </div>
  );
}

/** Simple responsive table used by report-style pages. */
export function SimpleTable({
  head,
  rows,
  align,
  empty = "No data for this selection.",
}: {
  head: string[];
  rows: ReactNode[][];
  align?: ("left" | "right")[];
  empty?: string;
}) {
  if (rows.length === 0) return <Empty>{empty}</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            {head.map((h, i) => (
              <th
                key={h}
                className={cn("px-3 py-2 font-medium", align?.[i] === "right" && "text-right")}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-muted/40">
              {r.map((c, j) => (
                <td
                  key={j}
                  className={cn(
                    "px-3 py-2",
                    align?.[j] === "right" && "text-right font-mono tabular-nums",
                  )}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
