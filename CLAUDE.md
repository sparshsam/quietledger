# OpenLedger — Claude Code Instructions

## Project Overview

OpenLedger is a private, local-first finance tool for everyday budgeting and records.
Built with Next.js + TypeScript. Formerly QuietLedger.

Current Release: v0.9.10 — Mobile & Identity Release Candidate (2026-06-24)

⚠ **STATUS: Release candidate — pushed to `main` but NOT fully deployed.**
Vercel free-plan deployment rate limit hit (100/day). Auto-deploy will resume
when limit resets (~24h). Until then, run `npm run dev` locally to test.

Releases:
           v0.9.10 — Mobile & Identity Release Candidate (CURRENT — see known issues below)
           v0.9.9 — MCP Server, 30 AI agent tools, token auth, 76 tests
           v0.9.8 — Sync hardening, data integrity, security audit, 76 tests
           v0.9.7 — Conflict detection, device management, force re-sync, diagnostics
           v0.9.6 — Receipt capture, Supabase Storage, photo upload, camera, gallery
           v0.9.5 — Recurring Entries, schedule engine, upcoming entries
           v0.9.4 — Search & Ledger Navigation, global search, Quick Jump
           v0.9.3 — Cloud Sync Beta, auto-sync, device list, sync now
           v0.9.1 — Google Auth Foundation, auth UX overhaul, device registration, domain cleanup
           v0.9.0 — Supabase Readiness, 3 new tables, RLS hardening, database types
           v0.8.9 — Settings panel consistency, release QA, CSS @import fix
           v0.8.8 — Goals button alignment fix
           v0.8.7 — Button label order (text before icon)
           v0.8.6 — Button layout, single creation path
           v0.8.5 — Visual QA fixes, double table removed
           v0.8.4 — Visual QA, goals panel rewrite
           v0.8.3 — Typography QA, Stack Sans Notch font
           v0.8.2 — Form & settings overhaul
           v0.8.1 — Form redesign
           v0.8.0 — Product simplification
           v0.7.2 — Domain & metadata cleanup
           v0.7.1 — Brand completion, icons
           v0.7.0 — Editorial redesign, warm ledger palette
           v0.5.0 — Budgets & Goals
           v0.4.0 — Dashboard & Financial Insights
           v0.3.0 — Cloud Backup & Manual Sync
           v0.2.0 — Optional Auth Foundation
           v0.1.1 — Rename to OpenLedger + Supabase foundation
           v0.1.0 — Initial public MVP (as QuietLedger)

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **Data:** Local-first (`localStorage`), optional Supabase cloud backup
- **Auth:** Supabase Auth (email OTP, Google OAuth)
- **Database:** Supabase Postgres (shared Elora project — `openledger_` prefix)
- **Deployment:** Vercel → https://ledger.kovina.org (formerly https://openledgerbysparsh.vercel.app)
- **GitHub:** https://github.com/sparshsam/openledger

## Status — v0.9.10 (Mobile & Identity Release Candidate)

### v0.9.10 Changes (all pushed to main)
- **Brand color:** #8B6534 (warm brown) → #7A2F00 (deep rust) everywhere — CSS vars, manifest, inline styles, hardcoded refs
- **Mobile bottom tab bar:** 5-tab nav with icons (Ledger/Transactions/Recurring/Goals/Settings), 48px touch targets, safe-area-aware, hidden on desktop
- **Mobile layout audit:** Transaction table overflow-x auto; data strip gap reduced + scrollbar hidden; editorial row actions visible on touch; form-actions flex-wrap; hero overflow-wrap; sheet overflow both axes
- **Settings restructured:** Profile (new — AuthPanel, guest/signed-in text), Data, Accounts, Cloud (moved from Privacy — includes CloudBackupPanel + McpTokensPanel), Privacy (simplified — local storage, no tracking, data deletion), Legal (reduced)
- **Import bank statements:** CSV/TSV/TXT file picker → field mapping grid → row preview → Save N transactions button. Wired up on Ledger page as second quick-action button
- **PWA cache:** Bumped to `openledger-shell-v3` to force fresh install
- **Accessibility:** All touch targets ≥44px (bottom tabs 48px, form buttons 48px, action buttons 44px). Accent passes WCAG AAA (9.40:1 on white)
- **Supabase Auth config:** `site_url` fixed from `openledger-two.vercel.app` → `openledgerbysparsh.vercel.app`; `uri_allow_list` updated with all domains and `/auth/callback` paths
- **OAuth branding audit:** See `docs/oauth-branding-audit.md`

