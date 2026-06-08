# Privacy Model

QuietLedger is designed around local-first privacy in its current MVP:

## Current MVP

- **All data stays in the browser.** Transactions, accounts, and settings are stored in `localStorage`.
- **No server communication.** CSV parsing, JSON export, and data processing happen entirely client-side.
- **No third-party services.** No Plaid, Flinks, bank aggregation, or analytics.
- **No accounts.** No sign-up, no password, no email.
- **You control your data.** Export JSON backups at any time. Clear storage with one click.

## Backup Guidance

Because `localStorage` can be cleared by browser settings, private browsing mode, disk cleanup tools, or switching devices:

1. Export a JSON backup after important data entry.
2. Store backup files somewhere you control — encrypted if sensitive.
3. Test restore by reimporting into a fresh browser session.

## Future Hosted Sync

If hosted sync is added, it will be optional and opt-in. The local-only mode will remain fully functional. Any server-side storage will use:

- End-to-end encryption for financial data
- Authenticated API access
- Encrypted backup and restore
