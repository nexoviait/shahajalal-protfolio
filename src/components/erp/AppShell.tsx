import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  CalendarRange,
  ChevronLeft,
  Menu,
  Moon,
  Search,
  ShieldAlert,
  Sun,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { BrandEffects, BrandMark } from "@/components/erp/Brand";
import { usePageMotion } from "@/components/erp/motion";
import { deriveNotifications, visibleCompanies } from "@/lib/erp/analytics";
import { COMPANY_NAV, NAV, navLabel, tr } from "@/lib/erp/i18n";
import { PERIOD_LABELS } from "@/lib/erp/period";
import { canView } from "@/lib/erp/rbac";
import { currentRole, ui, useERP } from "@/lib/erp/store";
import type { PeriodKey } from "@/lib/erp/types";
import { cn } from "@/lib/utils";

const PERIODS = Object.keys(PERIOD_LABELS) as PeriodKey[];

function moduleFor(pathname: string) {
  const sorted = [...NAV].sort((a, b) => b.to.length - a.to.length);
  return sorted.find((n) => pathname === n.to || pathname.startsWith(`${n.to}/`));
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const state = useERP();
  const role = currentRole(state);
  const { pathname } = useLocation();
  const lang = state.settings.lang;
  const inCompany = state.activeCompanyId !== "all";
  const items = NAV.filter(
    (n) => canView(role, n.id) && (!inCompany || COMPANY_NAV.includes(n.id)),
  );
  const company = state.companies.find((c) => c.id === state.activeCompanyId);
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5 p-3">
      {inCompany && company ? (
        <div className="mb-2 rounded-md border bg-muted/40 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {tr(lang, "workspace")}
          </p>
          <p className="mt-0.5 text-sm font-semibold">{company.name}</p>
          <button
            type="button"
            onClick={() => ui.setActiveCompany("all")}
            className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ChevronLeft className="size-3" /> {tr(lang, "backToGroup")}
          </button>
        </div>
      ) : null}
      {items.map((n) => {
        const active = n.to === "/app" ? pathname === "/app" : pathname.startsWith(n.to);
        return (
          <Link
            key={n.id}
            to={n.to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {navLabel(lang, n)}
          </Link>
        );
      })}
    </nav>
  );
}

