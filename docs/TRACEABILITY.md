# Requirements Traceability

Status key: ✅ implemented and tested · 🟡 partly implemented (gap stated) · ⛔ needs the backend (see [ARCHITECTURE.md](ARCHITECTURE.md)).

"Implemented" means working in the browser against demo data; persistence is local to the browser until the backend is connected.

| SRS § | Requirement | Where | Status | Notes |
|---|---|---|---|---|
| 2 | Company portfolio, 9 initial companies, statuses, full profile, add without developer | `/app/companies`, `CompanyForm` | ✅ | Logo, directors and shareholders are not separate fields; shareholders live in Investments. |
| 3 | Master dashboard (20 components) and filters | `/app` + top bar | ✅ | All figures computed from the ledger via `summarize`. |
| 4 | Daily reporting A–E, review workflow, missing-report view | `/app/daily` | 🟡 | Evidence is recorded as file names/notes; real uploads and voice notes need storage. |
| 5 | Double-entry, immutable ledger, reversal, statements (9), cash, multiple banks, intercompany + elimination | `/app/finance`, `accounting.ts` | ✅ | Reconciliation compares ledger to a typed statement balance (no bank-feed import). |
| 6 | Asset register, SL/WDV/custom depreciation, auto-posting, book value | `/app/assets`, `depreciation.ts` | 🟡 | BDT 50,00,000 example verified (4,50,000 / 37,500). Transfer, disposal, revaluation and impairment are status values only, without ledger postings. Automatic *scheduled* posting needs a job; today it is the "Post depreciation" action. |
| 7 | Employees, org chart, payroll, group payroll dashboard | `/app/hr` | 🟡 | Photo, contract documents and salary history are not stored. Payroll posts gross expense, net bank payment and withheld tax. |
| 8 | Responsibilities, KPIs, performance score and reports | `/app/management` | ✅ | |
| 9 | Document register, categories, expiry alerts, versions | `/app/documents` | 🟡 | Metadata only; upload, preview and download history need object storage. |
| 10 | Land profile (JL/khatian/dag…), property, profitability | `/app/land` | 🟡 | GPS is text; map and photographs need storage/map service. |
| 11 | Projects, cost tracking, budget vs actual, ROI | `/app/projects` | ✅ | |
| 12 | Investments, shareholding, dividends, ROI | `/app/investments` | 🟡 | Share certificates and transfer history are not modelled. Valuation is kept separate from share data as required. |
| 13 | Venture ideas, 14-stage tracker | `/app/planning` | ✅ | |
| 14 | Break-even formulas, ROI, payback, scenarios, simulation | `/app/breakeven`, `breakeven.ts` | ✅ | |
| 15 | Tasks and statuses | `/app/tasks` | ✅ | |
| 16 | Approvals with owner-set limits and multi-level workflow | `/app/approvals`, Settings | ✅ | Approved records are locked. |
| 17 | Daily–yearly reports, consolidated report, PDF/Excel/CSV | `/app/reports`, `export.ts` | 🟡 | PDF uses the browser's print dialog. Reports are generated on demand, not emailed on a schedule. |
| 18 | AI CFO: grounded answers, period and sources, no fabrication, no execution | `/app/ai`, `ai.ts` | 🟡 | Deterministic analyst covering the seven example questions plus forecast, anomalies and risks. Free-form LLM answers need a server function. |
| 19 | Notifications (12 types), in-app and email | `/app/notifications`, Settings | 🟡 | In-app live; email preferences are saved but delivery needs a mailer. |
| 20 | Roles, company assignment, unique login, 2FA, login history | `/app/users`, `rbac.ts` | 🟡 | Permission matrix and company scoping enforced in the UI and store. Real authentication, 2FA, password reset and login history are ⛔. The top-bar user switcher is a demo stand-in for sign-in. |
| 21 | Personal owner profile, separate from company books | `/app/personal` | ✅ | Stored in a separate collection; never posts to a ledger. |
| 30 | Owner Central Financial Register: scopes, loans, cards, payables/receivables, central reports | `/app/register`, `register.ts` | ✅ | Owner-only. Memorandum register, deliberately not posted to company ledgers. |
| 30 | Due-date alerts (7 d, 3 d, due day, overdue) | `deriveNotifications` | 🟡 | In-app live; email delivery needs the mailer. |
| 30 | Party statement | Register → Party statement | ✅ | |
| 30 | AI financial assistant (draft → approve) | `assistant.ts` | 🟡 | Rule-based Bangla/English parser; matches accounts by name and the “Also known as” field. Needs a server-side LLM for free-form sentences. |
| 22 | Group treasury | `/app/treasury` | ✅ | |
| 23 | Independent / holding structures; legal vs reporting parent | `CompanyForm` | 🟡 | Both relationships are stored independently; consolidation currently treats the whole selected scope as one group. |
| 24 | RBAC, audit log, no deletion of approved records, backup/export | Store, Settings | 🟡 | Audit log, reversal-only ledger, locked approvals, JSON backup/restore ✅. MFA, session management, encryption at rest, automated DB backups, DR ⛔. |
| 25 | UI/UX: 22-item sidebar, company workspace, switcher, filters, dark mode, Bangla/English, responsive | `AppShell` | 🟡 | Sidebar labels and common controls are bilingual; page bodies are English. |
| 26 | Multi-tenant architecture, RLS, API, jobs, HA | — | ⛔ | See ARCHITECTURE.md. |

## Acceptance criteria (§28)

| # | Criterion | Status |
|---|---|---|
| 1 | One login manages all companies | ✅ (demo) |
| 2 | Add a company without a developer | ✅ |
| 3 | Separate dashboard and ledger per company | ✅ |
| 4 | Responsible person per company | ✅ (Management Team, Users) |
| 5–6 | Daily reports submitted and reviewed centrally | ✅ |
| 7 | Transactions recorded accurately (balanced, validated) | ✅ tested |
| 8 | Group-wide reports | ✅ |
| 9 | Automatic depreciation | ✅ on demand · ⛔ scheduled |
| 10 | Payroll company- and group-wise | ✅ |
| 11 | Documents and land records | 🟡 metadata; files ⛔ |
| 12 | Investment and shareholder records | 🟡 |
| 13 | Idea → profitability tracking | ✅ |
| 14 | Break-even and ROI | ✅ |
| 15 | Daily/weekly/monthly/yearly review | ✅ |
| 16 | Audit trail | ✅ |
| 17 | Unauthorised users cannot access other companies | 🟡 UI/store enforced; ⛔ database enforcement |
| 18 | Desktop and mobile | ✅ responsive (PWA ⛔) |
| 19 | Backup and recovery tested | 🟡 JSON export/restore; ⛔ automated DB backups |
| 20 | Reports reconcile with the ledger | ✅ tested (balance sheet balances; every seeded entry balances) |
