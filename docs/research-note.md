# QuietLedger — Research Note

## Context

QuietLedger was created to address a gap in personal finance tooling: most available software either requires bank account aggregation (Plaid, Flinks), pushes commercial financial products (loans, refinancing, brokerage accounts), or employs engagement-optimized UI patterns (streaks, goals, scores, notifications).

The design premise is that understanding personal finances does not require surveillance infrastructure, product funnels, or behavioral manipulation.

## Relevant Prior Work

The local-first approach draws from the [local-first software](https://www.inkandswitch.com/local-first/) movement at Ink & Switch, which advocates for systems where users own their data and software respects device boundaries.

The CSV-based import model is deliberately manual — it mirrors the approach used by [Ledger CLI](https://www.ledger-cli.org/) and [hledger](https://hledger.org/) for plain-text accounting, but adapted to a browser-based visual interface for broader accessibility.

## Design Decisions

1. **localStorage over IndexedDB** — Chosen for simplicity in the MVP. IndexedDB is planned as a future migration target for larger ledgers and better schema migration support.
2. **No encryption in MVP** — Encryption is intentionally deferred. The current design documents the limitation clearly and recommends JSON backup exports as a mitigations. See [privacy-model.md](privacy-model.md).
3. **Tag/keyword categorization** — Simple pattern matching rather than ML-based categorization. Transparent, debuggable, and user-controllable.
4. **No backend** — The entire app runs client-side. No user accounts, no sign-up, no server-side storage. This is a deliberate privacy boundary, not an engineering shortcut.

## Open Questions

- What is the optimal storage engine for ledgers exceeding 100K transactions?
- Can end-to-end encrypted sync be designed without a trusted server?
- How should shared/household ledgers handle permission boundaries?

## References

- Ink & Switch. "Local-first software." https://www.inkandswitch.com/local-first/
- Ledger CLI. https://www.ledger-cli.org/
- hledger. https://hledger.org/