function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const state = useERP();
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const text = q.trim().toLowerCase();
    if (text.length < 2) return [];
    const out: { label: string; kind: string; to: string; companyId?: string | undefined }[] = [];
    const visible = new Set(visibleCompanies(state).map((c) => c.id));
    for (const c of state.companies)
      if (visible.has(c.id) && c.name.toLowerCase().includes(text))
        out.push({ label: c.name, kind: "Company", to: "/app/companies", companyId: c.id });
    const lookups: [string, string, string[]][] = [
      ["tasks", "/app/tasks", ["title"]],
      ["documents", "/app/documents", ["title"]],
      ["employees", "/app/hr", ["name"]],
      ["projects", "/app/projects", ["name"]],
      ["assets", "/app/assets", ["name"]],
      ["land", "/app/land", ["name"]],
      ["ideas", "/app/planning", ["name"]],
    ];
    for (const [col, to, keys] of lookups) {
      const rows = state.collections[col as keyof typeof state.collections];
      for (const r of rows) {
        if (r.companyId && !visible.has(r.companyId)) continue;
        const label = String((r as Record<string, unknown>)[keys[0] ?? "name"] ?? "");
        if (label.toLowerCase().includes(text))
          out.push({ label, kind: col, to, companyId: r.companyId });
      }
    }
    return out.slice(0, 20);
  }, [q, state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Quick search</DialogTitle>
          <DialogDescription>
            Companies, tasks, documents, employees, projects, assets, land and ideas.
          </DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type at least 2 characters"
          aria-label="Search"
        />
        <ul className="max-h-72 divide-y overflow-y-auto">
          {results.map((r, i) => (
            <li key={`${r.kind}-${i}`}>
              <Link
                to={r.to}
                onClick={() => onOpenChange(false)}
                className="flex items-center justify-between gap-3 px-1 py-2 text-sm hover:bg-muted"
              >
                <span className="truncate">{r.label}</span>
                <span className="text-xs capitalize text-muted-foreground">{r.kind}</span>
              </Link>
            </li>
          ))}
          {q.trim().length >= 2 && results.length === 0 ? (
            <li className="py-4 text-center text-sm text-muted-foreground">No matches.</li>
          ) : null}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function UserSwitcher({ className }: { className?: string }) {
  const state = useERP();
  const user = state.collections.users.find((u) => u.id === state.currentUserId);
  return (
    <Select value={state.currentUserId} onValueChange={(v) => ui.setUser(v)}>
      <SelectTrigger
        className={cn("h-9 w-44", className)}
        aria-label="Signed-in user (demo role switcher)"
      >
        <SelectValue>{user ? String(user.name) : "User"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {state.collections.users.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {String(u.name)} · {String(u.role)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const state = useERP();
  const role = currentRole(state);
  const { pathname } = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  usePageMotion(mainRef, pathname);
  const [searchOpen, setSearchOpen] = useState(false);
  const lang = state.settings.lang;
  const visible = visibleCompanies(state);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", state.settings.theme === "dark");
    document.documentElement.lang = lang;
  }, [state.settings.theme, lang]);

  // Restricted users never browse the whole group.
  useEffect(() => {
    const ids = visible.map((c) => c.id);
    if (state.activeCompanyId !== "all" && !ids.includes(state.activeCompanyId))
      ui.setActiveCompany("all");
    if (
      visible.length === 1 &&
      visible[0] &&
      state.activeCompanyId === "all" &&
      role !== "Group Owner" &&
      role !== "Group Administrator"
    ) {
      ui.setActiveCompany(visible[0].id);
    }
  }, [visible, state.activeCompanyId, role]);

  const unread = useMemo(
    () =>
      deriveNotifications(state).filter(
        (n) =>
          !state.readNotifications.includes(n.id) &&
          (!n.companyId || visible.some((c) => c.id === n.companyId)),
      ).length,
    [state, visible],
  );

  const current = moduleFor(pathname);
  const allowed = !current || canView(role, current.id) || pathname.startsWith("/app/company/");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 overflow-y-auto border-r bg-card lg:block print:hidden">
        <Link to="/" className="flex h-16 items-center gap-2 border-b px-5">
          <BrandMark />
          <span className="min-w-0 text-sm font-semibold leading-tight">
            <span className="block truncate">{state.settings.brandName}</span>
            <span className="block truncate text-[11px] font-normal text-muted-foreground">
              {state.settings.brandTagline}
            </span>
          </span>
        </Link>
        <SidebarNav />
      </aside>

      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" className="w-72 overflow-y-auto p-0">
          <SheetHeader className="border-b p-4 text-left">
            <SheetTitle>{state.settings.brandName}</SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setMobileNav(false)} />
          <div className="border-t p-3">
            <p className="mb-1.5 text-xs text-muted-foreground">
              Signed in as (demo role switcher)
            </p>
            <UserSwitcher className="w-full" />
          </div>
        </SheetContent>
      </Sheet>

      <div className="lg:pl-64 print:pl-0">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-2 gap-y-2 border-b bg-background/95 px-3 py-2.5 backdrop-blur sm:px-4 print:hidden">
          <Button
            variant="outline"
            size="icon"
            className="size-9 lg:hidden"
            onClick={() => setMobileNav(true)}
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </Button>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold lg:hidden">
            {state.settings.brandName}
          </span>

          {/* Filters: full-width second row on small screens, inline on large ones. */}
          <div className="order-last grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center lg:order-none lg:w-auto">
            <div className="flex min-w-0 items-center gap-2">
              <Building2
                className="hidden size-4 shrink-0 text-muted-foreground sm:block"
                aria-hidden
              />
              <Select value={state.activeCompanyId} onValueChange={(v) => ui.setActiveCompany(v)}>
                <SelectTrigger className="h-9 w-full min-w-0 sm:w-48" aria-label="Company switcher">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visible.length > 1 ? (
                    <SelectItem value="all">{tr(lang, "allCompanies")}</SelectItem>
                  ) : null}
                  {visible.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <CalendarRange
                className="hidden size-4 shrink-0 text-muted-foreground sm:block"
                aria-hidden
              />
              <Select value={state.period} onValueChange={(v) => ui.setPeriod(v as PeriodKey)}>
                <SelectTrigger className="h-9 w-full min-w-0 sm:w-40" aria-label="Date range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PERIOD_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {state.period === "custom" ? (
              <div className="col-span-2 grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-1">
                <Input
                  type="date"
                  aria-label="From date"
                  className="h-9 sm:w-36"
                  value={state.customFrom}
                  onChange={(e) => ui.setCustomRange(e.target.value, state.customTo)}
                />
                <Input
                  type="date"
                  aria-label="To date"
                  className="h-9 sm:w-36"
                  value={state.customTo}
                  onChange={(e) => ui.setCustomRange(state.customFrom, e.target.value)}
                />
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5 lg:ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
            >
              <Search className="size-4" />
              <span className="hidden sm:inline">{tr(lang, "search")}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => ui.setSettings({ lang: lang === "en" ? "bn" : "en" })}
              aria-label="Switch language"
            >
              {lang === "en" ? "বাংলা" : "EN"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              onClick={() =>
                ui.setSettings({ theme: state.settings.theme === "dark" ? "light" : "dark" })
              }
              aria-label="Toggle dark mode"
            >
              {state.settings.theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
            <Button asChild variant="outline" size="icon" className="relative size-9">
              <Link to="/app/notifications" aria-label={`Notifications, ${unread} unread`}>
                <Bell className="size-4" />
                {unread > 0 ? (
                  <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                    {unread}
                  </span>
                ) : null}
              </Link>
            </Button>
            <div className="hidden lg:block">
              <UserSwitcher />
            </div>
          </div>
        </header>
        <main ref={mainRef} id="main" className="mx-auto w-full max-w-[1400px] p-4 sm:p-6">
          {allowed ? (
            children
          ) : (
            <div className="mx-auto mt-16 max-w-md text-center">
              <ShieldAlert className="mx-auto size-10 text-chart-2" aria-hidden />
              <h1 className="mt-3 text-xl font-semibold">Access restricted</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                The {role} role does not have access to this module. Ask the Group Owner to update
                your permissions.
              </p>
            </div>
          )}
        </main>
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <BrandEffects />
      <Toaster />
    </div>
  );
}
