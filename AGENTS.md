# OpenLedger — AI Agent Instructions

## Product Identity

OpenLedger is a private, local-first finance tool. Warm ledger aesthetic, editorial UX. Not a fintech platform — a personal budgeting application with no backend, no accounts, and no cloud dependency.

## Current Release

v0.9.10 — Mobile & Identity Release Candidate (2026-06-24, NOT fully deployed)

⚠ **STATUS: Pushed to main. Vercel free-plan rate limit hit (100 deploys/day).**
Auto-deploy resumes when limit resets (~24h from 2026-06-24 18:00 UTC).
Until then: `npm run dev` for local testing.

## Known Issues (must fix before promoting)

1. **Auth callback cookies lost on redirect** — `src/app/auth/callback/route.ts`
   fix IS on main (commit a50b2c2) but not deployed. Rewrites Supabase session
   cookies onto the 302 redirect response so they survive the redirect.
2. **Vercel rate limited** — ~24h from last deploy.
3. **CSV import preview needs styling** — CsvImportPreview renders an ugly grid.
4. **PWA cache** — old service worker may persist. Use incognito or clear site data.

## Resume Checklist

- [ ] Wait for Vercel rate limit to reset
- [ ] Verify auth callback fix deployed (sign in → Profile shows name/email)
- [ ] Test CSV import: Ledger page → "Import bank statements" → CSV file → mapping preview → Save
- [ ] Style the CSV import preview component
- [ ] Run `npm run lint && npm run typecheck && npm test && npm run build`
- [ ] Deploy to production

## Build History (v0.9.x Quick Reference)

| Version | What |
|---------|------|
| v0.9.10 | Mobile & Identity RC — new accent #7A2F00, bottom tab bar, mobile audit, Profile section, CSV import wired up, auth callback fix, a11y pass |
| v0.9.9 | MCP Server — 30 tools across 7 domains, token auth (SHA-256), Settings UI for create/list/revoke, Vercel-hosted Streamable HTTP endpoint, 76 tests |
| v0.9.8 | Sync hardening, data integrity validation (duplicates, reconciliation, backup verify), security audit, 76 tests |
| v0.9.7 | Conflict detection, device rename/remove, force re-sync, sync diagnostics page |
| v0.9.6 | Receipt capture — Supabase Storage, photo upload, mobile camera, gallery, preview |
| v0.9.5 | Recurring entries — weekly/monthly/custom schedules, skip/pause/resume, upcoming entries |
| v0.9.4 | Search & Ledger Navigation — global search, Quick Jump (Ctrl+K), saved filters |
| v0.9.3 | Cloud Sync Beta — auto-sync, sync indicator, device list, /app/sync page |
| v0.9.2 | Account Gateway — landing page, /app route, account gateway, empty default state |
| v0.9.1 | Google Auth Foundation — Google-only OAuth, device registration, Privacy section redesign, domain cleanup, auth docs |
| v0.9.0 | Supabase Readiness — 3 new tables (devices, sync_events, receipts), RLS WITH CHECK + TO authenticated fixes, database types, migration v4 |
| v0.8.8 | Goals "New Goal +" button nowrap + CLAUDE.md updated |
| v0.8.7 | Button label order — text before icon everywhere (Record transaction +, New Goal +) |
| v0.8.6 | Button layout — single creation path per page, descriptive subtext, "Save" not "Create milestone" |
| v0.8.5 | Removed duplicate TransactionTable, fixed Settings width, fixed Goals button icon |
| v0.8.4 | Visual QA — goals panel rewrite (editorial cards, modal form, pill actions) |

## MCP Server (v0.9.9)

OpenLedger ships with an MCP server (`apps/mcp/`) that exposes 30 tools for AI agents to read/write financial data. Key design:

- **Token auth:** SHA-256 hashed access tokens stored in `openledger_mcp_tokens` table.
- **Service role client:** Bypasses RLS — user isolation enforced in application code via `.eq("user_id", userId)` on every query.
- **Ownership checks:** Every update/delete pre-checks ownership before mutating.
- **30 tools** across 7 domains: accounts, transactions, categories, budgets, goals, dashboard, search.
- **Server entry:** `apps/mcp/src/index.ts` — authenticates at startup, registers all tools, connects via stdio.

### To use the MCP server

1. Generate a token from OpenLedger Settings → MCP Access.
2. Build: `cd apps/mcp && npm install && npm run build`
3. Add to your AI agent's MCP configuration with env vars for `OPENLEDGER_ACCESS_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

**See:** `docs/mcp-server-setup.md` for full setup guide.

## Rules

1. **Local-first.** Do not add backend services, authentication, or cloud sync.
2. **No tracking.** No analytics, no telemetry, no third-party scripts.
3. **Privacy.** All data stays on the user's device.
4. **Calm UX.** Avoid financial gamification, urgency patterns, or manipulative UI.
5. **Design system.** OpenProof Design Playbook — editorial layout, pill buttons, accent color #7A2F00.
6. **Branch naming:** `feat/*`, `fix/*`, `docs/*`, `refactor/*`, `chore/*`.

## Ecosystem Standards

All ecosystem repos follow: https://github.com/sparshsam/ecosystem-standards
