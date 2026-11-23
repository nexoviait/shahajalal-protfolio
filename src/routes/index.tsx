import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheck,
  BarChart3,
  Building2,
  ClipboardCheck,
  FileLock2,
  Landmark,
  LayoutDashboard,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "b Group | Centralized Business Management" },
      {
        name: "description",
        content:
          "One portal to manage every company in the group: daily reports, double-entry accounting, assets, payroll, land, investments, approvals and AI insights.",
      },
      { property: "og:title", content: "b Group" },
      {
        property: "og:description",
        content: "Monitor, analyse and control multiple companies from one central dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: LayoutDashboard,
    title: "Master dashboard",
    text: "Revenue, expenses, profit, cash, payroll, approvals and risks for the whole group, filtered by any period or company.",
  },
  {
    icon: ClipboardCheck,
    title: "Daily reporting",
    text: "A responsible person per company reports every day. See who has and has not submitted, then review, comment or approve.",
  },
  {
    icon: Wallet,
    title: "Double-entry accounting",
    text: "Independent ledgers, bank and cash, intercompany loans and consolidated statements with internal transactions eliminated.",
  },
  {
    icon: Landmark,
    title: "Assets & land",
    text: "Asset registers with automatic depreciation posted to the ledger, plus land and property profiles with survey references.",
  },
  {
    icon: Users,
    title: "People & payroll",
    text: "Employee records, organization charts, payroll runs and management performance scores for every company.",
  },
  {
    icon: BarChart3,
    title: "Planning & break-even",
    text: "Take an idea from concept to profit with a 14-stage tracker, break-even, ROI, payback and best/base/worst scenarios.",
  },
  {
    icon: Sparkles,
    title: "AI business intelligence",
    text: "Ask questions in plain language. Answers come only from recorded data, with the period and sources shown.",
  },
  {
    icon: FileLock2,
    title: "Control & audit",
    text: "Role-based access, multi-level approvals, reversal-only corrections and a complete audit trail.",
  },
];

const COMPANIES = [
  "bBike Ltd.",
  "Bag E Rahmat Holdings Ltd.",
  "Best Health Diagnostic Limited",
  "Nexovia IT",
  "Nogor Bangla",
  "bAgro",
  "bBlock",
  "Solar Business",
  "AI Hub Bangladesh",
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            b
          </span>
          b Group
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-2">
          <a
            href="#features"
            className="hidden px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:inline"
          >
            Features
          </a>
          <a
            href="#portfolio"
            className="hidden px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:inline"
          >
            Portfolio
          </a>
          <Button asChild size="sm">
            <Link to="/app">Open portal</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-20">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <BadgeCheck className="size-3.5 text-primary" aria-hidden /> One owner · one portal ·
            multiple companies
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Run a portfolio of companies without being in every office.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            b Group gives the Group Owner a single dashboard over every company: daily operations,
            finances, assets, people, land, investments and new ventures, with individual
            accountability and complete financial control.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/app">Open the portal</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#features">See what it manages</a>
            </Button>
          </div>
          <dl className="mt-12 grid max-w-3xl grid-cols-2 gap-6 border-t pt-8 sm:grid-cols-4">
            {[
              ["22", "modules"],
              ["50+", "companies supported"],
              ["BDT", "multi-currency ready"],
              ["EN · বাংলা", "languages"],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="text-xs text-muted-foreground">{l}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="features" className="border-y bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight">
              Everything the group needs, in one system
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Built as an enterprise operating system rather than a simple accounting app.
            </p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <li key={f.title} className="rounded-lg border bg-card p-5 shadow-sm">
                  <f.icon className="size-5 text-primary" aria-hidden />
                  <h3 className="mt-3 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="portfolio" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" aria-hidden />
            <h2 className="text-2xl font-semibold tracking-tight">Initial company portfolio</h2>
          </div>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Add unlimited companies and planned ventures at any time, with no developer needed.
          </p>
          <ul className="mt-8 flex flex-wrap gap-2">
            {COMPANIES.map((c) => (
              <li key={c} className="rounded-full border bg-card px-4 py-1.5 text-sm">
                {c}
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="rounded-xl bg-primary px-6 py-10 text-primary-foreground sm:px-10">
            <h2 className="text-2xl font-semibold">
              Centralized visibility. Complete financial control.
            </h2>
            <p className="mt-2 max-w-2xl opacity-90">
              Every company stays independent; the owner sees everything that is authorised, from
              one login.
            </p>
            <Button asChild variant="secondary" size="lg" className="mt-6">
              <Link to="/app">Open the portal</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <span>© {new Date().getFullYear()} b Group</span>
          <span>ONE OWNER · ONE CENTRAL PORTAL · MULTIPLE COMPANIES</span>
        </div>
      </footer>
    </div>
  );
}
