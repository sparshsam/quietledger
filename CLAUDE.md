# OpenLedger — Claude Code Instructions

## Project Overview

OpenLedger is a private, local-first finance tool for everyday budgeting and records.
Built with Next.js + TypeScript. Formerly QuietLedger.

**Current Release:** v0.10.6 (2026-06-27)
**Live domain:** https://ledger.kovina.org
**Deploy status:** Production — PR #4 merged.

Releases:
           v0.10.6 — Accounts & Reconciliation (reconciliation workflow, opening/closing balances, balance adjustments, statement reconciliation, account health scoring, filtered views)
           v0.10.5 — Budgets That Learn (automatic recommendations, rolling averages, budget health, forecasting, category rollover, history, adjustment suggestions)
           v0.10.4 — Financial Insights (report modes, spending trends, category growth/decline, merchant summaries, cashflow timeline, savings rate, income consistency)
           v0.10.3 — Import Intelligence & Global Currency Foundation (multi-currency, exchange rates, international CSV, bank format registry, USDC default, Settings currency picker)
           v0.10.1 — CDN caching fix, premium polish, dark mode
           v0.10.0 — Financial Report Redesign — Ledger tab as monthly report, "Where Did My Money Go?", comparison engine, all-months bar chart, staged import flow, budgets from spending data, category learning
           v0.9.12 — Domain migration + import modal + cleanup
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

## Status — v0.10.6 (Accounts & Reconciliation)

### Auth — Complete Rebuild (June 27)
The Google OAuth auth flow was completely rebuilt after root cause analysis revealed a Supabase **project mismatch**: the auth cookie was being set for OpenSprout's project (`rbdyrymtgfqqkdemicdo`) instead of OpenLedger's (`qoxmibmbyjmkntzrckyr`). This happened because `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` was missing from Vercel env (so the server callback silently failed), AND stale OpenSprout cookies on localhost were being read as valid sessions.

**Fixes:**
- **Project mismatch:** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` was absent from Vercel production env → callback's `exchangeCodeForSession` used `undefined` key → PKCE exchange failed silently. Added to Vercel.
- **Stale cookie pollution:** `clearWrongProjectCookies()` in `useAuth()` — on every page load, deletes any `sb-*` cookie whose project ref isn't `qoxmibmbyjmkntzrckyr`. Prevents OpenSprout's session on the same localhost domain from being treated as valid.
- **Middleware stripped:** Removed all Supabase auth logic from `middleware.ts`. No more `getUser()` on every request interfering with auth callback.
- **Callback rewritten** to match OpenSprout's working pattern: `request.cookies.getAll()` (Next.js API), no manual cookie parsing, no artificial delays, no `?code=` handling outside the callback.
- **Browser client** matched to OpenSprout: explicit `flowType: "pkce"`, `autoRefreshToken: true`, `detectSessionInUrl: true`, publishable key.
- **Server client:** switched from anon key to publishable key.
- **Client-side exchange removed:** `useAuth` no longer calls `exchangeCodeForSession` — the server callback handles it.
- **Manual `window.location.assign(data.url)`:** Supabase auto-redirect was unreliable; now reads `data.url` from `signInWithOAuth()` result and redirects explicitly.
- **Sign-out fixed:** `supabase.auth.signOut()` now properly clears session; next sign-in opens Google cleanly.
- **Auth logs** gated behind `localStorage.setItem("DEBUG_AUTH", "true")` — clean console otherwise.

### CDN Caching — Fixed
- `next.config.ts`: Added `Cache-Control: private, no-cache, no-store, must-revalidate` for all HTML routes. Vercel was applying default `s-maxage=31536000` (cache for 1 year at CDN edge).
- `sw.js` was excluded from no-cache regex (`.js` in static-asset exclusion) → CDN cached it for 1 year → browser never detected SW updates. Fixed with explicit `/sw.js` rule.
- SW upgraded: `self.skipWaiting()` on install, proactive cache refresh on activate, `VERSION` constant.

### Service Worker
- **Cache invalidation:** SW no longer stays in "waiting" state — `skipWaiting()` called immediately on install. Proactively re-fetches shell assets on activate.
- **Google avatars bypass:** SW does NOT intercept `lh3.googleusercontent.com` requests (return without `event.respondWith()`) to avoid `connect-src` CSP violations.

### CSP
- Added `'unsafe-eval'` to `script-src` (React dev mode needs eval for sourcemaps/HMR).
- Added `https://lh3.googleusercontent.com` to both `img-src` and `connect-src`.

### UI Changes
- **Net worth moved** from bottom to top summary strip (alongside Income/Spent/Remaining).
- **Import button** added to Transactions tab (same ImportFlow modal).
- **Dark mode fixes:** import modal background `#FDFCF7` → `var(--surface)`. Select component (trigger, popover, options, checkmarks) all have `[data-theme="dark"]` overrides.
- **Accounts tab:** "Add account" button opens account form in a sheet. Each account card shows kind badge (Checking/Credit/Savings/etc). Balance color-coded green/red.

### Downstream Bug Fixes
- **Backup 406:** `fetchLatestBackup()` used `.single()` → 406 when no backup exists. Changed to `.maybeSingle()`.
- **MCP tokens 500:** GET handler used `createAdminClient()` (service role key) which fails on localhost where key isn't in `.env`. Changed to use authenticated client — `openledger_mcp_tokens` RLS allows users to SELECT own tokens.

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
