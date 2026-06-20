# OpenLedger Architecture Notes

OpenLedger is currently a browser-local Next.js app. The app has no auth layer, no backend connection, and no bank aggregation integration.

## Data Boundary

Domain types live in `src/lib/data/types.ts`. Demo data lives in `src/lib/data/seed.ts`. The UI reads from React state initialized from either local persistence or demo data, which keeps the future Supabase/Postgres boundary separate from dashboard rendering.

Manual transaction entry, CSV import, and account management all write into the same local React state. The dashboard derives account balances and monthly snapshot values from that active state, then persistence writes the result to browser storage.

## Local Persistence

Local persistence lives in `src/lib/data/persistence.ts`.

- Storage: `localStorage`
- Key: `openledger.localLedger.v1`
- Schema: `schemaVersion: 1`
- Saved fields: accounts, transactions, monthly snapshots, memories, forecast items, and import metadata

On startup, OpenLedger attempts to load the saved local ledger. If the saved data is missing, unreadable, or too new for the current app, the demo ledger is loaded safely. Every local state change writes a fresh `savedAt` timestamp.

Account records carry starting balances. Display balances are calculated as starting balance plus local CSV/manual transactions for that account. Archived accounts remain in storage and JSON export, but are hidden from active account selectors and the main account list.

Transaction records can come from demo, CSV, or manual sources. Manual records are editable in place; duplicate creates a new manual record; delete removes the local record after confirmation.

## Backups

JSON export is the recommended backup format for the MVP. The export includes imported transactions and import metadata so a restored ledger can preserve CSV provenance. JSON import accepts current schema exports and safely fills missing optional fields from demo defaults where possible.

Users should export backups before clearing browser data, switching browsers, or relying on private/incognito sessions.

## Privacy Model

CSV parsing and JSON backup restore run in the browser. OpenLedger does not request bank credentials, does not connect to a server, and does not sync transaction data in the current local mode.

Future sync should remain opt-in and self-hostable. Supabase/Postgres can replace the persistence boundary later without changing the dashboard's core data shape.

## Finance Engine (v0.4.0)

Computation helpers live in `src/lib/finance/`. All functions are pure derivations from in-memory state — no side effects, no persistence changes.

| Module | Purpose |
|--------|---------|
| `totals.ts` | Income, expense, net cash flow, net worth, effective account balance |
| `grouping.ts` | Group transactions by category, month, or account; category/monthly totals |
| `insights.ts` | Largest expense, top category, month-over-month change, recurring detection, low balance alerts |
| `trends.ts` | Monthly trend series (income, expense, net per month) |

All finance functions are tested under `src/lib/finance/__tests__/` (28 tests across 4 test files).

## Supabase Foundation (v0.1.1)

A Supabase backend schema has been prepared on the shared Elora Supabase project for optional future sync. All OpenLedger tables use the `openledger_` prefix to namespace them within the shared project.

### Tables

| Table | Purpose |
|-------|---------|
| `openledger_accounts` | Account records matching the local `Account` type |
| `openledger_transactions` | Transaction records matching the local `Transaction` type |
| `openledger_categories` | Pre-seeded default categories (Groceries, Rent, Income, etc.) |
| `openledger_budgets` | Monthly budget envelopes per category |
| `openledger_goals` | Savings goals with target amounts and deadlines |
| `openledger_imports` | CSV import history metadata |
| `openledger_audit_events` | Immutable event log for created/updated/deleted records |

All tables include `user_id` columns (nullable — reserved for future auth), `created_at`/`updated_at` timestamps, and auto-updating triggers on `updated_at`.

### Client Setup

- **Browser client** (`src/lib/supabase/client.ts`) — uses `@supabase/ssr` with the anon key. Safe for client-side use.
- **Server client** (`src/lib/supabase/server.ts`) — uses `@supabase/ssr` with cookie-based auth for Next.js server components and API routes.
- **Admin client** (`src/lib/supabase/admin.ts`) — uses `SUPABASE_SERVICE_ROLE_KEY`. SERVER-ONLY. Never imported in client code.

### Current Status

The schema is applied and ready. v0.2.0 added optional auth (email OTP + Google OAuth) and a profile creation flow. The app continues to work fully without logging in — guest mode remains the default. Sync is not enabled yet and will be introduced in a future release.

### Auth (v0.2.0)

- Auth is optional. Guest mode is the default.
- Email OTP: user enters their email, receives a sign-in link, clicks it, and is authenticated.
- Google OAuth: if configured in the Supabase project, the Google sign-in button redirects through the OAuth flow.
- On first sign-in, an `openledger_profiles` row is auto-created with `display_name`, `email`, and `avatar_url`.
- Auth state is managed client-side via `useAuth()` hook (`src/lib/supabase/auth-hook.ts`).
- Session is persisted via cookies (managed by `@supabase/ssr` middleware).
- Sign-out clears the session and returns to guest mode.

### RLS Policies

All `openledger_*` tables have Row Level Security enabled:
- **openledger_profiles**: users can select/insert/update only their own profile.
- **openledger_accounts**, **transactions**, **budgets**, **goals**, **imports**: full CRUD scoped to `auth.uid()` = `user_id`.
- **openledger_audit_events**: users can view and insert their own events.
- **openledger_categories**: public read, authenticated insert/update.

All `user_id` columns are nullable, preserving backward compatibility with local data that has no user ownership.

### Client Files

- **Browser client** (`src/lib/supabase/client.ts`) — uses `@supabase/ssr` with the anon key. Safe for client-side use.
- **Server client** (`src/lib/supabase/server.ts`) — uses `@supabase/ssr` with cookie-based auth for Next.js server components and API routes.
- **Admin client** (`src/lib/supabase/admin.ts`) — uses `SUPABASE_SERVICE_ROLE_KEY`. SERVER-ONLY. Never imported in client code.
- **Auth hook** (`src/lib/supabase/auth-hook.ts`) — React hook providing `user`, `session`, `profile`, and `loading` state.
- **Auth panel** (`src/components/auth-panel.tsx`) — UI component for sign-in, sign-out, and profile display.

- Desktop dashboard at `1440x1000`
- Mobile dashboard at `390x900`
- Manual transaction form, including validation state
- Account management with one archived account
- Recent transaction action buttons
- Local data backup controls
