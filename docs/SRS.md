# b Group — Software Requirements Specification

| | |
|---|---|
| **Document type** | Software Requirements Specification (SRS) |
| **Product** | b Group — Centralized Business Management & Enterprise Operating System |
| **Platform** | Web application, mobile-responsive portal |
| **Primary owner** | Group Owner / Managing Director |
| **Currency** | BDT primary, multi-currency supported |
| **Capacity** | 10–50+ companies |
| **Reporting** | Daily, weekly, monthly, quarterly, yearly |
| **Status of this file** | Requirements baseline. Delivery status per requirement is in [TRACEABILITY.md](TRACEABILITY.md). |

> **Core philosophy:** ONE OWNER · ONE CENTRAL PORTAL · MULTIPLE COMPANIES · INDIVIDUAL ACCOUNTABILITY · CENTRALIZED VISIBILITY · COMPLETE FINANCIAL CONTROL · AI-POWERED MANAGEMENT

---

## 1. Overview

A centralized platform to manage, monitor, analyse and control multiple independent companies and future ventures from one master portal. It supports independent companies and optional parent/holding structures. Each company operates independently; the Group Owner sees all authorised information from one dashboard.

It is an enterprise operating system, **not** a simple accounting application. The architecture must scale to 50+ companies without redesign.

## 2. Company Portfolio Management

Unlimited companies and ventures can be added by the owner at any time without developer help.

**Initial portfolio:** bBike Ltd.; Bag E Rahmat Holdings Ltd.; Best Health Diagnostic Limited; Nexovia IT; Nogor Bangla; bAgro; bBlock (planned); Solar Business (planned); AI Hub Bangladesh (planned).

**Statuses:** Active · Under Development · Planned · Investment Stage · Temporarily Inactive · Closed.

**Company profile:** name, logo, registration number, trade license, TIN, BIN, incorporation date, registered address, business category, website, contact; directors, shareholders, managing director, administrator, department heads; vision, mission, objectives, business model, current status; initial investment, total investment, current valuation; revenue, expenses, net profit/loss, assets, liabilities, employees; current projects; break-even status.

## 3. Master Owner Dashboard

The single most important module. Components: number of companies (total/active/planned); group investment, revenue, expenses, net profit, liabilities, assets, cash and bank; employee count and monthly payroll; company-wise profitability and expense comparison; investment performance; upcoming payments; pending approvals; overdue tasks; daily reporting status; business risk notifications.

**Filters:** today, yesterday, this week, this month, last month, quarterly, yearly, custom range, individual company, all companies.

**Rule:** every figure is calculated from authorised, recorded transactions — never manually duplicated totals.

## 4. Daily Company Reporting

Each company has a Daily Operations Reporting module because the owner may not be physically present.

**Responsibility structure:** company owner/representative, director, responsible business operator, administrator, finance & accounts officer, department managers, employees. The owner creates the logins.

**Daily form**
- **A. Business activities** — what happened, work completed, ongoing activities, problems, decisions, items needing approval.
- **B. Financial** — revenue, cash received, bank received, expenses, outstanding payments, customer receivables, supplier payables, cash balance.
- **C. Operational** — customers, sales, orders received/completed, project progress, attendance, issues.
- **D. Management** — achievements, challenges, tomorrow's plan, pending decisions, required investment, owner's attention.
- **E. Evidence** — bills, receipts, photographs, documents, notes, voice notes.

**Workflow:** login → select company → complete form → add financials and evidence → submit → owner notified automatically → owner reviews, comments, approves or requests correction → stored permanently in the company's Daily Log. The owner sees which companies have and have not submitted.

## 5. Finance & Accounting

Every company has a fully independent accounting system; the owner also has consolidated group reports.

- **Income:** daily sales, service, product, project, rental, investment, other.
- **Expense:** rent, salaries, utilities, marketing, transport, maintenance, equipment, raw materials, construction, administrative, tax & VAT, other.
- **Cash:** cash in hand, received, paid, petty cash, transfers.
- **Bank:** multiple accounts, deposits, withdrawals, transfers, reconciliation, account-wise balance.
- **Statements:** profit & loss, balance sheet, cash flow, trial balance, general ledger, receivables, payables, expense report, income report.

**Accounting rules**
1. Proper double-entry; every approved transaction produces matching debit and credit entries.
2. Posted entries are never silently edited or deleted; corrections use authorised reversal or adjustment entries with a full audit trail.
3. All financial reports are generated from the ledger.

