# OpenLedger — AI Agent Instructions

## Product Identity

OpenLedger is a private, local-first finance tool. Warm ledger aesthetic, editorial UX. Premium financial report feel. Not a fintech platform — a personal budgeting application with no backend, no accounts, and no cloud dependency.

**Metaphor:** a financial journal — you record, it reveals.

## Current Release

**v0.10.1** (2026-06-25) — Premium financial report polish
**Live domain:** https://ledger.kovina.org

⚠ **STATUS: Pushed to main. Vercel free-plan rate limit hit (100 deploys/day).**

## v0.10.0 — Financial Report Redesign

The app was transformed from disconnected features into a connected financial report pipeline. All changes pushed to main.

### Ledger tab → Monthly Report
- Summary strip: income / spent / remaining (44px/64px typography, numbers dominate)
- "Where Did My Money Go?" — category breakdown with interactive filtering
- Comparison pills: This Month / Last Week / Last Month / 3 Months / 6 Months / Last Year
- All-months bar chart: 1200×600 viewBox, full-bleed width, income/expense/net bars
- Budget progress inline, net worth section with per-account breakdown
- Custom MonthPicker dropdown replacing native select

### Import Flow
- Premium staged sheet: Choose Account → Upload → Auto-Categorized Preview → Accept
- Editorial drop zone, trust info block, step progress indicator, subtle transitions
- Auto-categorization from bank descriptions (Starbucks→Food|Coffee, Loblaws→Food|Groceries)
- Category learning: corrections persist to localStorage, future imports use learned patterns

### New Finance Engine Helpers
- Month-scoped: `computeMonthIncome`, `computeMonthExpenses`, `computeMonthCashflow`
- Month-over-month: `computeMonthOverMonth`, `computeCategoryMonthOverMonth`
- Average spending: `averageSpendingByCategory`
- Comparison engine: 6 range types, expense/income/cashflow, 12 tests
- **Immutable rule:** Every displayed number must come from the finance engine

### New Components
- `LedgerReport` — monthly report view
- `ImportFlow` — staged import sheet
- `AccountsView` — account list with tap-to-filter
- `AllMonthsBarChart` — full-width income/expense bar chart
- `MonthPicker` — custom month dropdown
- `ComparisonPills` — range selector
- `DatePicker` — custom date picker (replaces all native date inputs)
- `Select` — reusable dropdown (replaces all native selects)
- `categories.ts` — category hierarchy + keyword mapping + autoCategorize

## v0.10.1 — Premium Polish Pass

### Visual
- Summary values: 44px/64px, net worth: 40px/56px, report title: 36px/56px
- Bar chart 4x larger, full-bleed width, gridlines, section heading
- Colors: `#099019` green, `#ff255f` red via CSS variables
- Warm dark mode (`#3A3228` bg), localStorage persistence, system preference respect
- 3-zone header: logo left, nav centered, search+theme right. Seamless with page.
- No header border, page background matches header background

### Components
- Custom DatePicker: replaces all 6 `<input type="date">` across the app
- Custom Select: replaces all native `<select>` across 7 component files
- Import modal: premium redesign with editorial header, progress indicator, trust info
- Navbar icons: lucide-react with CSS sizing

## Key Files

### New (v0.10.x)
- `src/components/ledger-report.tsx` — Monthly report
- `src/components/import-flow.tsx` — Staged import sheet
- `src/components/accounts-view.tsx` — Accounts list
- `src/components/all-months-chart.tsx` — Full-width bar chart
- `src/components/month-picker.tsx` — Custom month dropdown
- `src/components/comparison-pills.tsx` — Range pills
- `src/components/date-picker.tsx` — Custom date picker
- `src/components/select.tsx` — Reusable dropdown
- `src/lib/data/categories.ts` — Category hierarchy + keyword mapping
- `src/lib/finance/comparisons.ts` — Comparison range engine

### Modified
- `src/app/app/page.tsx` — 5-tab nav, shared filter state, theme toggle
- `src/app/globals.css` — Premium report styles (~1550 lines)
- `src/lib/data/csv-import.ts` — Auto-categorize integration
- `src/lib/data/persistence.ts` — Category learning persistence
- `src/lib/data/types.ts` — LearnedCategory, subcategory on Transaction
- `src/lib/finance/totals.ts` — Month-scoped helpers + month-over-month
- `src/lib/finance/budgets.ts` — averageSpendingByCategory
- `src/components/budgets-panel.tsx` — Budget suggestions from import data
- `src/components/goals-panel.tsx` — Budget-first gate
- `src/components/transactions-view.tsx` — Date picker filters
- `src/components/search-view.tsx` — Date picker filters
- `src/components/recurring-panel.tsx` — Date picker + select components
- `src/components/goals-panel.tsx` — Date picker

## Rules

1. **Local-first.** Do not add backend services, authentication, or cloud sync.
2. **No tracking.** No analytics, no telemetry, no third-party scripts.
3. **Finance engine immutable rule.** Every displayed number must come from `src/lib/finance/` helpers.
4. **Calm UX.** Avoid financial gamification, urgency patterns, or manipulative UI.
5. **Design system.** OpenProof Design Playbook — editorial layout, pill buttons, accent color #7A2F00.
6. **Branch naming:** `feat/*`, `fix/*`, `docs/*`, `refactor/*`, `chore/*`.

## Ecosystem Standards

All ecosystem repos follow: https://github.com/sparshsam/ecosystem-standards
