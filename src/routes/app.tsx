import { useEffect } from "react";
import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/erp/AppShell";
import { hydrate, useReady } from "@/lib/erp/store";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Portal | b Group" },
      {
        name: "description",
        content: "Centralized business management portal for the group and each company.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppLayout,
});

function AppLayout() {
  const ready = useReady();

  // State lives in the browser, so it is loaded after mount (keeps server and client markup identical).
  useEffect(() => {
    hydrate();
  }, []);

  if (!ready) {
    return (
      <div
        className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground"
        role="status"
      >
        Loading workspace…
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
