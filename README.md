# b Group

Centralized business management and enterprise operating system: one owner, one portal, multiple companies.
Built with [Lovable](https://lovable.dev) on TanStack Start, React 19, TypeScript, Tailwind CSS v4 and shadcn/ui.

- **Landing page:** `/`
- **Portal:** `/app` (22 modules, a workspace for every company)

## Documentation

| Document | Purpose |
|---|---|
| [docs/SRS.md](docs/SRS.md) | Software Requirements Specification (the requirements baseline) |
| [docs/TRACEABILITY.md](docs/TRACEABILITY.md) | Every requirement mapped to code, with honest status and gaps |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Code layout, design decisions, accounting model, and what still needs a backend |

## Modules

Master Dashboard · Company Portfolio · Daily Reports · Finance & Accounting · Group Treasury · Assets & Depreciation ·
HR & Payroll · Management Team · Projects · Land & Properties · Investment & Shareholders · Business Planning ·
Break-even Analysis · Documents · Tasks & Workflow · Approvals · AI Business Intelligence · Reports & Analytics ·
Notifications · Personal Owner Profile · User Management · System Settings.

## Development

Requires Node.js 20.11+ and npm.

```sh
npm install
npm run dev        # start the dev server
npm run build      # production build
npm run lint       # ESLint + Prettier
npx tsc --noEmit   # strict type check
npm test           # unit tests + page render tests
```

> On Windows, run tests from PowerShell, cmd or the VS Code terminal (not Git Bash). See the note in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Data and status

The portal ships with demo data for the nine initial companies so every module can be explored. In this build all data is stored
in your browser (`localStorage`); use **System Settings → Backup** to export or restore it. Authentication with two-factor sign-in,
database-level tenant isolation, file storage, email delivery and scheduled jobs require the backend described in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The top-bar user switcher is a demo stand-in for real sign-in.

## Working with Lovable

Changes pushed to the connected branch sync back to Lovable. Do not rewrite published git history. Database schema changes are
managed in Lovable, not by hand-written migrations.
# shahajalal-protfolio
