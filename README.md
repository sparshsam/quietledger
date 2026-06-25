# OpenLedger

**A private, local-first personal finance ledger. No bank connections, no dashboards, no noise.**

[![Live app](https://img.shields.io/badge/live-ledger.kovina.org-7A2F00?style=flat-square)](https://ledger.kovina.org)
[![CI](https://img.shields.io/github/actions/workflow/status/sparshsam/openledger/ci.yml?branch=main&style=flat-square&label=ci)](https://github.com/sparshsam/openledger/actions/workflows/ci.yml)
[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0--or--later-6f7d61?style=flat-square)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square)](https://www.typescriptlang.org)

OpenLedger is a calm, local-first finance tool for everyday budgeting and records. It runs entirely in the browser — your financial data stays on your device unless you choose to back it up.

**Live app:** [https://ledger.kovina.org](https://ledger.kovina.org)

![OpenLedger dashboard](assets/screenshot-main.png)

## Quick Links

| Link | Description |
| --- | --- |
| [Live app](https://ledger.kovina.org) | Production deployment on Vercel |
| [Architecture docs](docs/architecture.md) | Data model, auth, and sync architecture |
| [Security policy](SECURITY.md) | Reporting guidance and current limitations |
| [Contributing](CONTRIBUTING.md) | Local setup and contribution expectations |
| [Changelog](CHANGELOG.md) | Notable project changes |
| [License](LICENSE) | AGPL-3.0-or-later |

## Features

- **Accounts** — Create checking, credit, savings, and loan accounts. Every transaction belongs to an account.
- **Transactions** — Manual entry with edit, duplicate, delete. Search, filter by date/account/category/type, sortable columns.
- **CSV Import** — Import bank statement CSV/TSV files with column mapping, preview, duplicate detection, and account selection.
- **Budgets** — Monthly spending plans with progress tracking and over-budget warnings.
- **Goals** — Savings milestones with target amounts, progress tracking, and contribution support.
- **Recurring Entries** — Schedule-based recurring transaction engine with upcoming entry preview.
- **Receipt Capture** — Photo upload from camera or gallery, stored in Supabase Storage.
- **Cloud Sync** — Signed-in users can manually back up and restore their ledger to Supabase.
- **Search** — Global search across all transactions with Quick Jump keyboard navigation.
- **Guest Mode** — Full local functionality without signing in. No account required.
- **MCP Server** — AI agents (Claude Code, Cursor, etc.) can read/write your data via the Model Context Protocol.
- **PWA** — Installable as a standalone app with service worker caching.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + custom CSS |
| State | React hooks + `localStorage` persistence |
| Auth | Supabase Auth (Google OAuth) |
| Cloud | Supabase Postgres (Elora project, `openledger_` prefix) |
| Crash Reporting | Sentry (optional) |
| Hosting | Vercel → [ledger.kovina.org](https://ledger.kovina.org) |
| License | AGPL-3.0-or-later |

## Screenshots

| Ledger dashboard | Transactions view |
|---|---|
| ![Overview](assets/screenshot-main.png) | ![Transactions](assets/screenshot-search.png) |

## Privacy

OpenLedger is **local-first by design**:

- All data stays in your browser's `localStorage` by default.
- CSV parsing happens locally — no data is uploaded to a server.
- Cloud backup is **opt-in** — only triggered manually by signed-in users.
- No analytics, no telemetry, no third-party data collection.
- No bank credentials or Plaid connections.

> **Important:** `localStorage` is convenient but not encrypted secure storage. Export JSON backups regularly and store them somewhere you control.

## Local Development

```bash
git clone https://github.com/sparshsam/openledger.git
cd openledger
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app works fully without any environment variables.

### Optional: Supabase auth + cloud backup

Copy `.env.example` to `.env.local` and uncomment the Supabase variables to enable Google sign-in and cloud backup.

## Deployment

Deploys automatically from `main` to Vercel:

```bash
npx vercel --prod
```

Required environment variables for production:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — For MCP token auth (server-only)

## What's Next

See [ROADMAP.md](ROADMAP.md) for planned work. Current release is **v0.9.11** — Release Readiness.

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE).
