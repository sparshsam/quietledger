# Architecture

> Full architecture documentation at [`docs/architecture.md`](architecture.md) (existing).

## Overview

OpenLedger is a **local-first** single-page application. The entire ledger runs in the browser with IndexedDB as the primary data store and localStorage as a fallback. Cloud sync via Supabase is optional and opt-in.

## Stack

```
Framework:   Next.js 16 (App Router)
Language:    TypeScript 5
Styling:     Tailwind CSS 4 + custom CSS
State:       React hooks + IndexedDB persistence
Auth:        Supabase Auth (Google OAuth) — optional
Cloud:       Supabase Postgres (Elora project, openledger_ prefix)
Crash:       Sentry (optional)
Hosting:     Vercel → ledger.kovina.org
License:     AGPL-3.0-or-later
```

## Storage Architecture

```
Browser (Next.js SPA)
  ├── IndexedDB — primary data store
  ├── localStorage — secondary store (learnings, rules, settings)
  ├── Service Worker — offline cache, PWA shell
  ├── Supabase Auth — optional Google sign-in
  ├── Supabase Postgres — optional cloud backup
  └── Supabase Storage — optional receipt photos
```

## Additional Resources

- [Architecture (full)](architecture.md)
