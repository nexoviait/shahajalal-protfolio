import { useMemo } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";

import { Empty, PageHeader, Panel, StatusPill } from "@/components/erp/kit";
import { Button } from "@/components/ui/button";
import { deriveNotifications, visibleCompanies } from "@/lib/erp/analytics";
import { ui, useERP } from "@/lib/erp/store";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications | b Group" },
      {
        name: "description",
        content:
          "Missing reports, approvals, payments, document expiry, budget and cash alerts in one place.",
      },
    ],
  }),
  component: Notifications,
});

function Notifications() {
  const state = useERP();
  const visible = visibleCompanies(state).map((c) => c.id);
  const notices = useMemo(
    () => deriveNotifications(state).filter((n) => !n.companyId || visible.includes(n.companyId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );
  const unread = notices.filter((n) => !state.readNotifications.includes(n.id));
  const name = (id?: string) => state.companies.find((c) => c.id === id)?.name ?? "Group";
  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Alerts are generated live from reports, approvals, documents, projects, tasks, payroll and cash. Configure which ones are also emailed in System Settings."
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={unread.length === 0}
            onClick={() => ui.markRead(notices.map((n) => n.id))}
          >
            Mark all as read
          </Button>
        }
      />
      <Panel>
        {notices.length === 0 ? (
          <Empty>Nothing needs your attention.</Empty>
        ) : (
          <ul className="divide-y">
            {notices.map((n) => {
              const read = state.readNotifications.includes(n.id);
              return (
                <li
                  key={n.id}
                  className={`flex flex-wrap items-start justify-between gap-3 py-3 ${read ? "opacity-60" : ""}`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill
                        value={
                          n.severity === "critical"
                            ? "Delayed"
                            : n.severity === "warning"
                              ? "Pending"
                              : "Submitted"
                        }
                      />
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {n.type}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {name(n.companyId)} · {n.detail}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to={n.link} onClick={() => ui.markRead([n.id])}>
                        Open
                      </Link>
                    </Button>
                    {!read ? (
                      <Button size="sm" variant="ghost" onClick={() => ui.markRead([n.id])}>
                        Mark read
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
