# Privacy Model

> See [privacy.md](privacy.md) for the full privacy model document.

## Summary

QuietLedger is designed around local-first privacy:

- **All data stays in the browser.** Transactions, accounts, and settings are stored in `localStorage`.
- **No server communication.** CSV parsing, JSON export, and data processing happen entirely client-side.
- **No third-party services.** No Plaid, Flinks, bank aggregation, or analytics.
- **No accounts.** No sign-up, no password, no email.
- **You control your data.** Export JSON backups at any time.

## Important Limitations

`localStorage` is not encrypted secure storage. Export JSON backups regularly and store them somewhere you control.

## See Also

- [Architecture notes](architecture.md) — data model and persistence details.
- [Design philosophy](design-philosophy.md) — why local-first is a deliberate choice.
