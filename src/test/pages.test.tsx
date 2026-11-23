import { QueryClient } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NAV } from "@/lib/erp/i18n";
import { buildSeed } from "@/lib/erp/seed";
import { system, ui } from "@/lib/erp/store";
import { Route as LayoutRoute } from "@/routes/app";
import { Route as IndexRoute } from "@/routes/index";
import { Route as DashboardRoute } from "@/routes/app.index";
import { Route as CompanyRoute } from "@/routes/app.company.$companyId";
import { Route as CompaniesRoute } from "@/routes/app.companies";
import { Route as DailyRoute } from "@/routes/app.daily";
import { Route as FinanceRoute } from "@/routes/app.finance";
import { Route as TreasuryRoute } from "@/routes/app.treasury";
import { Route as AssetsRoute } from "@/routes/app.assets";
import { Route as HrRoute } from "@/routes/app.hr";
import { Route as ManagementRoute } from "@/routes/app.management";
import { Route as ProjectsRoute } from "@/routes/app.projects";
import { Route as LandRoute } from "@/routes/app.land";
import { Route as InvestmentsRoute } from "@/routes/app.investments";
import { Route as PlanningRoute } from "@/routes/app.planning";
import { Route as BreakEvenRoute } from "@/routes/app.breakeven";
import { Route as DocumentsRoute } from "@/routes/app.documents";
import { Route as TasksRoute } from "@/routes/app.tasks";
import { Route as ApprovalsRoute } from "@/routes/app.approvals";
import { Route as AiRoute } from "@/routes/app.ai";
import { Route as ReportsRoute } from "@/routes/app.reports";
import { Route as NotificationsRoute } from "@/routes/app.notifications";
import { Route as PersonalRoute } from "@/routes/app.personal";
import { Route as UsersRoute } from "@/routes/app.users";
import { Route as SettingsRoute } from "@/routes/app.settings";

type Page = { options: { component?: unknown } };
const PAGES: Record<string, Page> = {
  "/app": DashboardRoute,
  "/app/companies": CompaniesRoute,
  "/app/daily": DailyRoute,
  "/app/finance": FinanceRoute,
  "/app/treasury": TreasuryRoute,
  "/app/assets": AssetsRoute,
  "/app/hr": HrRoute,
  "/app/management": ManagementRoute,
  "/app/projects": ProjectsRoute,
  "/app/land": LandRoute,
  "/app/investments": InvestmentsRoute,
  "/app/planning": PlanningRoute,
  "/app/breakeven": BreakEvenRoute,
  "/app/documents": DocumentsRoute,
  "/app/tasks": TasksRoute,
  "/app/approvals": ApprovalsRoute,
  "/app/ai": AiRoute,
  "/app/reports": ReportsRoute,
  "/app/notifications": NotificationsRoute,
  "/app/personal": PersonalRoute,
  "/app/users": UsersRoute,
  "/app/settings": SettingsRoute,
};

// Recharts measures the DOM, which jsdom cannot do; a stub keeps charts from warning.
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", RO);

/**
 * Mount the real page components under a minimal router (the production root renders <html>,
 * which jsdom cannot host). The /app layout, sidebar and every page are the real ones.
 */
async function renderAt(path: string) {
  const root = createRootRoute({ component: Outlet });
  const landing = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: IndexRoute.options.component as never,
  });
  const layout = createRoute({
    getParentRoute: () => root,
    path: "/app",
    component: LayoutRoute.options.component as never,
  });
  const children = Object.entries(PAGES).map(([to, page]) =>
    createRoute({
      getParentRoute: () => layout,
      path: to === "/app" ? "/" : to.replace("/app", ""),
      component: page.options.component as never,
    }),
  );
  const company = createRoute({
    getParentRoute: () => layout,
    path: "/company/$companyId",
    component: CompanyRoute.options.component as never,
  });
  const router = createRouter({
    routeTree: root.addChildren([landing, layout.addChildren([...children, company])]),
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(<RouterProvider router={router} />);
  return router;
}

describe("every page renders against the seeded workspace", () => {
  beforeEach(() => {
    system._replace(buildSeed(new Date()));
  });
  afterEach(() => cleanup());

  it("renders the landing page", async () => {
    await renderAt("/");
    expect(
      await screen.findByRole("heading", { level: 1, name: /portfolio of companies/i }),
    ).toBeTruthy();
  });

  for (const item of NAV) {
    it(`renders ${item.en}`, async () => {
      await renderAt(item.to);
      await waitFor(
        () => {
          expect(screen.getAllByRole("heading", { level: 1 }).length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );
      expect(screen.queryByText(/this page didn't load/i)).toBeNull();
      expect(screen.queryByText(/access restricted/i)).toBeNull();
    });
  }

  it("renders a company workspace", async () => {
    await renderAt("/app/company/best-health");
    expect(
      await screen.findByRole("heading", { level: 1, name: /best health diagnostic/i }),
    ).toBeTruthy();
  });

  it("shows the restricted message to a role without access", async () => {
    ui.setUser("u-investor");
    await renderAt("/app/finance");
    expect(await screen.findByText(/access restricted/i)).toBeTruthy();
    ui.setUser("u-owner");
  });
});
