# OpenLedger — Claude Code Instructions

## Project Overview

OpenLedger is a private, local-first finance tool for everyday budgeting and records.
Built with Next.js + TypeScript. Formerly QuietLedger.

**Current Release:** v0.10.1 (2026-06-25)
**Live domain:** https://ledger.kovina.org (formerly https://openledgerbysparsh.vercel.app)
**Deploy status:** Vercel free-plan rate limit hit (100/day). Latest `main` commits NOT deployed. Deploy will resume when limit resets.

Releases:
           v0.10.1 — Premium financial report polish, chart rescaling, custom DatePicker, dark mode, Select/Dropdown system
           v0.10.0 — Financial Report Redesign — Ledger tab as monthly report, "Where Did My Money Go?", comparison engine, all-months bar chart, staged import flow, budgets from spending data, category learning
           v0.9.12 — Domain migration + import modal + cleanup (deployed to main, NOT on Vercel)
           v0.9.11 — Release Readiness — account management, CSV import gate, mobile cards, error boundaries, Sentry, account deletion
           v0.9.10 — Mobile & Identity Release Candidate
           v0.9.9 — MCP Server, 30 AI agent tools, token auth, 76 tests
           v0.9.8 — Sync hardening, data integrity, security audit, 76 tests
           (v0.9.7 and earlier — see CHANGELOG.md)

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4 + custom CSS (~1550 lines in globals.css)
- **Data:** Local-first (`localStorage`), optional Supabase cloud backup
- **Auth:** Supabase Auth (Google OAuth — email OTP removed)
- **Database:** Supabase Postgres (shared Elora project — `openledger_` prefix)
- **Crash reporting:** Sentry (optional, requires `NEXT_PUBLIC_SENTRY_DSN`)
- **Deployment:** Vercel → https://ledger.kovina.org
- **GitHub:** https://github.com/sparshsam/openledger

## Status — v0.10.1 (Premium Financial Report Polish)

### v0.10.0 — Financial Report Redesign
- **Ledger tab** rebuilt as a monthly financial report — "Where Did My Money Go?" signature section, summary strip (income/spent/remaining), month-over-month comparison pills
- **Import flow** redesigned as premium onboarding — staged sheet (choose account → upload → auto-categorized preview → accept), trust messaging, editorial drop zone
- **Smart categorization** — auto-categorizes bank transactions from description keywords (Starbucks→Coffee, Loblaws→Groceries), hierarchical categories (Food|Groceries, Transport|Fuel), learns from corrections (persists locally)
- **Budget suggestions** — "Based on your spending" prompts pre-filled from import data averages via `averageSpendingByCategory()`
- **Goals gate** — prompts budget creation before showing goals
- **Navigation** — 5 tabs: Ledger / Transactions / Accounts / Goals / Settings. Shared filter state (month, account, category) across all tabs.
- **Accounts tab** — account list with tap-to-filter across all views
- **All-months bar chart** — inline SVG, income/expense/net across all months, click to navigate
- **Comparison engine** — `comparisons.ts` with 6 range types (this_week through last_year), expense/income/cashflow comparisons, 12 tests
- **Finance engine** — month-scoped helpers, month-over-month, average-spending-by-category. Immutable rule: every displayed number comes from the engine.
- **104 tests** across 10 test files

### v0.10.1 — Premium Polish Pass
- **Typography rescaling** — summary values 44px/64px (mobile/desktop), net worth 40px/56px, report title 36px/56px. Amounts dominate labels.
- **Bar chart 4x larger** — 1200×600 viewBox, full-bleed width, proper gridlines, section heading "Income, Expenses & Net Cash Flow"
- **All colors** — positive `#099019` green, negative `#ff255f` red across entire app via CSS variables
- **Custom DatePicker** — replaces all native `<input type="date">` across 6 components. Keyboard accessible, parchment popover, compact 224px.
- **Custom Select component** — reusable dropdown replacing ALL native `<select>` elements across 7 component files. Parchment popover, keyboard accessible.
- **Dark/light mode toggle** — warm-toned dark mode (`#3A3228` bg), persisted to localStorage, respects system preference
- **Import modal premium redesign** — editorial header, progress indicator, trust info block, drop zone with format badges, review table with generous spacing, 120ms step transitions
- **3-zone header layout** — logo left, nav tabs perfectly centered, search+theme right. Header matches page background color.
- **Navbar icons** — lucide-react with CSS-based sizing (`.navbar-search-btn svg { width: 16px; height: 16px }`)
- **Lint fixes** — 0 errors (down from 68), unused imports cleaned, setState-in-effect warnings fixed
- **Header seamless** — no border-bottom, floats with page content, background matches page

