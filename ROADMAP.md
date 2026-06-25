# OpenLedger — Roadmap

> Private, local-first finance tooling for everyday budgeting and records.
> **Current release:** v0.9.12 — [CHANGELOG](CHANGELOG.md)

---

## Shipped (v0.1–v0.9.12)

| Area | Status |
|------|--------|
| Manual transaction entry (edit, duplicate, delete) | ✅ |
| Multi-account management (create, edit, archive, kind badges) | ✅ |
| Account types: Checking, Credit, Savings, Loan, Crypto, Misc | ✅ |
| Guest mode (no account required, full local functionality) | ✅ |
| CSV import with validation, dedup, account gate, auto-local-save | ✅ |
| Search & filters (date range, account, category, type, sortable columns) | ✅ |
| Quick Jump global search | ✅ |
| Dashboard: hero net worth, accounts strip, budget/goal progress, activity | ✅ |
| Charts: spending by category, income vs expenses, account balance, monthly trend | ✅ |
| Insights: top spending, month-over-month, recurring detection, low balance warnings | ✅ |
| Spending plans (budgets) with progress tracking and overspending warnings | ✅ |
| Milestone goals with contributions and progress cards | ✅ |
| Recurring entries with schedule engine | ✅ |
| Receipt capture (camera, gallery, file upload, Supabase Storage) | ✅ |
| PWA with full icon set, service worker, update detection | ✅ |
| Google OAuth via Supabase (optional — local-first remains default) | ✅ |
| Device registration on sign-in | ✅ |
| Cloud backup & restore (manual — user-triggered upload & restore) | ✅ |
| Cloud sync (signed-in auto-sync, device list, sync-now button) | ✅ |
| Conflict detection & force re-sync | ✅ |
| Account deletion workflow for signed-in users | ✅ |
| Supabase RLS on all `openledger_*` tables | ✅ |
| MCP server: 30 AI agent tools, token auth, Vercel-hosted | ✅ |
| Sentry crash reporting (disabled by default) | ✅ |
| Error boundaries on all tabs | ✅ |
| Security audit (dependencies, RLS, storage, environment) | ✅ |
| Domain migration → ledger.kovina.org | ✅ |
| Service worker update flow (background detection, user reload) | ✅ |

## Near-term

- [ ] **Multi-currency support.** Accept transactions in different currencies. Exchange-rate-aware balance calculations and display.
- [ ] **Automatic cloud sync.** Remove the manual "Back up now" / "Sync now" step. Sync automatically on data changes for signed-in users, with offline queue and retry.
- [ ] **Bank/Plaid integration.** Link real bank accounts for automatic transaction import. Optional, opt-in.
- [ ] **Data export.** Export transactions to CSV, QIF, or OFX for external use. Current JSON export serves backup, not interchange.

## Medium-term

- [ ] **Receipt OCR.** Auto-extract payee, amount, and date from receipt photos to reduce manual entry.
- [ ] **Local encryption-at-rest.** Encrypt `localStorage` data with a user-chosen passphrase before persisting. Guest-mode privacy upgrade.
- [ ] **Multi-device sync & conflict resolution.** Real-time (or near-real-time) sync across devices with CRDT or last-writer-wins conflict handling.
- [ ] **Reporting engine.** Period-over-period spending reports, net worth timelines, tax-category rollups, exportable to PDF.

## Long-term / Investigate

- [ ] **Budget rollover / envelope budgeting.** Unspent budget amounts carry into the next period.
- [ ] **Scheduled / recurring bill reminders.** Push notifications for upcoming bills.
- [ ] **Investment account tracking.** Portfolio value, cost basis, dividend tracking.
- [ ] **Shared / family ledgers.** Collaborative budgets and accounts with granular permissions.
- [ ] **Offline-first with background sync queue.** Full offline support even for cloud users — queue mutations locally, sync when online.

---

> **Note:** OpenLedger remains **local-first by default**. No cloud feature is mandatory. All near-term items preserve guest-mode parity unless stated otherwise.
