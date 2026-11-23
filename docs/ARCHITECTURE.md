# Architecture

## Current implementation

The app is a **TanStack Start + React 19 + TypeScript (strict) + Tailwind v4 + shadcn/ui** project, deployed through Lovable.

```
src/
  routes/                 File-based routes (TanStack Router)
    index.tsx             Public landing page
    app.tsx               Portal layout (loads workspace, renders AppShell)
    app.*.tsx             One file per sidebar module (22) + company workspace
  components/erp/         AppShell, DataModule (generic register CRUD), CompanyForm, kit (UI primitives)
  components/ui/          shadcn/ui primitives (unchanged)
  lib/erp/                Domain logic — framework-free and unit tested
    types.ts              Domain types, roles, register field keys
    accounting.ts         Chart of accounts, double-entry validation, statements, consolidation
    ledger-ops.ts         Idempotent postings: depreciation, payroll, asset purchase
    depreciation.ts       Straight-line, written-down-value, custom schedules
    breakeven.ts          Break-even, ROI, payback, scenarios
    payroll.ts            Gross/net salary
    analytics.ts          Summaries, derived notifications, anomaly detection
    ai.ts                 Rule-based AI CFO (grounded answers with period + sources)
    rbac.ts               Role × module permission matrix, company access
    period.ts, format.ts, export.ts, i18n.ts
    store.ts              Observable store + all mutations (audit-logged, permission-guarded)
    seed.ts, seed-operations.ts   Demo workspace
  test/                   Vitest: domain logic + every page renders
docs/                     SRS, this file, traceability
```

### Key design decisions

| Decision | Reason |
|---|---|
| **Ledger is the single source of truth.** Dashboards and statements are computed from journal entries; nothing stores a duplicated total. | SRS §3, §5: figures must come from recorded transactions. |
| **Posted entries are immutable.** The store exposes `post` and `reverse` only; there is no edit or delete for journal entries. Reversal creates a mirrored entry and flags the original. | SRS §5, §24. |
| **Idempotent postings** keyed by `source` (`dep:<asset>:<month>`, `payroll:<company>:<month>`, `asset:<id>`). | Re-running depreciation or payroll can never double-post. |
| **Intercompany accounts** (1300, 2300, 4900, 5900) are eliminated by `consolidated: true`. | SRS §5 consolidation. |
| **Every record carries `companyId`**; `visibleCompanies` / `scoped` filter by the signed-in user's assignment. | SRS §20, §26 tenant isolation. |
| **AI is deterministic and read-only.** Each answer returns `answer`, `period`, `sources`; unsupported questions are refused. | SRS §18: never fabricate, never execute. |
| Workspace is loaded after mount (`app.tsx`) | State is browser-local; keeps SSR and client markup identical. |

### Accounting model

Chart of accounts: assets 1xxx (cash 1100, banks 1200/1210/1220, intercompany receivable 1300, receivables 1400, fixed assets 1500, accumulated depreciation 1590), liabilities 2xxx, equity 3100, income 4xxx, expenses 5xxx (depreciation 5800). Every entry must have ≥2 lines, one-sided lines, equal debits and credits. `balanceSheet` adds cumulative profit as retained earnings, so Assets = Liabilities + Equity holds by construction (asserted in tests).

## What is NOT production-ready (requires a backend)

This build keeps data in the browser (`localStorage`) so the whole product can be exercised end to end. The following are **deliberately not simulated** and must be implemented server-side before real use:

| Area | Requirement | Suggested approach |
|---|---|---|
| Authentication | Real accounts, password hashing, **two-factor**, session management, login history | Lovable Cloud / Supabase Auth with TOTP MFA |
| Tenant isolation | Enforce company access in the **database**, not the UI | PostgreSQL **row-level security** policies on `company_id`, using a `user_company_roles` table mirroring `rbac.ts` |
| Persistence | Multi-user shared data, concurrent edits | Tables mirroring `types.ts`; journal table insert-only (no UPDATE/DELETE grants, reversal via new rows) |
| Files | Bills, receipts, photos, deeds, voice notes, versioned documents, download history | Private object storage buckets with signed URLs |
| Email | Alert delivery per Settings | Server mailer / scheduled job |
| Scheduled jobs | Monthly depreciation and payroll posting, auto weekly/monthly reports, missing-report alerts | Cron / background worker calling the same posting functions |
| Backups & DR | Automated backups, tested restore, high availability | Managed Postgres PITR; periodic restore drill |
| LLM AI | Natural-language beyond the supported intents | Server-side function that queries scoped data and calls the AI gateway; keep `LOVABLE_API_KEY` out of browser code |
| PWA / mobile | Installable app, later Flutter client | Web manifest + service worker; reuse the API |

> Database migrations are managed by Lovable in this project (see `AGENTS.md`): ask Lovable to create the schema rather than adding migration files by hand.

### Suggested table map (for the Lovable schema request)

`companies`, `company_relationships (legal_parent_id, reporting_parent_id)`, `profiles`, `user_company_roles`, `journal_entries`, `journal_lines`, `daily_reports`, `assets`, `employees`, `payroll_runs`, `documents`, `land_records`, `projects`, `investments`, `ventures`, `tasks`, `approvals`, `approval_steps`, `audit_log`, `settings`. Every business table has `company_id` and is protected by RLS.

## Responsive design standards

Verified in headless Edge at 320, 360, 768, 1024 and 1280 px across all 24 routes, plus the mobile menu, dropdowns, search and form dialogs.

| Rule | Implementation |
|---|---|
| Mobile first, breakpoints `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 | Tailwind defaults |
| No horizontal page scroll at any width | Grid children use `min-w-0`; wide tables sit in `overflow-x-auto` wrappers; scroll containers are `position: relative` so hidden text cannot widen the page (`styles.css`) |
| Navigation | Fixed sidebar from `lg`; slide-in drawer below, including the user switcher |
| Header | Row 1: menu, brand, actions. Row 2 (below `lg`): company and date filters in two columns |
| Forms and dialogs | Single column on phones, two from `sm`; header and buttons stay fixed while fields scroll; max height 90vh |
| Tabs and long controls | Tab lists scroll horizontally instead of wrapping; manual journal lines stack |
| Numbers | Tile values use a smaller size on phones and never push the layout wider |
| Motion | GSAP animations respect `prefers-reduced-motion` |

## Quality gates

```sh
npm run lint     # ESLint + Prettier (0 errors)
npx tsc --noEmit # strict TypeScript, incl. noUncheckedIndexedAccess and exactOptionalPropertyTypes
npm test         # Vitest: domain rules + every page renders with seeded data
npm run build    # production build
```

> **Windows note:** run `npm test` from PowerShell, cmd or the VS Code terminal. Under Git Bash the drive letter is resolved as both `E:` and `e:`, which loads duplicate module copies and makes Vitest fail with `Cannot read properties of undefined (reading 'config')`.