**Intercompany:** loans between companies, services, asset transfers, shared expenses, intercompany receivables and payables. Group consolidated reports **eliminate** internal transactions to avoid double-counting.

## 6. Asset & Depreciation Management

Separate asset register per company. **Categories:** land, buildings, office/medical/diagnostic/laboratory equipment, computers, vehicles, furniture, machinery, software, other.

**Asset profile:** name, ID, company, department, purchase date and price, supplier, invoice, installation cost, useful life, depreciation method and rate, salvage value, accumulated depreciation, book value, maintenance history, warranty, insurance, location, responsible person.

**Methods:** straight-line, written-down-value, custom schedule. Monthly and yearly depreciation is calculated automatically, recorded in the ledger and updates book value. Also: transfers, disposal, revaluation, impairment, maintenance records.

**Worked example (acceptance data):** diagnostic machine BDT 50,00,000, life 10 years, salvage BDT 5,00,000, straight-line → annual BDT 4,50,000, monthly BDT 37,500.

## 7. HR & Payroll

Per-company employee database (name, ID, photo, designation, department, joining date, salary, contact, address, emergency contact, status, reporting manager, contract documents, salary history) and a visual organization chart.

**Payroll:** basic, allowances, bonuses, overtime, deductions, loans and advances, tax deductions, net salary, payment date, bank transfer record, reports.

**Group payroll dashboard:** total and company-wise employees, company-wise and total monthly payroll, annual payroll, department-wise payroll, salary outstanding, upcoming payroll.

## 8. Management Team & Responsibility

The owner assigns responsibilities with: name, designation, company, department, description, reporting manager, monthly target, KPI, assigned tasks, reporting frequency. Tracked: daily report submission, task completion, target achievement, financial and operational performance, delayed tasks, performance score. An individual performance report exists for every operator and manager.

## 9. Document Management

Separate document system per company. **Categories:** registration, trade license, TIN, BIN, VAT, bank, director, shareholder, contracts, agreements, legal, licenses, government approvals, medical licenses, insurance, land, construction, employee, tax returns, audit reports, meeting minutes.

**Features:** PDF/image/Word/Excel upload, preview, search, category, tags, issue and expiry dates, renewal reminders, versioning, access permissions, download history. The owner is notified before important documents expire.

## 10. Land & Property Management

Dedicated module (especially for Bag E Rahmat Holdings Ltd.). **Land profile:** ID, company, district, upazila, mouza, JL, khatian, dag, area, ownership, purchase price, registration cost, mutation status, valuation, legal status, photograph, location map, GPS. **Documents:** deed, khatian, mutation, DCR, tax receipts, survey, agreements, power of attorney, legal records. **Property:** building projects, commercial/residential/rental properties, valuation, rental income, maintenance, construction cost, project profitability.

## 11. Project Management

Multiple projects per company. **Profile:** name, company, manager, start, expected completion, budget, actual cost, investment, revenue target, expected profit, progress, status, documents, team. **Cost tracking:** land, construction, materials, labor, equipment, consultants, registration, marketing, other. **Dashboard:** budget vs actual, remaining budget, progress, outstanding payments, expected revenue, estimated profit, ROI, delayed activities.

## 12. Investment & Shareholders

**Investment profile:** investor, amount, date, company, share percentage/quantity/price, purpose, payment details, agreement, expected and actual return. **Shareholders:** database, allocation, certificates, transfer history, capital contributions, dividends, percentages, investor statements. **Dashboard:** total, investor-wise and company-wise investment, capital utilisation, ROI, pending capital, dividend payable.

> Share allocation, ownership and company valuation are **separate concepts**.

## 13. Business Planning & New Ventures

An idea can be added before it is registered. **Idea profile:** name, category, concept, vision, mission, target market, customer profile, competitors, business and revenue model, required investment/manpower/assets, location, legal requirements, startup cost, expected monthly revenue/expenses/net profit, expected break-even date, risks.

**Stages:** 1 Business Idea · 2 Market Research · 3 Feasibility Study · 4 Business Plan · 5 Investment Approval · 6 Legal Registration · 7 Infrastructure Development · 8 Team Recruitment · 9 Business Launch · 10 Initial Operations · 11 Revenue Generation · 12 Break-even · 13 Profitability · 14 Expansion. Each venture has a timeline and milestone tracker.

