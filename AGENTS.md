# OpenLedger — AI Agent Instructions

## Product Identity

OpenLedger is a private, local-first finance tool. Warm ledger aesthetic, editorial UX. Not a fintech platform — a personal budgeting application with no backend, no accounts, and no cloud dependency.

## Current Release

v0.8.9 — Settings panel consistency + release QA. Live at https://openledgerbysparsh.vercel.app

## Build History (v0.8.x Quick Reference)

| Version | What |
|---------|------|
| v0.8.9 | Settings panel consistency, display:table CSS fix, font @import fix, release QA, Design Playbook checklist verified |
| v0.8.8 | Goals "New Goal +" button nowrap + CLAUDE.md updated |
| v0.8.7 | Button label order — text before icon everywhere (Record transaction +, New Goal +) |
| v0.8.6 | Button layout — single creation path per page, descriptive subtext, "Save" not "Create milestone" |
| v0.8.5 | Removed duplicate TransactionTable, fixed Settings width, fixed Goals button icon |
| v0.8.4 | Visual QA — goals panel rewrite (editorial cards, modal form, pill actions) |

## Rules

1. **Local-first.** Do not add backend services, authentication, or cloud sync.
2. **No tracking.** No analytics, no telemetry, no third-party scripts.
3. **Privacy.** All data stays on the user's device.
4. **Calm UX.** Avoid financial gamification, urgency patterns, or manipulative UI.
5. **Design system.** OpenProof Design Playbook — editorial layout, pill buttons, accent color #8B6534.
6. **Branch naming:** `feat/*`, `fix/*`, `docs/*`, `refactor/*`, `chore/*`.

## Ecosystem Standards

All ecosystem repos follow: https://github.com/sparshsam/ecosystem-standards