### Known Issues (REQUIRED to fix before releasing v0.9.10)
1. **Auth callback cookies not persisting** — `src/app/auth/callback/route.ts` was using `next/headers` cookies() which discards session cookies on 302 redirect. FIX PUSHED to main (commit `a50b2c2`) but NOT deployed (Vercel rate-limited). Fix rewrites cookies onto the `NextResponse.redirect()` object directly.
2. **Vercel deployment rate-limited** — Free plan: 100 deploys/day. Auto-deploy from main will resume when limit resets.
3. **CSV import preview styling** — The `CsvImportPreview` component renders an unstyled grid that looks ugly. Needs CSS pass.
4. **PWA service worker cache** — Even after v3 bump, old SW may still control the page. Users need to open in incognito or clear site data.

### What to do when resuming
1. Wait for Vercel rate limit to reset (~24h from last deploy, roughly 2026-06-25 18:00 UTC)
2. Push the auth callback fix if not already deployed (it IS on main already)
3. Verify on production: sign in → profile shows name/email; cloud section appears
4. Test CSV import end-to-end: import → mapping → save → verify transactions appear
5. Style the CSV import preview component
6. Run `npm run lint && npm run typecheck && npm test && npm run build` before promoting

### Current features
- Guest mode (default) — no account required, full local functionality
- Manual transaction entry with edit, duplicate, delete
- Local account management with create, edit, archive
- Client-side CSV import with preview, validation, dedup
- Local persistence via `localStorage` with JSON export/import
- PWA manifest + full icon set
- Supabase Auth (Google OAuth) — optional sign-in, email OTP removed
- Cloud Backup — signed-in users can manually back up and restore
- RLS on all `openledger_*` tables — users can only access own data
- Editorial home screen with hero net worth, accounts strip, budget/goal progress, recent activity
- Transactions view with search, date range/account/category/type filters, sortable columns
- Modal/sheet-based transaction creation ("New ledger entry")
- Spending plans (budgets) with progress tracking
- Milestone goals with modal creation, progress cards, contribution support
- Control Room (Settings) with 4 consistent card-panel sections: Data, Accounts, Privacy, Legal
- Warm ledger brown color palette (#8B6534), parchment background (#F5F0E8)
- Stack Sans Notch typography via Google Fonts
- Pill-shaped buttons with consistent text-then-icon ordering
- Expandable settings with details/summary elements and consistent card-panel content areas
- Cloud Sync Beta — auto-sync, Sync Now, conflict detection, force re-sync, device management, diagnostics
- Receipt capture — photo upload, mobile camera, gallery, preview, deletion, Supabase Storage
- Global search — search descriptions, notes, categories, accounts, amount ranges; saved filters; Quick Jump (Ctrl+K)
- Recurring entries — monthly/weekly/custom schedules, upcoming entries, skip/pause/resume
- Data integrity — duplicate detection, transaction validation, account reconciliation, backup/restore verification
- Security audit — RLS review, dependency audit, storage policy hardening
- **MCP Server** — 30 AI agent tools across 7 domains (accounts, transactions, categories, budgets, goals, dashboard, search), SHA-256 token auth, Streamable HTTP endpoint on Vercel, Settings UI for token management, 76 tests
- Finance engine (totals, grouping, insights, trends, budgets, goals) with 76 unit tests
- Supabase database with 13 migration-managed tables (profiles, accounts, transactions, categories, budgets, goals, imports, audit_events, backups, devices, sync_events, receipts, mcp_tokens)
- Typed Supabase client types in `src/lib/supabase/database.types.ts`

### Design System (OpenProof Playbook aligned)
- Editorial layout, no dashboard cards, hierarchy via typography
- Single accent color (#7A2F00), barely-visible borders (0.06 opacity)
- All buttons are pills (999px radius)
- 5-tab navigation: Ledger, Transactions, Recurring, Goals, Settings
- Mobile: bottom tab bar (5 icons, 48px targets). Desktop: sticky top navbar
- Max 1280px content width, 720px for settings/goals narrow pages
- `<main>` uses `width: 100%` with `max-width: 1280px` (flex-body compat)
- `.narrow` containers use `max-width: 720px; width: 100%` with `margin-inline: auto`
- Stack Sans Notch / Noto Sans font with Inter fallback from Google Fonts

### What does NOT exist yet
- No automatic cloud sync (must be manually triggered)
- No MCP server for AI agent data access (already built at `apps/mcp/`)
- No background jobs or scheduled backups
- No encryption-at-rest for local storage
- No bank login / Plaid / aggregation
- No multi-device sync or conflict resolution
- No PDF bank statement parser (CSV/TSV/TXT only)

## Architecture Constraints

1. **Local-first.** Guest mode is default. No account required.
2. **Privacy by design.** All data stays on device in local mode.
3. **No tracking.** No analytics, no telemetry.
4. **Manual backup only.** Sync is never automatic. User triggers every upload and restore.
5. **Supabase shared project.** All OpenLedger tables use `openledger_` prefix (shared Elora project).
6. **No service-role exposure to client.** `SUPABASE_SERVICE_ROLE_KEY` is server-only.

## Commands

\`\`\`bash
npm run dev       # Next.js dev server (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint
npm run typecheck # TypeScript type check
npx vercel deploy --prod  # Deploy to Vercel
\`\`\`

## Key Files

| Path | Purpose |
|------|---------|
| `src/app/page.tsx` | Main dashboard (single-page app) |
| `src/app/layout.tsx` | Root layout, metadata, manifest |
| `src/app/globals.css` | All styles (~1900 lines) |
| `src/middleware.ts` | Supabase SSR session middleware |
| `src/app/auth/callback/route.ts` | OAuth/OTP callback handler |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Server Supabase client |
| `src/lib/supabase/admin.ts` | Admin client (service role — server only) |
| `src/lib/supabase/auth-hook.ts` | React auth hook |
| `src/lib/supabase/backup.ts` | Cloud backup API service |
| `src/components/auth-panel.tsx` | Auth login/sign-out UI |
| `src/components/cloud-backup-panel.tsx` | Cloud backup/restore UI |
| `src/lib/data/persistence.ts` | localStorage persistence layer |
| `src/lib/data/types.ts` | All TypeScript domain types |
| `src/lib/finance/` | Finance engine (totals, grouping, insights, trends, budgets, goals) |
| `src/lib/finance/__tests__/` | 50 unit tests across 7 test files |
| `src/components/charts/` | SVG chart components (4 charts) |
| `src/components/dashboard-summary.tsx` | Summary metric cards |
| `src/components/insights-panel.tsx` | Financial insights display |
| `src/components/transactions-view.tsx` | Searchable, filterable transaction table |
| `src/components/budgets-panel.tsx` | Budget CRUD, progress bars, overspending |
| `src/components/goals-panel.tsx` | Goal CRUD, progress tracking, contributions |
| `src/components/empty-states.tsx` | Shared empty state components |
| `supabase/migrations/` | SQL migrations (3 files) |
| `apps/mcp/` | MCP server for AI agent access (30 tools, token auth) |
| `src/components/mcp-tokens-panel.tsx` | MCP token management UI in Settings |
| `src/app/api/mcp/tokens/` | MCP token CRUD API endpoints |
| `docs/design-playbook.md` | Editorial UI design system reference |
| `docs/mcp-server-build-guide.md` | MCP server blueprint for AI agent access |
| `docs/mcp-server-setup.md` | End-user setup guide for connecting AI agents |

## Branch Naming

- \`feat/*\`, \`fix/*\`, \`docs/*\`, \`refactor/*\`, \`chore/*\`

## Workflow

1. Branch from \`main\`.
2. Run validation (`npm run lint && npm run typecheck && npm run build`) before every PR.
3. Open a PR for every merge. No direct pushes to \`main\`.
4. Branch protection: 1 approval required, CI checks must pass, enforce admins enabled.
