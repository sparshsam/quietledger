# Changelog

All notable changes to OpenLedger will be documented here.

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
