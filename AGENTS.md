# OpenLedger — AI Agent Instructions

## Product Identity

OpenLedger is a private, local-first finance tool. Warm ledger aesthetic, editorial UX. Premium financial report feel. Not a fintech platform — a personal budgeting application with no backend, no accounts, and no cloud dependency.

**Metaphor:** a financial journal — you record, it reveals.

## Current Release

**v0.10.6** (2026-06-27) — Accounts & Reconciliation
**Live domain:** https://ledger.kovina.org
**Status:** Production — reconciliation workflow, account health scoring, filtered views. All 300 tests pass.

## Auth — Complete Rebuild (June 27)

### Root Cause
Google OAuth was broken due to a **Supabase project mismatch**. The auth cookie was being set for OpenSprout's project (`rbdyrymtgfqqkdemicdo`) instead of OpenLedger's (`qoxmibmbyjmkntzrckyr`). Two contributing factors:

1. **Missing `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` on Vercel.** The callback's `createServerClient` received `undefined` for the key → `exchangeCodeForSession` failed silently → no session cookies set → guest mode. The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` was present but unused after the browser client switched to the publishable key format.
2. **Stale OpenSprout cookies on localhost.** Both apps run on `localhost` (different ports). Cookies are not scoped by port. OpenSprout's `sb-rbdyrymtgfqqkdemicdo-auth-token` cookie was visible to OpenLedger. The `useAuth()` hook read it as a valid session → user appeared signed-in with a wrong-project session → "Continue with Google" wouldn't initiate (client already had a session).

### What Was Rebuilt
- **Middleware stripped:** No Supabase client, no `getUser()`, no cookie handling. Only Cache-Control header remains.
- **Callback (`/auth/callback`):** Matches OpenSprout's working pattern exactly — `request.cookies.getAll()` (Next.js API), no manual parsing, no delays, no `?code=` handling.
- **Browser client (`client.ts`):** Uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, explicit `flowType: "pkce"`, `autoRefreshToken: true`, `detectSessionInUrl: true`.
- **Server client (`server.ts`):** Switched from anon key to publishable key.
- **Auth hook (`auth-hook.ts`):** Client-side `exchangeCodeForSession` removed. `clearWrongProjectCookies()` — clears any `sb-*` cookie not matching `qoxmibmbyjmkntzrckyr`. Logs gated behind `localStorage.DEBUG_AUTH=true`.
- **Sign-in button:** Uses `window.location.assign(data.url)` (manual redirect) instead of relying on Supabase auto-redirect. Added `queryParams: { access_type: "offline", prompt: "select_account" }`.
- **Dev debug button:** "Debug Google OAuth" button (dev-only) for isolated OAuth testing.

### Auth Flow
1. Click "Continue with Google" → `signInWithOAuth()` returns `data.url`
2. `window.location.assign(data.url)` → Google OAuth
3. Google → `/auth/callback?code=<pkce_code>`
4. Callback: `createServerClient` → `exchangeCodeForSession(code)` → write `sb-qoxmibmbyjmkntzrckyr-auth-token` cookies → redirect `/app`
5. `/app`: `useAuth()` → `clearWrongProjectCookies()` → `getSession()` → user signed in
6. Sign out: `supabase.auth.signOut()` → redirect `/` — next sign-in opens Google cleanly

