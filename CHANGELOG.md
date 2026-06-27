# Changelog

All notable changes to OpenLedger will be documented here.

## 0.10.2 — 2026-06-27

- **Auth rebuild.** Complete rewrite matching OpenSprout's working pattern. Root cause: Supabase project mismatch — auth cookie was set for OpenSprout's project (`rbdyrymtgfqqkdemicdo`) instead of OpenLedger's (`qoxmibmbyjmkntzrckyr`). Missing `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` on Vercel caused silent PKCE exchange failure. Stale OpenSprout cookies on localhost (same domain) polluted session state.
- **Middleware stripped** of all Supabase auth logic. No more `getUser()` on every request.
- **Callback rewritten** — `request.cookies.getAll()`, no delays, no manual parsing. Matches OpenSprout exactly.
- **Browser client** — publishable key, explicit PKCE, `detectSessionInUrl: true`.
- **Server client** — switched from anon key to publishable key.
- **`clearWrongProjectCookies()`** — auto-clears stale Supabase cookies from other projects on every page load.
- **Manual OAuth redirect** — `window.location.assign(data.url)` instead of relying on Supabase auto-redirect.
- **Auth logs** gated behind `localStorage.setItem("DEBUG_AUTH", "true")`.
- **CDN caching fixed.** Vercel was caching HTML pages for 1 year (default `s-maxage=31536000`). Added explicit `Cache-Control: no-cache` headers. Service worker `sw.js` was excluded from no-cache regex (`.js` in exclusion list). Fixed with explicit `/sw.js` rule.
- **Service worker upgrade.** `skipWaiting()` on install, proactive cache refresh on activate. Google avatar images bypassed (no SW interception) to avoid `connect-src` CSP violations.
- **CSP updates.** `'unsafe-eval'` for dev mode. `https://lh3.googleusercontent.com` in `img-src` and `connect-src`.
- **Backup 406 fix.** `.single()` → `.maybeSingle()` when no backup exists.
- **MCP tokens 500 fix.** GET handler uses authenticated client (not service role) — works on localhost without `SUPABASE_SERVICE_ROLE_KEY`.
- **UI polish.** Net worth moved to summary strip. Import button on Transactions tab. Dark mode fixes (import modal, Select, badges). Add account button + kind badges on Accounts tab.

## 0.10.1 — 2026-06-26

- **CDN caching fix.** Vercel was caching HTML pages at the CDN edge for up to a year. Added explicit `Cache-Control: private, no-cache, no-store, must-revalidate` headers for all HTML routes in `next.config.ts` and middleware. Users now always see the latest deployed version regardless of browser or cache state. See PR for full root-cause analysis.
- **Service worker upgrade.** SW now calls `skipWaiting()` immediately on install (no waiting state). On activate, proactively re-fetches shell assets from the network. VERSION constant enables browser SW update detection.
- **Dark/light mode toggle.** Warm-toned dark mode (`#3A3228` bg), persisted to localStorage, respects `prefers-color-scheme`.
- **Custom DatePicker.** Replaces all native `<input type="date">` across 6 components. Keyboard accessible, parchment popover, compact 224px.
- **Custom Select component.** Reusable dropdown replacing ALL native `<select>` elements across 7 component files. Parchment popover, keyboard accessible.
- **All-months bar chart.** Inline SVG (1200×600 viewBox), full-bleed width, proper gridlines, income/expense/net across all months, click to navigate.
- **Comparison engine.** 6 range types (this_week through last_year), expense/income/cashflow comparisons, 12 tests.
- **Typography rescaling.** Summary values 44px/64px (mobile/desktop), net worth 40px/56px, report title 36px/56px. Amounts dominate labels.
- **Premium import modal redesign.** Editorial header, step indicator, drop zone with format badges, review table with generous spacing, trust info block.
- **3-zone header layout.** Logo left, nav tabs centered, search+theme right. Header matches page background color.
- **Seamless header.** No border-bottom, floats with page content.
- **Color consistency.** All positive `#099019` green, negative `#ff255f` red across entire app via CSS variables.
- **Lint fixes.** 0 errors (down from 68). Unused imports cleaned, setState-in-effect warnings fixed.

## 0.10.0 — 2026-06-25

- **Ledger tab rebuilt** as a monthly financial report — "Where Did My Money Go?" signature section, summary strip (income/spent/remaining), month-over-month comparison pills.
- **Import flow redesigned** as premium staged onboarding — choose account → upload → auto-categorized preview → accept.
- **Smart categorization.** Auto-categorizes bank transactions from description keywords (Starbucks→Coffee, Loblaws→Groceries), hierarchical categories (Food|Groceries, Transport|Fuel), learns from corrections (persisted locally).
- **Budget suggestions.** "Based on your spending" prompts pre-filled from import data averages via `averageSpendingByCategory()`.
- **Goals gate.** Prompts budget creation before showing goals.
- **5-tab navigation.** Ledger / Transactions / Accounts / Goals / Settings. Shared filter state (month, account, category) across all views.
- **Accounts tab** with account list and tap-to-filter across all views.
- **Finance engine.** Month-scoped helpers, month-over-month, average-spending-by-category. Immutable rule: every displayed number comes from the engine.
- **104 tests** across 10 test files.