## 14. Break-even & Profitability

**Inputs:** initial investment, fixed monthly costs, variable cost per unit, selling price per unit, expected sales volume, monthly revenue, operating expenses.

```
Contribution per unit = Selling price − Variable cost per unit
Break-even quantity   = Fixed costs ÷ Contribution per unit
Break-even revenue    = Fixed costs ÷ Contribution margin ratio
```

**Reports:** monthly and annual break-even, actual vs projected, remaining amount, estimated date, profit margin, ROI, payback period, best/base/worst scenarios. The owner can change assumptions and simulate.

## 15. Tasks & Workflow

Create, assign (company, department, person), priority, deadline, description, files, progress, comments, complete, request approval. **Statuses:** Not Started, In Progress, Under Review, Pending Approval, Completed, Delayed, Cancelled. The owner monitors all companies from one dashboard.

## 16. Approvals & Decisions

Owner-configurable limits for expense, purchase, salary, asset purchase, project budget, investment, contract and bank payment approvals. Each approval records requested by, company, date, amount, reason, documents, status, approved by, approval date, remarks. **Multi-level workflows** are supported.

## 17. Reporting

Daily (operations, income, expenses, cash flow, task performance), weekly (revenue, expenses, profit/loss, operations, employee performance, pending tasks), monthly (P&L, balance sheet, cash flow, payroll, expense analysis, sales, depreciation, project progress, break-even) and a **group consolidated report**. Export to **PDF, Excel and CSV**.

## 18. AI Business Intelligence & AI CFO

Analyses data already in the system: daily summary, weekly group summary, monthly analysis, expense anomaly detection, revenue trends, cash-flow and profitability forecasting, break-even prediction, risk identification, investment scenarios, budget recommendations, management performance analysis, pending-task summary.

**Example questions:** which company spent the most this month; which generates the highest profit; payroll needed next month; additional investment Best Health Diagnostic requires; when Bag E Rahmat Holdings reaches break-even; which company has not submitted today's report; compare this month's revenue with last month.

**Rules:** uses only authorised company data; shows the reporting period and source figures; **never fabricates** financial information; **never executes** financial transactions automatically.

## 19. Notifications & Alerts

Daily report submitted/missing, expense approval required, payment due, salary due, document expiry, project deadline, budget exceeded, low cash, unusual expense, investment required, management updates. In-app plus configurable email.

## 20. Users & Access Control

Role-based access. **Roles:** Group Owner (full access) · Group Administrator · Company Director · Company Operator / Responsible Representative · Company Accountant · HR Manager · Department Manager · Investor / Shareholder · Employee.

**Rules:** unique login per user; each user assigned to one or more companies; no access to unauthorised companies; permission-based financial access; owner can create, disable and reset accounts; two-factor authentication; login history and audit logs.

## 21. Personal Owner Management

A separate owner profile: dashboard, personal expenses, income, investments, assets, liabilities, financial documents, notes, business ideas, goals, reminders. Personal transactions **never mix** with company accounting, though viewable from the same portal.

## 22. Group Treasury

Company-wise bank and cash balances, total group cash, intercompany loans, receivables, payables, upcoming obligations, monthly cash needs, payroll and investment requirements. This is a **visibility and control** system; company bank accounts and legal ownership remain separate.

## 23. Group Structure & Consolidation

Supports independent companies and parent/holding structures. A company may belong to the group without being legally owned by the parent. **Legal ownership** and **reporting relationships** are configured independently.

## 24. Security, Backup & Audit

RBAC, multi-factor authentication, encrypted transport, secure password storage, audit logs, login history, session management, file access permissions, automated database backups, disaster recovery, data export, user activity tracking, financial transaction history. **No user may permanently delete approved financial records.** Every critical action records who and when.

## 25. UI / UX

Modern enterprise dashboard. **Sidebar (22):** Master Dashboard · Company Portfolio · Daily Reports · Finance & Accounting · Group Treasury · Assets & Depreciation · HR & Payroll · Management Team · Projects · Land & Properties · Investment & Shareholders · Business Planning · Break-even Analysis · Documents · Tasks & Workflow · Approvals · AI Business Intelligence · Reports & Analytics · Notifications · Personal Owner Profile · User Management · System Settings.

