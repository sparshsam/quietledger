# QuietLedger

Money without noise.

QuietLedger is a private, self-hostable personal finance tracker for calmly understanding where your life energy is going. The MVP is intentionally local-first: no bank connection, no brokerage features, no shame language, no engagement tricks.

## Current MVP

- Calm dark dashboard with paper-ledger surfaces.
- Local seed data for accounts, monthly snapshots, categorization patterns, financial memory, forecast items, life-cost timeline, notes, and transactions.
- Browser-only interactions for selecting accounts, months, insights, memories, and local/privacy status.
- Client-side CSV import with flexible column mapping, preview warnings, duplicate detection, and basic categorization.
- Local browser persistence with schema-versioned `localStorage`, last-saved status, JSON backup restore, reset, and clear controls.
- Plain JSON export with `schemaVersion`, `exportedAt`, `accounts`, `transactions`, `importedTransactions`, `importMetadata`, `monthlySnapshots`, `memories`, and `forecastItems`.
- PWA manifest and service worker shell for installability experiments.

## CSV Import

QuietLedger starts with CSV import because it keeps the app private and understandable. You export transactions from your bank, then import that file locally in the browser. No bank login is required, and in the current local mode no transaction data leaves your device.

The importer supports common bank-style headers and lets you map columns to:

- date
- description
- merchant
- amount
- account
- category
- type / debit / credit

Before saving, QuietLedger shows a preview table with warnings for invalid dates, missing amounts, and likely duplicates. Saved rows are added to local transaction state, update account balances, and recalculate the monthly snapshot for imported months.

### Sample CSV Formats

Single amount column:

```csv
Date,Description,Merchant,Amount,Account,Category
2026-05-03,Internet bill,Northline Internet,-69.99,Chequing,Utilities
2026-05-04,Payroll deposit,Acme Studio,2715.00,Chequing,Income
2026-05-06,Uber Eats,Uber Eats,-31.40,Credit cards,
```

Debit / credit type column:

```csv
Posted Date,Transaction Description,Debit/Credit,Transaction Amount,Account Name
05/07/2026,Grocery Store,Debit,84.12,Chequing
05/08/2026,Salary,Credit,2715.00,Chequing
05/09/2026,Streaming Bundle,Debit,18.99,Credit cards
```

### Why CSV Before Plaid or Flinks?

CSV import matches QuietLedger's philosophy: calm ownership before automation. It avoids credential sharing, vendor lock-in, data resale concerns, webhook complexity, and surprise sync behavior. Bank connections can come later as an optional self-hostable integration, but the foundation should work with files people already control.

## Local-First Storage

QuietLedger stores the active ledger in browser `localStorage` under a schema-versioned key. On startup:

- if a saved ledger exists, it is restored locally;
- if no saved ledger exists, the demo seed data is loaded;
- if the saved data is unreadable or from a newer unsupported schema, QuietLedger safely falls back to demo data and shows a warning.

The saved local ledger includes accounts, transactions, monthly snapshots, memories, forecast items, and CSV import metadata. No backend is connected, no server sync runs, and no bank login is required.

Browser storage is convenient but not a permanent backup strategy. Clearing site data, switching browsers, private browsing, or some cleanup tools can remove local data. Use **Export JSON** after important imports, and keep that file somewhere you control. **Import JSON backup** restores a previously exported ledger.

Data controls in the app:

- **Export JSON** creates a readable backup file.
- **Import JSON backup** restores a saved QuietLedger export.
- **Reset demo** replaces the local ledger with the demo data after confirmation.
- **Clear local data** removes the saved browser ledger after confirmation, then shows the demo fallback.

## Tech

- Next.js
- TypeScript
- Tailwind CSS
- PWA basics
- Future boundary for Supabase/Postgres
- AGPL-3.0-or-later

## Development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Direction

QuietLedger should feel like a thoughtful notebook, not a financial drill sergeant. Future milestones include Supabase-backed storage, import flows, subscription radar, calm forecasting, local-first sync, and a longer financial memory timeline.

More implementation notes live in [`docs/architecture.md`](docs/architecture.md).