### Environment
- **Vercel env:** Added `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Existing `NEXT_PUBLIC_SUPABASE_URL` confirmed correct (points to `qoxmibmbyjmkntzrckyr`).
- **`.env`:** Switched from anon key to publishable key: `sb_publishable_FTJ_XShVabxUb_NVrH7Htw_h3w2ponJ`
- **`.env.example`:** Updated to publishable key format.

## CDN Caching Fix

- `next.config.ts`: `Cache-Control: private, no-cache, no-store, must-revalidate` for HTML routes. Vercel was applying `s-maxage=31536000` (1 year CDN cache).
- `/sw.js` explicit rule: same no-cache headers. SW was excluded from no-cache regex (`.js` in exclusion list) → CDN cached it for 1 year → browser never detected SW updates.
- SW upgraded: `skipWaiting()`, proactive cache refresh on activate, `VERSION` constant.

## Service Worker

- **Network-first** for HTML pages, **cache-first** for static assets.
- **Google avatars bypass:** `lh3.googleusercontent.com` requests are not intercepted (no `event.respondWith()`) to avoid `connect-src` CSP violations.
- `PwaRegister` component checks for updates every 60s, shows "Reload" banner.

## CSP

- `'unsafe-eval'` in `script-src` (React dev mode).
- `https://lh3.googleusercontent.com` in both `img-src` and `connect-src`.

## UI Changes (v0.10.1)

- **Net worth moved** to top summary strip (Income/Spent/Remaining/Net worth).
- **Import button** on Transactions tab.
- **Dark mode fixes:** import modal background, Select component, account badges.
- **Accounts tab:** "Add account" button + kind badges on each card.

## Downstream Bug Fixes

- **Backup 406:** `fetchLatestBackup()` `.single()` → `.maybeSingle()`.
- **MCP tokens 500:** GET handler uses authenticated client (not service role). RLS allows users to SELECT own tokens.

## Key Auth Files

| Path | Purpose |
|------|---------|
| `src/lib/supabase/client.ts` | Browser client (publishable key, PKCE, `detectSessionInUrl`) |
| `src/lib/supabase/server.ts` | Server client (publishable key, `cookies()` API) |
| `src/lib/supabase/auth-hook.ts` | `useAuth()` — session detection, project guard, debug logging |
| `src/lib/supabase/admin.ts` | Admin client (service role, server-only) |
| `src/app/auth/callback/route.ts` | PKCE code exchange + cookie writing |
| `src/components/auth-panel.tsx` | Google sign-in button + sign-out |
| `src/app/account/page.tsx` | Account page sign-in |
| `src/components/public-header.tsx` | Session-aware nav |
| `src/middleware.ts` | Cache-Control only (no auth) |
| `public/sw.js` | Service worker (SW cache, avatar bypass) |
| `src/app/api/mcp/tokens/route.ts` | MCP token CRUD |

## v0.10.0 — Financial Report Redesign

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
- Auto-categorization from bank descriptions
- Category learning: corrections persist to localStorage

### Finance Engine
- Month-scoped: `computeMonthIncome`, `computeMonthExpenses`, `computeMonthCashflow`
- Month-over-month: `computeMonthOverMonth`, `computeCategoryMonthOverMonth`
- Average spending: `averageSpendingByCategory`
- Comparison engine: 6 range types, 12 tests
- **Immutable rule:** Every displayed number must come from the finance engine

### Components
- `LedgerReport`, `ImportFlow`, `AccountsView`, `AllMonthsBarChart`
- `MonthPicker`, `ComparisonPills`, `DatePicker`, `Select`
- `categories.ts` — category hierarchy + keyword mapping

## Rules

1. **Local-first.** Guest mode is default. No account required.
2. **No tracking.** No analytics, no telemetry, no third-party scripts.
3. **Finance engine immutable rule.** Every displayed number must come from `src/lib/finance/` helpers.
4. **Calm UX.** Avoid financial gamification, urgency patterns, or manipulative UI.
5. **Design system.** OpenProof Design Playbook — editorial layout, pill buttons, accent color #7A2F00.
6. **Branch naming:** `feat/*`, `fix/*`, `docs/*`, `refactor/*`, `chore/*`.
7. **Auth:** Rebuilt matching OpenSprout's pattern. Middleware has zero auth logic. All auth state comes from server callback + `useAuth()` hook.

## Ecosystem Standards

All ecosystem repos follow: https://github.com/sparshsam/ecosystem-standards
