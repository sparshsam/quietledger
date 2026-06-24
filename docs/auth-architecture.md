# OpenLedger — Authentication Architecture

> **Date:** June 24, 2026  
> **Release:** v0.9.1  
> **Auth Provider:** Supabase Auth (Google OAuth)  
> **Project:** Elora (`qoxmibmbyjmkntzrckyr`)

---

## Overview

OpenLedger uses a **dual-mode** authentication model:

1. **Guest Mode** (default, no account) — full local functionality
2. **Google-authenticated** (optional sign-in) — adds cloud backup capabilities

Auth is always optional. No core ledger feature requires sign-in.

---

## User Types

| Aspect | Guest | Google-authenticated |
|--------|-------|---------------------|
| **Default?** | Yes | No |
| **Data storage** | localStorage only | localStorage + optional Supabase |
| **Cloud backup** | Not available | Manual backup/restore |
| **Device tracking** | None | Registered in `openledger_devices` |
| **Requires sign-in?** | Never | Only for cloud features |
| **Session** | No session | Supabase JWT (cookie-managed) |

---

## Auth Flow

```
User visits app
  │
  ├── Guest mode (default)
  │     └── All features work locally
  │
  └── Clicks "Continue with Google"
        │
        ├── Supabase redirects to Google OAuth
        ├── User consents (first time only)
        ├── Google redirects back to /auth/callback
        ├── Supabase exchanges code for session
        ├── Next.js middleware refreshes session cookie
        │
        ├── 1. Profile created in openledger_profiles
        ├── 2. Device registered in openledger_devices
        └── 3. User sees "Cloud-ready" state in settings
```

### 1. Google OAuth (src/lib/supabase/client.ts)

The Supabase browser client initiates OAuth:

```ts
await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${origin}/auth/callback`,
  },
});
```

### 2. Callback handler (src/app/auth/callback/route.ts)

The callback route exchanges the authorization code for a session:

```ts
await supabase.auth.exchangeCodeForSession(code);
```

### 3. Session middleware (src/middleware.ts)

The Next.js middleware refreshes the session cookie on every request using `@supabase/ssr`'s `createServerClient`. This keeps the JWT valid without requiring the client to manage token refresh.

### 4. Auth state hook (src/lib/supabase/auth-hook.ts)

The `useAuth()` React hook:
- Reads the initial session on mount
- Subscribes to `onAuthStateChange` for real-time updates
- Creates/reads the user's `openledger_profiles` row
- Triggers device registration after sign-in

---

## Files

| File | Role |
|------|------|
| `src/lib/supabase/client.ts` | Browser-side Supabase client (anon key) |
| `src/lib/supabase/server.ts` | Server-side Supabase client (SSR cookie mgmt) |
| `src/lib/supabase/admin.ts` | Admin client (service role — server only) |
| `src/lib/supabase/auth-hook.ts` | React hook: session, profile, device reg |
| `src/lib/supabase/device.ts` | Device registration service |
| `src/components/auth-panel.tsx` | UI: Google sign-in / guest display / sign-out |
| `src/components/cloud-backup-panel.tsx` | UI: backup and restore controls |
| `src/middleware.ts` | Session cookie refresh on every request |
| `src/app/auth/callback/route.ts` | OAuth callback handler |
| `src/app/privacy/page.tsx` | Privacy policy |

---

## Device Registration

After a successful Google sign-in, the current browser is automatically registered as a device in `openledger_devices`. This establishes a device registry for future sync capabilities without implementing sync yet.

### What is stored

| Field | Description | Example |
|-------|-------------|---------|
| `device_id` | Stable browser fingerprint hash | `web_1a2b3c_xyz` |
| `device_name` | Human-readable browser + OS | `Chrome (macOS)` |
| `device_type` | Platform category | `web` |
| `app_version` | OpenLedger version | `0.9.1` |
| `last_sync_at` | Last activity timestamp | ISO 8601 |

### Registration trigger

Registration occurs in `useAuth()` when `onAuthStateChange` fires with a non-null user. It is silent — no UI is shown. If the device was previously registered (same `device_id` for the same `user_id`), `last_sync_at` is updated rather than creating a duplicate.

### File: src/lib/supabase/device.ts

The `registerDevice()` function is the public API:

```ts
export async function registerDevice(): Promise<boolean>
```

Returns `true` if registration or update succeeded, `false` if the user is not signed in or on error.

---

## RLS Policy Model

All `openledger_*` tables use Row Level Security scoped to `auth.uid()`:

| Policy Type | Formula | Applies to |
|-------------|---------|-----------|
| **SELECT** | `auth.uid() = user_id` | All user-owned tables |
| **INSERT** | `auth.uid() = user_id` (WITH CHECK) | All user-owned tables |
| **UPDATE** | `auth.uid() = user_id` (USING + WITH CHECK) | accounts, transactions, budgets, goals, devices, sync_events |
| **DELETE** | `auth.uid() = user_id` | accounts, transactions, budgets, goals, backups, devices, sync_events, receipts |

- **Guest users**: `auth.uid()` returns `null`, so RLS never matches. Guest data stays entirely in localStorage.
- **Categories table**: Shared reference data, readable by everyone. Insert/update restricted to `TO authenticated`.
- **Profiles table**: SELECT/INSERT/UPDATE scoped to own `user_id`.

---

## Shared Supabase Project Strategy

OpenLedger shares the **Elora** Supabase project with other apps (Clubhouse, Elora Bet, Leaderboard).

### Isolation rules

1. **Table prefix**: All OpenLedger tables use `openledger_` prefix.
2. **No cross-app queries**: Each app only queries its own prefix.
3. **No shared data**: No foreign keys between apps' tables.
4. **Independent migrations**: Each app manages its own migration files.

### Project access

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — safe for client-side, RLS protects all tables.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, never in client code.

---

## Future: Sync Architecture

The device registration and sync tables (`openledger_devices`, `openledger_sync_events`) are foundation for future multi-device sync. The planned architecture:

```
Device A (browser)
  │  ┌─────────────────────┐
  │  │ localStorage (source) │
  │  └─────────┬───────────┘
  │            ▼
  │  ┌─────────────────────┐
  │  │ Supabase (backup)    │
  │  └─────────┬───────────┘
  │            │ sync_events log
  ▼            ▼
Device B ──► Supabase
```

Sync will be:
- **Manual, not automatic** (consistent with the privacy-first model)
- **Device-aware** (each device knows its last sync point)
- **Conflict-resolvable** (last-write-wins initially, with conflict events logged)

---

## Environment Variables

| Variable | Required? | Purpose |
|----------|-----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | For auth/backup | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For auth/backup | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | For admin tasks | Server-only service role key |