## 0.9.12 — 2026-06-25

- **Auth redirect fix.** Post-sign-in now goes straight to `/app` (not landing page).
- **Signed-in nav.** Landing page header shows "Ledger" link instead of "Sign in" when authenticated.
- **SW update flow.** New version detected in background — user clicks "Reload" to activate. Periodic update check every 60s prevents stale cache lock-in.
- **Version bump.** App version `0.9.12` exposed via `<meta name="application-version">`.

## 0.9.11 — 2026-06-25

- **Accounts tab becomes a management hub.** Kind badges (Checking/Credit/Savings/Loan/Misc), explainer text, simplified type selection.
- **CSV import account gate.** Import now requires selecting or creating an account before previewing. All imported transactions inherit the account.
- **Account Type column.** Transactions table shows a Type column with color-coded kind badges.
- **Mobile transaction cards.** Stacked card layout replaces horizontal scroll on mobile.
- **Bottom nav fit.** All 5 tabs fit without overflow on narrow viewports.
- **Backup error handling.** Classified errors show contextual messages (auth vs server vs unknown).
- **Error boundaries.** All tab content wrapped with ErrorBoundary and retry fallback.
- **Sentry crash reporting.** Configs added (disabled by default, requires `NEXT_PUBLIC_SENTRY_DSN`).
- **Account deletion workflow.** Signed-in users can delete cloud data from Privacy settings.
- **README rewrite.** Updated for current features, URL, and architecture.
- **Architecture docs.** `docs/architecture.md` rewritten with current data model and structure.
- **PWA manifest review.** Theme color updated to `#7A2F00`.

## 0.9.9 — 2026-06-24

- **MCP Server.** AI agents can now read/write OpenLedger data via the Model Context Protocol.
- **30 tools** across 7 domains: accounts (6), transactions (5), categories (2), budgets (4), goals (5), dashboard (4), search (2).
- **Token auth:** SHA-256 hashed access tokens with Settings UI for create/list/revoke.
- **User isolation:** Service-role client with application-layer `.eq("user_id", userId)` on every query. Ownership pre-checks on all mutations.
- **API endpoints:** `GET/POST/DELETE /api/mcp/tokens` for token management.
- **New doc:** `docs/mcp-server-setup.md` — end-user setup guide for connecting AI agents.
- **New table:** `openledger_mcp_tokens` migration applied.

## 0.9.8 — 2026-06-24

- **Security audit release.** No feature changes.
- **Dependency audit:** Scanned all runtime and dev dependencies. No unused dependencies found. Three moderate npm vulnerabilities cataloged (all transitive, no runtime exposure).
- **Supabase RLS audit:** Verified all 12 `openledger_*` tables have RLS enabled and all policies correctly scope data to `auth.uid() = user_id`.
- **Storage policy fix:** Replaced deprecated `auth.role()` with `auth.uid() IS NOT NULL` in `openledger-receipts` storage bucket policies (SELECT, INSERT, DELETE). Applied via migration `20260624000001`.
- **Environment audit:** `.env.example` verified complete. No secrets committed to `.env`.
- **New document:** `docs/security-audit.md` — comprehensive security audit report.

## 0.9.2 — 2026-06-24

- **Account Gateway:** App restructured with public landing page (`/`), auth gateway (`/account`), and ledger app (`/app`).
- **New routes:** `/` (editorial landing page with hero, principles, CTAs), `/account` (Continue with Google / Try without account), `/about` (about page), all with shared header/footer.
- **Public header/footer:** Added `PublicHeader` and `PublicFooter` components used on `/`, `/about`, `/privacy`, `/terms`, `/support`. Not used on `/app`.
- **Guest mode unchanged:** "Try without account" still provides full local functionality. Guest mode code remains intact.
- **Account gateway:** Signed-in users auto-redirect to `/app`. Guest users click through to the same app with localStorage.
- **Demo data removed:** Seed data defaults to a single empty account with no transactions, budgets, goals, or other demo entries. Screenshot seed (`?screenshots=true`) preserved.
- **Build fix:** Hydration guard and default account prevent SSR prerender errors with empty data.
- All routes are static-prebuilt except auth callback. Google auth, device registration, backup, and all ledger features unchanged.

## 0.9.1 — 2026-06-24