Each company has a dedicated workspace with its own sidebar and dashboard; the owner switches companies without logging out. Responsive (desktop, tablet, mobile), data tables, interactive charts, quick search, global date filters, company switcher, light/dark mode, Bangla and English.

## 26. Technical Architecture

Suggested: Next.js/React/TypeScript/Tailwind; Python FastAPI or equivalent REST backend with background jobs; PostgreSQL + Redis; secure object storage with versioning; OpenAI-compatible AI through a secure data-access layer; responsive web app + PWA, future Flutter app. The developer may propose an alternative stack.

**Required:** multi-company architecture, secure tenant isolation, centralised authentication, scalable database, API integrations, automated reporting, background notifications, database backup, audit logging, high availability. Use `company_id` and group/ownership identifiers throughout the data model; enforce access control in the **backend and database**, not only the frontend. See [ARCHITECTURE.md](ARCHITECTURE.md).

## 27. Development Phases

| Phase | Scope |
|---|---|
| 1 — Core MVP | Authentication, company portfolio, master and company dashboards, daily reporting, income & expenses, basic accounting, user management, notifications |
| 2 — Financial & operational ERP | Double-entry accounting, bank, payroll, HR, assets, depreciation, projects, documents, approvals |
| 3 — Group management | Consolidated accounting, treasury, intercompany, investments, shareholders, land & property, management performance |
| 4 — Business development | New ideas, business planning, feasibility, investment planning, break-even, ROI, forecasting |
| 5 — AI & automation | AI CFO, analyst, management assistant, automated summaries, risk alerts, predictive analytics, advanced reporting |

## 28. Final Acceptance Criteria

1. The owner manages all companies from one login.
2. The owner adds a company without developer assistance.
3. Every company has a separate dashboard and ledger.
4. Each company has its own responsible person.
5. Each responsible person submits daily reports.
6. The owner receives and reviews reports centrally.
7. All financial transactions are recorded accurately.
8. Group-wide financial reports are available.
9. Asset depreciation is calculated automatically.
10. Payroll is tracked company-wise and group-wise.
11. Documents and land records can be stored and retrieved.
12. Investments and shareholder records are maintained.
13. New ideas are tracked from planning to profitability.
14. Break-even and ROI reports are available.
15. The owner reviews daily, weekly, monthly and yearly reports.
16. All important actions have an audit trail.
17. Unauthorised users cannot access other companies' information.
18. The platform works on desktop and mobile.
19. Backup and recovery are tested.
20. All critical financial reports reconcile with the underlying ledger.

## 29. Final Development Instruction

Build b Group as a complete, modular, secure, auditable and future-ready enterprise operating system. The Group Owner must manage a portfolio of companies without being physically present, with every company holding an accountable representative who updates daily operations, finances, management activity and performance.

---

## 30. Addendum — Owner Central Financial Register

Added after the baseline. A central register of the owner's obligations and receivables across **Personal**, **Company** and **Other** scopes, kept separate from every company ledger.

**Structure (OWNER CENTRAL DASHBOARD):** *Personal* (personal loans, credit cards, loans given, loans taken, personal receivables) · *Companies* (bBike Ltd., Bag E Rahmat Holdings, Best Health Diagnostic, other companies, investors and landowners) · *Other financial accounts* (other debts and liabilities, special credit facilities, other personal or institutional accounts).

**Rules**
1. Every record carries a mandatory **scope** (Personal / Company / Other), plus the company for company records, so a personal liability is never shown as a company liability.
2. Account types: Loan Taken, Loan Given, Credit Card, Payable, Receivable. Balance = opening amount + increases − settlements.
3. Transactions are permanent; a mistake is voided with a reason, never deleted. Accounts with history cannot be deleted, only closed.
4. The register is **owner-only**.

**Central reports:** Total Payable · Total Receivable · Net Position · Overdue · Loan Schedule · Credit Card Due.

**Additional features**
1. **Due-date alerts** — reminders 7 days before, 3 days before, on the due date, and when overdue (loans, credit cards, payables and receivables).
2. **Party statement** — for one person or institution: total, settled and remaining, with the net position, in one click.
3. **AI financial assistant** — the owner writes, for example, “আজ জমির মালিককে ৫ লাখ টাকা দিয়েছি।”; the assistant prepares a **draft** entry for the correct account; balances update only after the owner approves it. It never records anything on its own.
