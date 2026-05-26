# QuietLedger Architecture Notes

QuietLedger is currently a browser-local Next.js app. The app has no auth layer, no backend connection, and no bank aggregation integration.

## Data Boundary

Domain types live in `src/lib/data/types.ts`. Demo data lives in `src/lib/data/seed.ts`. The UI reads from React state initialized from either local persistence or demo data, which keeps the future Supabase/Postgres boundary separate from dashboard rendering.

## Local Persistence

Local persistence lives in `src/lib/data/persistence.ts`.

- Storage: `localStorage`
- Key: `quietledger.localLedger.v1`
- Schema: `schemaVersion: 1`
- Saved fields: accounts, transactions, monthly snapshots, memories, forecast items, and import metadata

On startup, QuietLedger attempts to load the saved local ledger. If the saved data is missing, unreadable, or too new for the current app, the demo ledger is loaded safely. Every local state change writes a fresh `savedAt` timestamp.

## Backups

JSON export is the recommended backup format for the MVP. The export includes imported transactions and import metadata so a restored ledger can preserve CSV provenance. JSON import accepts current schema exports and safely fills missing optional fields from demo defaults where possible.

Users should export backups before clearing browser data, switching browsers, or relying on private/incognito sessions.

## Privacy Model

CSV parsing and JSON backup restore run in the browser. QuietLedger does not request bank credentials, does not connect to a server, and does not sync transaction data in the current local mode.

Future sync should remain opt-in and self-hostable. Supabase/Postgres can replace the persistence boundary later without changing the dashboard’s core data shape.