- **Auth UX overhaul:** Removed email OTP sign-in. Primary auth is now "Continue with Google" with "Continue as Guest" as the default.
- **Device registration:** After a successful Google sign-in, the current browser is automatically registered in `openledger_devices` (device_id, device_name, device_type, app_version, last_seen).
- **Session hardening:** Fixed `openledger_profiles` fetch to use `.maybeSingle()` instead of `.single()` — prevents spurious errors on first sign-in.
- **Domain cleanup:** Updated layout metadata, OpenGraph URLs, package.json homepage, and screenshot capture guide from `openledger-two.vercel.app` to `openledgerbysparsh.vercel.app`.
- **Privacy section redesign:** Settings Privacy now explains Guest Mode, Google Account, and Cloud Features with current auth state display.
- **Privacy policy:** Removed email OTP mention; updated to reflect Google-only auth.
- **Auth architecture docs:** Added `docs/auth-architecture.md` covering guest vs. authenticated users, device registration, RLS model, and shared project strategy.
- **Auth CSS:** Dedicated auth panel styles in globals.css (auth-guest, auth-google-btn, auth-signed-in, auth-badge, auth-sign-out, etc.).
- All auth remains optional. Guest/local-first mode is unchanged.

## 0.9.0 — 2026-06-23

- **Supabase Readiness** — Created 12 migration-managed tables on the shared Elora project.
- **New tables:** `openledger_devices` (device registry for multi-device sync), `openledger_sync_events` (sync operation history), `openledger_receipts` (receipt/image attachment metadata).
- **RLS hardening:** Added `WITH CHECK` to UPDATE policies on accounts, transactions, budgets, and goals — prevents user_id reassignment during updates.
- **RLS modernization:** Replaced deprecated `auth.role()` with `TO authenticated` on categories.
- **Database types:** Added `src/lib/supabase/database.types.ts` with typed interfaces for all 12 OpenLedger tables.
- **docs/supabase-audit.md:** Updated with new tables, policies, and migration history.
- All auth remains optional. Guest/local-first mode is unchanged.

## 0.5.0 — 2026-06-19

- Added monthly category budgets with create, edit, delete, progress bars, and overspending warnings.
- Added savings goals with target amounts, progress tracking, contribution support, and optional target dates.
- Added dashboard widgets for budget summary, over-budget categories, goal progress, and upcoming goal dates.
- Updated cloud backup to include budgets and goals in payload and restore preview.
- Added budget and goal finance helpers (budget utilization, remaining budget, overspending detection, goal progress) with 13 new unit tests.
- Added empty states for budgets and goals sections.
- All computations are local derivations from in-memory state. No changes to persistence schema version, auth, or storage keys.

## 0.4.0 — 2026-06-19

- Redesigned dashboard with financial summary cards (income, expenses, net cash flow, net worth).
- Added SVG charts: spending by category, income vs expenses, account balance distribution, monthly trend.
- Improved transactions view with search, date range filter, account/category/type filters, and sortable columns.
- Added insights panel: largest expense this month, top spending category, month-over-month change, possible recurring transactions, low balance warnings.
- Added empty states for accounts, transactions, charts, guest mode guidance, and cloud backup guidance.
- Built finance engine helpers (totals, grouping, insights, trends) with unit tests.
- All computations are local derivations from in-memory state. No changes to persistence, backup, auth, or storage keys.

## 0.3.0 — 2026-06-20

- Added manual cloud backup and restore for signed-in users.
- Created `openledger_backups` table with RLS (users can only access own backups).
- Added Cloud Backup panel with back up, restore preview, and delete actions.
- Restore requires confirmation before replacing local data.
- Updated docs to explain manual backup model and local-first philosophy.
- App remains fully local-first. No automatic sync, no background jobs.

## 0.2.0 — 2026-06-20

- Added optional Supabase Auth foundation (email OTP + Google OAuth).
- Added `openledger_profiles` table with RLS policies.
- Enabled Row Level Security on all `openledger_*` tables.
- Added Auth UI: sign-in panel with email OTP and Google OAuth buttons.
- Added guest/signed-in mode indicator to sidebar.
- Profile row auto-created on first sign-in.
- GitHub repo renamed from quietledger to openledger.
- App remains fully local-first. No auth wall, no mandatory account, no sync.
- No automatic cloud sync or data migration introduced.

- Renamed product from QuietLedger to OpenLedger.
- Added Supabase backend foundation on shared Elora project.
- Created initial schema: `openledger_accounts`, `openledger_transactions`, `openledger_categories`, `openledger_budgets`, `openledger_goals`, `openledger_imports`, `openledger_audit_events`.
- Added Supabase browser, server, and admin client stubs.
- Updated `next.config.ts` CSP to allow Supabase connections.
- Added environment variable examples for Supabase connection.
- Extended architecture docs to describe local-first + future sync modes.
- The app remains fully local-first. No sync, no auth, no migration of user data.

## 0.1.0

- Initial public MVP.
- Calm local-first dashboard.
- Manual transaction entry and account management.
- Client-side CSV import with preview, validation, duplicate detection, and basic categorization.
- Local persistence through browser `localStorage`.
- JSON backup export/import.
- PWA manifest and Vercel deployment.
