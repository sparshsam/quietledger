# OpenLedger — Supabase Table & RLS Audit

> **Date:** June 23, 2026  
> **Release:** v0.9.0 — Supabase Readiness  
> **Project:** Elora (`qoxmibmbyjmkntzrckyr`, us-east-1, Postgres 17)  
> **Schema:** `public`

---

## OpenLedger Tables

All 12 OpenLedger tables use the required `openledger_` prefix. ✅

| Table | RLS | user_id FK | Policies | Notes |
|-------|-----|-----------|----------|-------|
| `openledger_profiles` | ✅ Enabled | uuid (FK → `auth.users`) | 3: select, insert, update | Created v0.2.0 |
| `openledger_accounts` | ✅ Enabled | uuid (nullable) | 4: select, insert, update + WITH CHECK, delete | Created v0.1.1 |
| `openledger_transactions` | ✅ Enabled | uuid (nullable) | 4: select, insert, update + WITH CHECK, delete | FK → `openledger_accounts` |
| `openledger_categories` | ✅ Enabled | none (shared) | 3: select (public), insert (TO authenticated), update (TO authenticated) | Seeded with 11 defaults |
| `openledger_budgets` | ✅ Enabled | uuid (nullable) | 4: select, insert, update + WITH CHECK, delete | FK → `openledger_categories` |
| `openledger_goals` | ✅ Enabled | uuid (nullable) | 4: select, insert, update + WITH CHECK, delete | Created v0.1.1 |
| `openledger_imports` | ✅ Enabled | uuid (nullable) | 3: select, insert, update | Created v0.1.1 |
| `openledger_audit_events` | ✅ Enabled | uuid (nullable) | 2: select, insert | Created v0.1.1 |
| `openledger_backups` | ✅ Enabled | uuid (FK → `auth.users`, NOT NULL) | 3: select, insert, delete | Created v0.3.0 |
| `openledger_devices` | ✅ Enabled | uuid (FK → `auth.users`, NOT NULL) | 4: select, insert, update + WITH CHECK, delete | **New** v0.9.0 |
| `openledger_sync_events` | ✅ Enabled | uuid (FK → `auth.users`, NOT NULL) | 4: select, insert, update + WITH CHECK, delete | **New** v0.9.0 |
| `openledger_receipts` | ✅ Enabled | uuid (FK → `auth.users`, NOT NULL) | 3: select, insert, delete | **New** v0.9.0 |

### RLS Notes

- **UPDATE policies** now include `WITH CHECK` on accounts, transactions, budgets, and goals — prevents user_id reassignment during updates. 🔒
- **Categories** use `TO authenticated` instead of the deprecated `auth.role()`. 🔒
- All policies scope rows via `auth.uid() = user_id`. Guest users (`auth.uid() = null`) never match, preserving local-first privacy.

---

## Non-OpenLedger Tables on the Shared Elora Project

These tables belong to other apps on the shared Supabase project. All use distinct naming conventions. **No modifications were made to these tables.**

| App | Tables | Prefix |
|-----|--------|--------|
| **Elora Bet** | `User`, `Wallet`, `Bet`, `Transaction`, `Session`, `VaultLock`, `Policy` | PascalCase single nouns |
| **Clubhouse** | `clubhouse_clubhouses`, `clubhouse_profiles`, `clubhouse_members`, `clubhouse_events`, `clubhouse_event_rsvps`, `clubhouse_chat_messages`, `clubhouse_invites`, `clubhouse_media_items`, `clubhouse_tournaments`, `clubhouse_tournament_participants`, `clubhouse_tournament_matches` | `clubhouse_` prefix |
| **Leaderboard** | `players`, `leaderboard_scores` | Descriptive lowercase |

All non-OpenLedger tables have RLS enabled. Ownership boundaries are clear.

---

## Ownership Boundaries

```
Project: Elora (shared Supabase project)
├── openledger_*      → OpenLedger app     (12 tables)
├── clubhouse_*        → Clubhouse app      (11 tables)
├── User, Wallet, ... → Elora Bet app      (7 tables)
├── players, ...       → Leaderboard app    (2 tables)
└── Other tables       → Reserved / future
```

This project is shared. All apps must prefix their tables. Mutating another app's tables is prohibited.

---

## Migration History

| File | Version | Purpose |
|------|---------|---------|
| `20260619000001_openledger_schema.sql` | v0.1.1 | Initial schema: accounts, transactions, categories, budgets, goals, imports, audit_events |
| `20260620000001_openledger_auth.sql` | v0.2.0 | Profiles table, RLS policies, user_id columns |
| `20260620000002_openledger_backups.sql` | v0.3.0 | Backups table with RLS |
| `20260623000001_openledger_v090_readiness.sql` | v0.9.0 | **New:** devices, sync_events, receipts + RLS fixes |
