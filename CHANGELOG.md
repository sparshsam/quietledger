# Changelog

All notable changes to OpenLedger will be documented here.

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
