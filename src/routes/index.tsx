import { useEffect, useRef } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  ArrowRight,
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

import { BrandEffects, BrandMark } from "@/components/erp/Brand";
import { Button } from "@/components/ui/button";
import { hydrate, useERP } from "@/lib/erp/store";

gsap.registerPlugin(useGSAP, ScrollTrigger);

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

const STEPS = [
  {
    title: "Add your companies",
    text: "Create each company profile, or plan a venture before it is registered.",
  },
  {
    title: "Assign accountability",
    text: "Give every company a responsible person who reports daily.",
  },
  {
    title: "Record and review",
    text: "Transactions post to each company's ledger; you review reports and approvals.",
  },
  {
    title: "Decide with confidence",
    text: "One dashboard, consolidated statements and grounded AI answers.",
  },
];

const STATS: { value: number; suffix: string; label: string }[] = [
  { value: 23, suffix: "", label: "Integrated modules" },
  { value: 50, suffix: "+", label: "Companies supported" },
  { value: 9, suffix: "", label: "Companies in the portfolio" },
  { value: 100, suffix: "%", label: "Figures from the ledger" },
];

const BARS = [38, 52, 46, 64, 58, 78, 90];

function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const { settings } = useERP();
  const headline = settings.heroTitle.split(" ").filter(Boolean);

  // Branding and landing text are edited in System Settings; load them for this public page too.
  useEffect(() => {
    hydrate();
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Respect the user's motion preference: with reduced motion the page is simply static.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Scroll progress bar.
        gsap.to("[data-progress]", {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
        });

        // Header gains a border and blur after scrolling.
        ScrollTrigger.create({
          start: 24,
          end: "max",
          toggleClass: { targets: "[data-header]", className: "is-scrolled" },
        });

        // Hero entrance timeline.
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from("[data-eyebrow]", { y: 16, autoAlpha: 0, duration: 0.6 })
          .from(
            "[data-word]",
            { yPercent: 110, autoAlpha: 0, duration: 0.8, stagger: 0.05 },
            "-=0.3",
          )
          .from("[data-hero-copy]", { y: 20, autoAlpha: 0, duration: 0.7 }, "-=0.4")
          .from(
            "[data-hero-cta] > *",
            { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.1 },
            "-=0.4",
          )
          .from("[data-preview]", { y: 60, autoAlpha: 0, scale: 0.96, duration: 1 }, "-=0.7")
          .from("[data-kpi]", { y: 14, autoAlpha: 0, duration: 0.5, stagger: 0.08 }, "-=0.5")
          .from(
            "[data-bar]",
            {
              scaleY: 0,
              transformOrigin: "bottom",
              duration: 0.8,
              stagger: 0.07,
              ease: "back.out(1.4)",
            },
            "-=0.6",
          );

        // Floating background glows.
        gsap.to("[data-blob='1']", {
          x: 60,
          y: 40,
          duration: 9,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        gsap.to("[data-blob='2']", {
          x: -50,
          y: -30,
          duration: 11,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });

        // Parallax: glows drift slower than the page.
        gsap.to("[data-parallax]", {
          yPercent: 25,
          ease: "none",
          scrollTrigger: {
            trigger: "[data-hero]",
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });

        // Count-up numbers when they scroll into view.
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
          const target = Number(el.dataset["count"] ?? 0);
          const suffix = el.dataset["suffix"] ?? "";
          const counter = { v: 0 };
          gsap.to(counter, {
            v: target,
            duration: 1.6,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
            onUpdate: () => {
              el.textContent = `${Math.round(counter.v)}${suffix}`;
            },
          });
        });

        // Company marquee (pauses on hover).
        const marquee = gsap.to("[data-marquee]", {
          xPercent: -50,
          duration: 40,
          ease: "none",
          repeat: -1,
        });
        const track = root.current?.querySelector("[data-marquee-wrap]");
        const pause = () => marquee.pause();
        const play = () => marquee.play();
        track?.addEventListener("mouseenter", pause);
        track?.addEventListener("mouseleave", play);

        // Section headings reveal on scroll; feature cards stagger in.
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          gsap.from(el, {
            y: 32,
            autoAlpha: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });
        ScrollTrigger.batch("[data-feature]", {
          start: "top 90%",
          once: true,
          onEnter: (batch) =>
            gsap.from(batch, {
              y: 40,
              autoAlpha: 0,
              duration: 0.7,
              stagger: 0.08,
              ease: "power3.out",
            }),
        });

        // Steps: the connecting line draws as you scroll, and each step slides in.
        gsap.from("[data-line]", {
          scaleY: 0,
          transformOrigin: "top",
          ease: "none",
          scrollTrigger: {
            trigger: "[data-steps]",
            start: "top 70%",
            end: "bottom 70%",
            scrub: true,
          },
        });
        gsap.utils.toArray<HTMLElement>("[data-step]").forEach((el) => {
          gsap.from(el, {
            x: -30,
            autoAlpha: 0,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          });
        });

        // Closing call to action.
        gsap.from("[data-cta]", {
          y: 50,
          autoAlpha: 0,
          scale: 0.97,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: "[data-cta]", start: "top 88%", once: true },
        });

        // Subtle pointer tilt on the dashboard preview (fine pointers only).
        const preview = root.current?.querySelector<HTMLElement>("[data-preview]");
        let cleanupTilt: (() => void) | undefined;
        if (preview && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          const rx = gsap.quickTo(preview, "rotationX", { duration: 0.6, ease: "power3.out" });
          const ry = gsap.quickTo(preview, "rotationY", { duration: 0.6, ease: "power3.out" });
          const move = (e: MouseEvent) => {
            const r = preview.getBoundingClientRect();
            ry(((e.clientX - r.left) / r.width - 0.5) * 8);
            rx(-((e.clientY - r.top) / r.height - 0.5) * 8);
          };
          const leave = () => {
            rx(0);
            ry(0);
          };
          preview.addEventListener("mousemove", move);
          preview.addEventListener("mouseleave", leave);
          cleanupTilt = () => {
            preview.removeEventListener("mousemove", move);
            preview.removeEventListener("mouseleave", leave);
          };
        }

        return () => {
          track?.removeEventListener("mouseenter", pause);
          track?.removeEventListener("mouseleave", play);
          cleanupTilt?.();
        };
      });

      return () => mm.revert();
    },
    { scope: root, dependencies: [settings.heroTitle], revertOnUpdate: true },
  );

  return (
    <div ref={root} className="min-h-screen overflow-x-clip bg-background text-foreground">
      <div
        data-progress
        className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left scale-x-0 bg-primary"
        aria-hidden
      />

      <header
        data-header
        className="sticky top-0 z-40 border-b border-transparent transition-colors [&.is-scrolled]:border-border [&.is-scrolled]:bg-background/80 [&.is-scrolled]:backdrop-blur"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <BrandMark />
            {settings.brandName}
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-1">
            <a
              href="#features"
              className="hidden px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Features
            </a>
            <a
              href="#how"
              className="hidden px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              How it works
            </a>
            <a
              href="#portfolio"
              className="hidden px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Portfolio
            </a>
            <Button asChild size="sm" className="ml-2">
              <Link to="/app">Open portal</Link>
            </Button>
          </nav>
        </div>
      </header>

      <BrandEffects />
      <main>
        {/* Hero */}
        <section data-hero className="relative isolate">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div data-parallax className="absolute inset-0">
              <div
                data-blob="1"
                className="absolute -left-24 top-0 size-[28rem] rounded-full bg-primary/20 blur-3xl"
              />
              <div
                data-blob="2"
                className="absolute -right-24 top-40 size-[26rem] rounded-full bg-chart-2/20 blur-3xl"
              />
            </div>
            <div
              className="absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
              style={{
                backgroundImage:
                  "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
                backgroundSize: "44px 44px",
              }}
            />
          </div>

          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-12 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <p
                data-eyebrow
                className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur"
              >
                <BadgeCheck className="size-3.5 text-primary" aria-hidden /> One owner · one portal
                · multiple companies
              </p>
              <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                {headline.map((w, i) => (
                  <span
                    key={i}
                    className="mr-[0.25em] inline-block overflow-hidden pb-1 align-bottom"
                  >
                    <span data-word className="inline-block">
                      {w}
                    </span>
                  </span>
                ))}
              </h1>
              <p data-hero-copy className="mt-6 max-w-xl text-lg text-muted-foreground">
                {settings.heroText}
              </p>
              <div data-hero-cta className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="group w-full sm:w-auto">
                  <Link to="/app">
                    Open the portal{" "}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <a href="#features">See what it manages</a>
                </Button>
              </div>
            </div>

            {/* Dashboard preview */}
            <div className="[perspective:1200px]">
              <div
                data-preview
                className="rounded-2xl border bg-card p-4 shadow-2xl shadow-primary/10 [transform-style:preserve-3d] sm:p-5"
                role="img"
                aria-label="Preview of the master dashboard showing group revenue, profit and a monthly chart"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5" aria-hidden>
                    <span className="size-2.5 rounded-full bg-destructive/70" />
                    <span className="size-2.5 rounded-full bg-chart-2" />
                    <span className="size-2.5 rounded-full bg-primary/70" />
                  </div>
                  <span className="text-xs text-muted-foreground">Master Dashboard</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    ["Revenue", "৳1.93Cr", "text-foreground"],
                    ["Net profit", "৳1.20Cr", "text-primary"],
                    ["Cash & bank", "৳20.4Cr", "text-foreground"],
                  ].map(([l, v, c]) => (
                    <div key={l} data-kpi className="rounded-lg border bg-background p-3">
                      <p className="text-[11px] text-muted-foreground">{l}</p>
                      <p className={`mt-1 font-mono text-base font-semibold tabular-nums ${c}`}>
                        {v}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-lg border bg-background p-3">
                  <p className="mb-3 text-[11px] text-muted-foreground">
                    Group profit, last 7 months
                  </p>
                  <div className="flex h-36 items-end gap-2" aria-hidden>
                    {BARS.map((h, i) => (
                      <div
                        key={i}
                        data-bar
                        className="flex-1 rounded-t bg-primary/80"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
                <ul className="mt-3 grid grid-cols-2 gap-2 text-[11px]" aria-hidden>
                  {[
                    ["bBike Ltd.", "Submitted"],
                    ["Nogor Bangla", "Delayed"],
                  ].map(([n, s]) => (
                    <li
                      key={n}
                      className="flex items-center justify-between rounded-md border bg-background px-2.5 py-1.5"
                    >
                      <span>{n}</span>
                      <span className={s === "Delayed" ? "text-destructive" : "text-primary"}>
                        {s}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section aria-label="Key figures" className="border-y bg-card/50">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <dd className="text-4xl font-semibold tabular-nums tracking-tight">
                  <span data-count={s.value} data-suffix={s.suffix}>
                    {s.value}
                    {s.suffix}
                  </span>
                </dd>
                <dt className="mt-1 text-sm text-muted-foreground">{s.label}</dt>
              </div>
            ))}
          </dl>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div data-reveal className="max-w-2xl">
            <p className="text-sm font-medium text-primary">What it manages</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything the group needs, in one system
            </h2>
            <p className="mt-3 text-muted-foreground">
              Built as an enterprise operating system rather than a simple accounting app.
            </p>
          </div>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                data-feature
                className="group relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <span
                  className="absolute -right-6 -top-6 size-24 rounded-full bg-primary/5 transition-transform duration-500 group-hover:scale-150"
                  aria-hidden
                />
                <span className="relative grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="size-5" aria-hidden />
                </span>
                <h3 className="relative mt-4 font-semibold">{f.title}</h3>
                <p className="relative mt-1.5 text-sm text-muted-foreground">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* How it works */}
        <section id="how" className="border-y bg-muted/30">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div data-reveal>
              <p className="text-sm font-medium text-primary">How it works</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                From scattered offices to one clear picture
              </h2>
              <p className="mt-3 text-muted-foreground">
                Each company stays independent. You see everything you are authorised to, from one
                login.
              </p>
            </div>
            <ol data-steps className="relative space-y-8 pl-10">
              <span aria-hidden className="absolute bottom-2 left-[15px] top-2 w-px bg-border" />
              <span
                data-line
                aria-hidden
                className="absolute bottom-2 left-[15px] top-2 w-px bg-primary"
              />
              {STEPS.map((s, i) => (
                <li key={s.title} data-step className="relative">
                  <span className="absolute -left-10 grid size-8 place-items-center rounded-full border bg-background text-sm font-semibold text-primary">
                    {i + 1}
                  </span>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Portfolio marquee */}
        <section id="portfolio" className="py-20">
          <div data-reveal className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex items-center gap-2 text-primary">
              <Building2 className="size-5" aria-hidden />
              <span className="text-sm font-medium">Initial portfolio</span>
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Nine companies and ventures, ready on day one
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Add unlimited companies and planned ventures at any time, with no developer needed.
            </p>
          </div>
          <div
            data-marquee-wrap
            className="mt-10 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]"
          >
            <ul data-marquee className="flex w-max gap-3" aria-label="Companies in the portfolio">
              {[...COMPANIES, ...COMPANIES].map((c, i) => (
                <li
                  key={`${c}-${i}`}
                  aria-hidden={i >= COMPANIES.length}
                  className="whitespace-nowrap rounded-full border bg-card px-5 py-2.5 text-sm shadow-sm"
                >
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div
            data-cta
            className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-primary-foreground sm:px-12"
          >
            <div
              aria-hidden
              className="absolute -right-16 -top-16 size-64 rounded-full bg-primary-foreground/10 blur-2xl"
            />
            <div
              aria-hidden
              className="absolute -bottom-20 left-1/3 size-72 rounded-full bg-chart-2/20 blur-3xl"
            />
            <h2 className="relative max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Centralized visibility. Complete financial control.
            </h2>
            <p className="relative mt-3 max-w-xl opacity-90">
              Every company stays independent; the owner sees everything that is authorised, from
              one login.
            </p>
            <Button asChild variant="secondary" size="lg" className="relative mt-8">
              <Link to="/app">
                Open the portal <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <span>
            © {new Date().getFullYear()} {settings.brandName}
          </span>
          <span>ONE OWNER · ONE CENTRAL PORTAL · MULTIPLE COMPANIES</span>
        </div>
      </footer>
    </div>
  );
}
