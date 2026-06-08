# Design Philosophy

## Money Without Noise

QuietLedger exists because most personal finance software is built for financial institutions, not for the people whose money it tracks. The default design vocabulary — budgets, goals, scores, streaks, alerts — comes from a world that profits from engagement, not from clarity.

QuietLedger takes a different approach. A ledger is a tool for recording and understanding, not for optimising or gamifying. The interface is deliberately calm: dark surfaces, paper-like textures, no shame language, no notifications telling you that you failed at something you never opted into.

## Local-First as a Privacy Boundary

The current MVP stores everything in browser localStorage. This is not an engineering shortcut — it is a deliberate privacy boundary. Your financial history is yours, and no server should need to touch it for you to understand it.

CSV import is the preferred data entry path for the same reason. Exporting transactions from your bank and importing them locally means no third party ever sees the data in transit or at rest. JSON backup is the recommended safety net — keep that file somewhere you control.

The decision to be local-first limits certain features (multi-device sync, bank aggregation), but those limitations are features of the privacy model, not bugs.

## The Vocabulary Matters

QuietLedger avoids terms like "budget," "goal," "net worth," and "financial health." These words carry judgment and implied norms. Instead, the app uses:

- **Ledger** — a record of what happened, not what should have happened
- **Accounts** — containers for understanding, not categories of success
- **Transactions** — individual events, not data points in a behavioural score
- **Insights** — observations, not recommendations

The language should make space for the user to draw their own conclusions.

## Future Hosted Sync

If hosted sync is added, it will be optional. The local-only mode will remain fully functional. Any sync layer will be end-to-end encrypted and clearly documented. The goal is to preserve the privacy model while adding convenience — not to trade privacy for features.
