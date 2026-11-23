import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader, Panel, SimpleTable } from "@/components/erp/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { BrandMark } from "@/components/erp/Brand";
import { FAVICON_LIMITS, LOGO_LIMITS, prepareImage } from "@/lib/erp/image";
import { DEFAULT_SETTINGS } from "@/lib/erp/seed";
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
  const logoInput = useRef<HTMLInputElement>(null);
  const faviconInput = useRef<HTMLInputElement>(null);

  const upload = async (
    f: File | undefined,
    limits: { maxBytes: number; maxDim: number },
    key: "logoDataUrl" | "faviconDataUrl",
  ) => {
    if (!f) return;
    try {
      ui.setSettings({ [key]: await prepareImage(f, limits) });
      toast.success(key === "logoDataUrl" ? "Logo updated" : "Favicon updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The image could not be used.");
    }
  };

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
          title="Branding"
          description="Name, logo, favicon and landing-page text used across the portal and the public home page."
          className="lg:col-span-2"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="brand-name">Brand name</Label>
                <Input
                  id="brand-name"
                  disabled={!editable}
                  maxLength={40}
                  value={s.brandName}
                  onChange={(e) => ui.setSettings({ brandName: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="brand-tagline">Tagline (shown under the name in the sidebar)</Label>
                <Input
                  id="brand-tagline"
                  disabled={!editable}
                  maxLength={60}
                  value={s.brandTagline}
                  onChange={(e) => ui.setSettings({ brandTagline: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="hero-title">Landing page headline</Label>
                <Textarea
                  id="hero-title"
                  rows={2}
                  disabled={!editable}
                  maxLength={140}
                  value={s.heroTitle}
                  onChange={(e) => ui.setSettings({ heroTitle: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="hero-text">Landing page description</Label>
                <Textarea
                  id="hero-text"
                  rows={4}
                  disabled={!editable}
                  maxLength={400}
                  value={s.heroText}
                  onChange={(e) => ui.setSettings({ heroText: e.target.value })}
                />
              </div>
            </div>
            <div className="grid content-start gap-6">
              <div>
                <p className="text-sm font-medium">Logo</p>
                <p className="mb-3 text-xs text-muted-foreground">
                  PNG, JPG, WebP or SVG, up to 1 MB. Large images are scaled down automatically.
                </p>
                <div className="flex items-center gap-4">
                  <div className="grid size-16 place-items-center rounded-lg border bg-muted/40">
                    <BrandMark className="size-12" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!editable}
                      onClick={() => logoInput.current?.click()}
                    >
                      Upload logo
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!editable || !s.logoDataUrl}
                      onClick={() => ui.setSettings({ logoDataUrl: "" })}
                    >
                      Remove
                    </Button>
                  </div>
                  <input
                    ref={logoInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    aria-label="Logo file"
                    onChange={(e) => {
                      void upload(e.target.files?.[0], LOGO_LIMITS, "logoDataUrl");
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Favicon</p>
                <p className="mb-3 text-xs text-muted-foreground">
                  The small icon in the browser tab. Square PNG, SVG or ICO, up to 256 KB.
                </p>
                <div className="flex items-center gap-4">
                  <div className="grid size-16 place-items-center rounded-lg border bg-muted/40">
                    {s.faviconDataUrl ? (
                      <img
                        src={s.faviconDataUrl}
                        alt="Favicon preview"
                        className="size-8 object-contain"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">Default</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!editable}
                      onClick={() => faviconInput.current?.click()}
                    >
                      Upload favicon
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!editable || !s.faviconDataUrl}
                      onClick={() => ui.setSettings({ faviconDataUrl: "" })}
                    >
                      Remove
                    </Button>
                  </div>
                  <input
                    ref={faviconInput}
                    type="file"
                    accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,image/jpeg,image/webp"
                    className="hidden"
                    aria-label="Favicon file"
                    onChange={(e) => {
                      void upload(e.target.files?.[0], FAVICON_LIMITS, "faviconDataUrl");
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!editable}
                  onClick={() => {
                    const {
                      brandName,
                      brandTagline,
                      logoDataUrl,
                      faviconDataUrl,
                      heroTitle,
                      heroText,
                    } = DEFAULT_SETTINGS;
                    ui.setSettings({
                      brandName,
                      brandTagline,
                      logoDataUrl,
                      faviconDataUrl,
                      heroTitle,
                      heroText,
                    });
                    toast.success("Branding reset to defaults");
                  }}
                >
                  Reset branding
                </Button>
              </div>
            </div>
          </div>
        </Panel>
        <Panel
          title="Dropdown lists & accounts"
          description="Options you created with “Add new…” in any dropdown. Records that already use a removed option keep their value."
          className="lg:col-span-2"
        >
          {Object.keys(s.customOptions).length === 0 && s.customAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing added yet. Open any dropdown (for example Document category or Finance
              category) and choose “Add new…”.
            </p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                {Object.entries(s.customOptions).map(([list, items]) => (
                  <div key={list}>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {list}
                    </p>
                    <ul className="flex flex-wrap gap-2">
                      {items.map((item) => (
                        <li
                          key={item}
                          className="flex items-center gap-1 rounded-full border bg-card py-1 pl-3 pr-1 text-sm"
                        >
                          {item}
                          <button
                            type="button"
                            disabled={!editable}
                            aria-label={`Remove ${item} from ${list}`}
                            onClick={() => ui.removeOption(list, item)}
                            className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-40"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Custom ledger accounts
                </p>
                <SimpleTable
                  head={["Code", "Name", "Type", ""]}
                  rows={s.customAccounts.map((a) => [
                    a.code,
                    a.name,
                    a.bank ? "bank" : a.type,
                    <Button
                      key={a.code}
                      size="sm"
                      variant="ghost"
                      disabled={!editable}
                      onClick={() => {
                        const r = ui.removeAccount(a.code);
                        if (!r.ok) toast.error(r.error);
                      }}
                    >
                      Remove
                    </Button>,
                  ])}
                  empty="No custom accounts."
                />
              </div>
            </div>
          )}
        </Panel>
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
