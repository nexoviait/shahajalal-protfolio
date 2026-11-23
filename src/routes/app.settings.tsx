import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader, Panel, SimpleTable } from "@/components/erp/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { isoDate, money } from "@/lib/erp/format";
import { canEdit } from "@/lib/erp/rbac";
import { currentRole, system, ui, useERP } from "@/lib/erp/store";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "System Settings | b Group" },
      {
        name: "description",
        content:
          "Approval limits, alert thresholds, email notifications, backups and the audit log.",
      },
    ],
  }),
  component: Settings,
});

const ALERT_TYPES = [
  "Daily Report Submitted",
  "Daily Report Missing",
  "Expense Approval Required",
  "Salary Payment Due",
  "Document Expiry",
  "Project Deadline",
  "Budget Exceeded",
  "Low Cash Balance",
  "Unusual Expense",
  "Investment Required",
];

function Settings() {
  const state = useERP();
  const editable = canEdit(currentRole(state), "settings");
  const s = state.settings;
  const file = useRef<HTMLInputElement>(null);
  const [limits, setLimits] = useState(s.approvalLimits.map((l) => ({ ...l })));

  const saveLimits = () => {
    const sorted = [...limits].sort((a, b) => a.upTo - b.upTo);
    if (sorted.some((l) => !(l.upTo > 0) || !(l.levels >= 1))) {
      toast.error("Each limit needs an amount above zero and at least one level.");
      return;
    }
    ui.setSettings({ approvalLimits: sorted });
    toast.success("Approval limits saved");
  };

  const backup = () => {
    const blob = new Blob([system.exportBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `b-group-backup-${isoDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const restore = async (f: File | undefined) => {
    if (!f) return;
    if (!window.confirm("Restoring replaces all current data in this browser. Continue?")) return;
    const r = system.importBackup(await f.text());
    if (r.ok) toast.success("Backup restored");
    else toast.error(r.error);
  };

  return (
    <div>
      <PageHeader
        title="System Settings"
        description="Controls that apply to the whole group. Only the Group Owner and Group Administrator can change them."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Approval limits"
          description="Amounts up to each limit need the stated number of approval levels (multi-level workflow)."
        >
          <div className="space-y-2">
            {limits.map((l, i) => (
              <div key={i} className="grid grid-cols-2 items-end gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor={`lim-${i}`}>Up to (BDT)</Label>
                  <Input
                    id={`lim-${i}`}
                    type="number"
                    min={1}
                    disabled={!editable || i === limits.length - 1}
                    value={i === limits.length - 1 ? "" : l.upTo}
                    placeholder={i === limits.length - 1 ? "Above all limits" : ""}
                    onChange={(e) =>
                      setLimits(
                        limits.map((x, j) =>
                          j === i ? { ...x, upTo: Number(e.target.value) } : x,
                        ),
                      )
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`lvl-${i}`}>Levels</Label>
                  <Input
                    id={`lvl-${i}`}
                    type="number"
                    min={1}
                    max={5}
                    disabled={!editable}
                    value={l.levels}
                    onChange={(e) =>
                      setLimits(
                        limits.map((x, j) =>
                          j === i ? { ...x, levels: Number(e.target.value) } : x,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <Button className="mt-4" size="sm" disabled={!editable} onClick={saveLimits}>
            Save limits
          </Button>
        </Panel>
        <Panel title="Alert thresholds">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="low-cash">Low cash balance below (BDT)</Label>
              <Input
                id="low-cash"
                type="number"
                min={0}
                disabled={!editable}
                value={s.lowCashThreshold}
                onChange={(e) => ui.setSettings({ lowCashThreshold: Number(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Currently {money(s.lowCashThreshold)} per company.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="doc-days">Warn before document expiry (days)</Label>
              <Input
                id="doc-days"
                type="number"
                min={1}
                disabled={!editable}
                value={s.documentExpiryDays}
                onChange={(e) =>
                  ui.setSettings({ documentExpiryDays: Number(e.target.value) || 1 })
                }
              />
            </div>
          </div>
        </Panel>
        <Panel
          title="Email notifications"
          description="In-app alerts are always on. Choose which are also emailed; delivery needs the backend mailer."
        >
          <div className="mb-3 grid gap-1.5">
            <Label htmlFor="alert-email">Send alerts to</Label>
            <Input
              id="alert-email"
              type="email"
              disabled={!editable}
              value={s.alertEmail}
              placeholder="owner@example.com"
              onChange={(e) => ui.setSettings({ alertEmail: e.target.value })}
            />
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ALERT_TYPES.map((t) => (
              <li
                key={t}
                className="flex items-center justify-between gap-2 rounded border px-3 py-2 text-sm"
              >
                <Label htmlFor={`al-${t}`} className="font-normal">
                  {t}
                </Label>
                <Switch
                  id={`al-${t}`}
                  disabled={!editable}
                  checked={s.emailAlerts.includes(t)}
                  onCheckedChange={(on) =>
                    ui.setSettings({
                      emailAlerts: on
                        ? [...s.emailAlerts, t]
                        : s.emailAlerts.filter((x) => x !== t),
                    })
                  }
                />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel
          title="Backup, restore and data export"
          description="Exports every company, ledger entry, register and audit record as one JSON file."
        >
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={backup}>
              Download backup
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!editable}
              onClick={() => file.current?.click()}
            >
              Restore from backup
            </Button>
            <input
              ref={file}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                void restore(e.target.files?.[0]);
                e.target.value = "";
              }}
              aria-label="Backup file"
            />
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              disabled={!editable}
              onClick={() => {
                if (window.confirm("Replace everything with fresh demo data?")) {
                  system.resetDemo();
                  toast.success("Demo data restored");
                }
              }}
            >
              Reset to demo data
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Data in this build lives in your browser. Before production use, connect the backend
            (PostgreSQL with row-level security, authentication with two-factor sign-in, automated
            backups) described in docs/ARCHITECTURE.md.
          </p>
        </Panel>
      </div>
      <Panel
        title="Audit log"
        description="Who did what and when (most recent first)"
        className="mt-4"
      >
        <SimpleTable
          head={["When", "User", "Action", "Target", "Detail"]}
          rows={state.audit
            .slice(0, 50)
            .map((a) => [
              a.at.replace("T", " ").slice(0, 19),
              a.user,
              a.action,
              a.target,
              a.detail,
            ])}
        />
      </Panel>
    </div>
  );
}
