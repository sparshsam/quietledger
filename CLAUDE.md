# QuietLedger — Claude Code Instructions

## Project Overview

QuietLedger is a private, local-first finance tool for everyday budgeting and records. Built with Next.js + TypeScript.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Data:** Local-first (IndexedDB / localStorage)
- **Deployment:** Vercel

## Commands

\`\`\`bash
npm run dev       # Development server
npm run build     # Production build
npm run lint      # ESLint
npm run typecheck # TypeScript type check
\`\`\`

## Architecture Constraints

1. **Local-first.** No backend, no accounts, no cloud sync.
2. **Privacy by design.** All data stays on the user's device.
3. **No tracking.** No analytics, no telemetry.

## Branch Naming

- \`feat/*\`, \`fix/*\`, \`docs/*\`, \`refactor/*\`, \`chore/*\`

## Workflow

1. Branch from \`main\`.
2. Run validation before every PR.
3. Open a PR for every merge. No direct pushes to \`main\`.
