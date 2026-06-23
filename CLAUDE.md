# OpenLedger — Claude Code Instructions

## Project Overview

OpenLedger is a private, local-first finance tool for everyday budgeting and records.
Built with Next.js + TypeScript. Formerly QuietLedger.

Current Release: v0.8.8 — Button alignment & CLAUDE.md update

Releases:
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
- **Deployment:** Vercel → https://openledger-two.vercel.app
- **GitHub:** https://github.com/sparshsam/openledger

## Status — v0.8.x (Editorial Product)

### Current features
- Guest mode (default) — no account required, full local functionality
- Manual transaction entry with edit, duplicate, delete
- Local account management with create, edit, archive
- Client-side CSV import with preview, validation, dedup
- Local persistence via `localStorage` with JSON export/import
- PWA manifest + full icon set
- Supabase Auth (email OTP, Google OAuth) — optional sign-in
- Cloud Backup — signed-in users can manually back up and restore
- RLS on all `openledger_*` tables — users can only access own data
- Editorial home screen with hero net worth, accounts strip, budget/goal progress, recent activity
- Transactions view with search, date range/account/category/type filters, sortable columns
- Modal/sheet-based transaction creation ("New ledger entry")
- Spending plans (budgets) with progress tracking
- Milestone goals with modal creation, progress cards, contribution support
- Control Room (Settings) with 4 expandable sections: Data, Accounts, Privacy, Legal
- Warm ledger brown color palette (#8B6534), parchment background (#F5F0E8)
- Stack Sans Notch typography via Google Fonts
- Pill-shaped buttons with consistent text-then-icon ordering
- Expandable settings with details/summary elements
- Finance engine (totals, grouping, insights, trends, budgets, goals) with 50 unit tests

### Design System (OpenProof Playbook aligned)
- Editorial layout, no dashboard cards, hierarchy via typography
- Single accent color (#8B6534), barely-visible borders (0.06 opacity)
- All buttons are pills (999px radius)
- 4-tab navigation: Ledger, Transactions, Goals, Settings
- Mobile: bottom tab bar. Desktop: sticky top navbar
- Max 1280px content width, 720px for narrow pages
- Stack Sans Notch font with Inter fallback from Google Fonts

### What does NOT exist yet
- No automatic cloud sync (must be manually triggered)
- No background jobs or scheduled backups
- No encryption-at-rest for local storage
- No bank login / Plaid / aggregation
- No multi-device sync or conflict resolution

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

## Branch Naming

- \`feat/*\`, \`fix/*\`, \`docs/*\`, \`refactor/*\`, \`chore/*\`

## Workflow

1. Branch from \`main\`.
2. Run validation (`npm run lint && npm run typecheck && npm run build`) before every PR.
3. Open a PR for every merge. No direct pushes to \`main\`.
4. Branch protection: 1 approval required, CI checks must pass, enforce admins enabled.
