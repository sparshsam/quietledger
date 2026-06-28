# OpenLedger Architecture

> **Last updated:** v0.11.0 (2026-06-28)

## Overview

OpenLedger is a **local-first** single-page application. The entire ledger runs in the browser with **IndexedDB** as the primary data store and **localStorage** as a fallback. Cloud sync via Supabase is optional and opt-in.

```
Browser (Next.js SPA)
  ├── IndexedDB — primary data store (with localStorage fallback)
  ├── localStorage — secondary store (learnings, rules, aliases, settings)
  ├── Service Worker — offline cache, PWA shell
  ├── Supabase Auth — optional Google sign-in
  ├── Supabase Postgres — optional cloud backup
  └── Supabase Storage — optional receipt photos
```

## Storage Layer

The storage layer (`src/lib/data/storage.ts`) provides an async key-value store backed by IndexedDB with automatic localStorage fallback:

- **IndexedDB** (`openledger` database, `ledger` object store): Stores the primary ledger state. No practical size limit. Async operations avoid blocking the main thread.
- **localStorage fallback**: Used when IndexedDB is unavailable (private browsing in some browsers). Same data shape, synchronous.
- **Migration**: On first load, data is migrated from localStorage to IndexedDB. Both stores are kept in sync during the transition.
- **Crash recovery**: Each save writes an atomic savepoint before updating the main key. If the write is interrupted, the savepoint is recovered on next load.

### Storage Keys

| Key | Store | Purpose |
|-----|-------|---------|
| `openledger.localLedger.v2` | IndexedDB + localStorage | Primary ledger data (v3 schema) |
| `openledger.localLedger.savepoint` | localStorage | Crash recovery savepoint |
| `openledger.currencySettings` | localStorage | Currency preferences |
| `openledger.importSessions` | localStorage | CSV import session history |
| `openledger_category_learnings` | localStorage | Learned category mappings |
| `openledger_categorization_rules` | localStorage | User-defined rules |
| `openledger_merchant_aliases` | localStorage | Merchant name aliases |

## App Structure

```
src/
  ├── app/
  │   ├── app/page.tsx            — Main SPA (all tabs, import, settings)
  │   ├── layout.tsx              — Root layout with PWA meta tags
  │   ├── globals.css             — All styles (~1900 lines)
  │   └── auth/callback/route.ts  — OAuth callback handler
  ├── components/
  │   ├── transactions-view.tsx   — Filterable transaction table
  │   ├── auth-panel.tsx          — Google sign-in / guest display
  │   ├── cloud-backup-panel.tsx  — Backup/restore UI
  │   ├── error-boundary.tsx      — React error boundary
  │   └── ...                     — Budgets, Goals, Receipts, Search, etc.
  ├── lib/
  │   ├── data/
  │   │   ├── types.ts            — All domain types
  │   │   ├── persistence.ts      — localStorage read/write
  │   │   ├── csv-import.ts       — CSV parser + preview builder
  │   │   ├── seed.ts             — Demo ledger data
  │   │   └── finance/            — Finance engine helpers
  │   └── supabase/
  │       ├── client.ts           — Browser Supabase client
  │       ├── server.ts           — Server-side Supabase client
  │       ├── admin.ts            — Service-role client (server-only)
  │       ├── auth-hook.ts        — useAuth() React hook
  │       ├── backup.ts           — Cloud backup CRUD
  │       └── device.ts           — Device registration
  └── middleware.ts               — Session cookie refresh
```

## Data Model

### Core Types (src/lib/data/types.ts)

| Type | Key Fields |
|------|-----------|
| `Account` | id, name, kind (checking/credit/savings/loan), balance, currency |
| `Transaction` | id, date, description, amount, accountId, category, merchant, source |
| `Budget` | id, month, category, budgeted, spent |
| `Goal` | id, name, target, current, deadline |
| `RecurringEntry` | id, description, amount, frequency, intervalDays, nextDate |

### Data Flow

```
User action → React state update → localStorage auto-save
                                    ↕ (opt-in)
                              Supabase cloud backup
```

## Auth Model

See [auth-architecture.md](auth-architecture.md) for full details.

- **Guest mode** (default): No account, all data in localStorage.
- **Google sign-in** (optional): Supabase Auth + device registration + cloud backup.
- **Session**: Managed via Supabase SSR cookies, refreshed by middleware on every request.

## Account Types

| Kind | UI Label | Badge Color |
|------|----------|-------------|
| `chequing` | Checking | Blue |
| `credit-card` | Credit | Red |
| `savings` | Savings | Green |
| `loan` | Loan | Orange |
| `other` | Misc | Gray |

Every transaction is associated with an account via `accountId`. The account kind is resolved at render time from the account entity.

## Cloud Sync

- **Manual only**: Back up and restore are triggered explicitly from Settings.
- **Device tracking**: Each browser is registered as a device on sign-in.
- **Sync events**: Future automatic sync will use the `openledger_sync_events` log.

## MCP Server

OpenLedger exposes a Model Context Protocol server at `/api/mcp` for AI agent access. See [mcp-server-setup.md](mcp-server-setup.md) for setup instructions.

- 30 tools across 7 domains
- Token-based auth (SHA-256 hashed)
- User-isolated queries

## Security

- All `openledger_*` tables have RLS scoped to `auth.uid() = user_id`.
- No secrets in client code.
- Service role key is server-only.
- Sentry crash reporting is optional and disabled by default.
