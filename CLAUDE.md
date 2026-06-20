# OpenLedger — Claude Code Instructions

## Project Overview

OpenLedger is a private, local-first finance tool for everyday budgeting and records.
Built with Next.js + TypeScript. Formerly QuietLedger.

Releases: v0.3.0 — Cloud Backup & Manual Sync (current)
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

## Status — v0.3.0 (Cloud Backup & Manual Sync)

### Current features
- Guest mode (default) — no account required, full local functionality
- Manual transaction entry with edit, duplicate, delete
- Local account management with create, edit, archive
- Client-side CSV import with preview, validation, dedup
- Local persistence via `localStorage` with JSON export/import
- PWA manifest + service worker shell
- Supabase Auth (email OTP, Google OAuth) — optional sign-in
- Cloud Backup — signed-in users can manually back up and restore
- RLS on all `openledger_*` tables — users can only access own data

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
| `src/app/globals.css` | All styles (~1500 lines) |
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
| `supabase/migrations/` | SQL migrations (3 files) |

## Branch Naming

- \`feat/*\`, \`fix/*\`, \`docs/*\`, \`refactor/*\`, \`chore/*\`

## Workflow

1. Branch from \`main\`.
2. Run validation (`npm run lint && npm run typecheck && npm run build`) before every PR.
3. Open a PR for every merge. No direct pushes to \`main\`.
4. Branch protection: 1 approval required, CI checks must pass, enforce admins enabled.