## Issues Faced This Session

1. **Tailwind 4 JIT not generating `size-*` utilities for SVG elements.** Fix: use direct CSS `.navbar-search-btn svg { width: 16px; height: 16px; }` targeting SVG elements. Tailwind's class scanner missed SVGs rendered by lucide-react components.
2. **Vercel free-plan rate limit (100 deploys/day).** Still rate-limited. Deploy command: `npx vercel --prod --force && npx vercel alias set <id> ledger.kovina.org`

## Architecture Constraints

1. **Local-first.** Guest mode is default. No account required.
2. **Privacy by design.** All data stays on device in local mode.
3. **No tracking.** No analytics, no telemetry.
4. **Manual backup only.** Sync is never automatic. User triggers every upload and restore.
5. **Supabase shared project (Elora).** All OpenLedger tables use `openledger_` prefix.
   Other apps on same project: Clubhouse (`clubhouse_*` tables), Elora Bet (`Bet`, `Wallet`, etc.).
6. **No service-role exposure to client.** `SUPABASE_SERVICE_ROLE_KEY` is server-only.
7. **Finance engine immutable rule.** Every financial value must come from `src/lib/finance/` helpers. No inline `.filter().reduce()` in components.

## Commands

```bash
npm run dev       # Next.js dev server (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint
npm run typecheck # TypeScript type check
npx vitest run    # Run tests (104 tests)
npx vercel deploy --prod  # Deploy to Vercel (rate-limited to 100/day on free plan)
npx vercel alias set <deploy-id> ledger.kovina.org  # Explicit production alias
```

## Key Files

| Path | Purpose |
|------|---------|
| `src/components/ledger-report.tsx` | Monthly financial report (summary, categories, charts, net worth) |
| `src/components/import-flow.tsx` | Premium staged import sheet |
| `src/components/accounts-view.tsx` | Account list with tap-to-filter |
| `src/components/all-months-chart.tsx` | Full-width income/expense bar chart |
| `src/components/month-picker.tsx` | Custom month selector dropdown |
| `src/components/comparison-pills.tsx` | This Month/Last Week/Last Month etc. pill selector |
| `src/components/date-picker.tsx` | Custom date picker (replaces native date inputs) |
| `src/components/select.tsx` | Reusable dropdown component |
| `src/app/app/page.tsx` | App SPA (all tabs, import modal, settings, theme toggle) |
| `src/app/globals.css` | All styles (~1550 lines) |
| `src/lib/finance/totals.ts` | Month-scoped income/expense/cashflow helpers |
| `src/lib/finance/comparisons.ts` | Comparison range engine (6 ranges, 3 metric types) |
| `src/lib/finance/budgets.ts` | Budget helpers + averageSpendingByCategory |
| `src/lib/data/categories.ts` | Category hierarchy + keyword mapping + autoCategorize |
| `src/lib/data/csv-import.ts` | CSV parsing + import preview with auto-categorize |
| `docs/superpowers/specs/2026-06-25-v0.10.0-financial-report-redesign.md` | Full v0.10 spec |
| `docs/superpowers/plans/2026-06-25-v0.10.0-financial-report-redesign.md` | Implementation plan |

## Branch Naming

- `feat/*`, `fix/*`, `docs/*`, `refactor/*`, `chore/*`

## Workflow

1. Branch from `main`.
2. Run validation (`npm run lint && npm run typecheck && npm run build`) before every PR.
3. Open a PR for every merge. No direct pushes to `main`.
4. Branch protection: 1 approval required, CI checks must pass, enforce admins enabled.
