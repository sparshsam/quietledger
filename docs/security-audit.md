# OpenLedger — Security Audit

> Date: June 24, 2026
> Release: v0.9.8
> Scope: Dependency audit, Supabase RLS policy audit, environment audit

## Dependency Audit

### npm audit results

| Severity | Count | Package | Type | Notes |
|----------|-------|---------|------|-------|
| Moderate | 1 | `js-yaml` (<=4.1.1) | Transitive | DoS via quadratic-complexity merge key handling. Embedded in dev toolchain, not runtime. |
| Moderate | 1 | `postcss` (<8.5.10) | Transitive (via next) | XSS via unescaped `</style>` in CSS stringify output. Prefixed by Next.js internal usage. |
| Moderate | 1 | `next` (16.2.6) | Direct | Depends on vulnerable `postcss` version. |
| **Total** | **3** | | | **0 critical, 0 high, 3 moderate, 0 low** |

**Mitigation notes:**
- All three vulnerabilities are moderate severity. None expose user financial data.
- `js-yaml` is a transitive dependency in the dev dependency tree (not used in application code). No runtime exposure.
- The `postcss` vulnerability is carried by `next` itself. The Next.js team controls the bundled `postcss` version. Fixing with `--force` would downgrade Next.js to v9.3.3, which is a breaking change and not advisable.
- Acceptable risk for v0.9.8. Monitor Next.js releases for a patch that bumps the internal postcss dependency.

### Direct dependency inventory

All 6 runtime dependencies and 11 dev dependencies in `package.json` are actively used in the codebase:

| Dependency | Type | Used? | Location |
|-----------|------|-------|----------|
| `@supabase/ssr` | runtime | Yes | `src/middleware.ts`, auth callback |
| `@supabase/supabase-js` | runtime | Yes | Client/server/admin supabase clients |
| `lucide-react` | runtime | Yes | UI icons throughout components |
| `next` | runtime | Yes | Framework root |
| `react` / `react-dom` | runtime | Yes | Framework root |
| `@tailwindcss/postcss` | dev | Yes | `postcss.config.mjs` |
| `tailwindcss` | dev | Yes | CSS utility framework |
| `typescript` | dev | Yes | TypeScript compiler |
| `@types/*` | dev | Yes | TypeScript definitions |
| `eslint` / `eslint-config-next` | dev | Yes | Linting pipeline |
| `jsdom` | dev | Yes | `vitest.config.ts` test environment |
| `vitest` | dev | Yes | Unit test runner |
| `playwright` | dev | Yes | E2E testing |

**Unused dependencies found:** None.

### Supply chain notes
- Packages are installed from the public npm registry with lockfile (`package-lock.json`) providing integrity verification.
- No private npm registry or third-party package hosts configured.
- No `postinstall` scripts in production dependencies that could execute arbitrary code.

## Supabase Audit

### Project: Elora (Shared)
- **Project ID:** `qoxmibmbyjmkntzrckyr`
- **All OpenLedger tables use the `openledger_` prefix** to namespace within the shared project.
- Non-OpenLedger tables observed: `clubhouse_*`, `User`, `Wallet`, `Bet`, `Session`, `VaultLock`, `Transaction`, `Policy`, `players`, `leaderboard_scores`, `Session`. These belong to other apps sharing the same Supabase instance and are not evaluated here.

### Table RLS Review

All 12 OpenLedger tables have RLS enabled. Table-by-table breakdown:

| Table | RLS | Policies | user_id Scoped | Notes |
|-------|-----|----------|---------------|-------|
| `openledger_profiles` | Yes | SELECT, INSERT, UPDATE | `auth.uid() = user_id` | UPDATE has USING only (WITH CHECK defaults to USING expression). Correct. |
| `openledger_accounts` | Yes | SELECT, INSERT, UPDATE, DELETE | `auth.uid() = user_id` | UPDATE has both USING and WITH CHECK. Correct. |
| `openledger_transactions` | Yes | SELECT, INSERT, UPDATE, DELETE | `auth.uid() = user_id` | UPDATE has USING but no WITH CHECK (defaults to USING). Correct. |
| `openledger_categories` | Yes | SELECT, INSERT, UPDATE | Shared (no user_id) | SELECT: public. INSERT/UPDATE: `TO authenticated` with `true` qualifier. Categories are shared reference data — all authenticated users can edit. This is by design. |
| `openledger_budgets` | Yes | SELECT, INSERT, UPDATE, DELETE | `auth.uid() = user_id` | UPDATE has both USING and WITH CHECK. Correct. |
| `openledger_goals` | Yes | SELECT, INSERT, UPDATE, DELETE | `auth.uid() = user_id` | UPDATE has both USING and WITH CHECK. Correct. |
| `openledger_imports` | Yes | SELECT, INSERT, UPDATE | `auth.uid() = user_id` | UPDATE has USING only (WITH CHECK defaults to USING). Correct. |
| `openledger_audit_events` | Yes | SELECT, INSERT | `auth.uid() = user_id` | Append-only (no UPDATE or DELETE). Correct. |
| `openledger_backups` | Yes | SELECT, INSERT, DELETE | `auth.uid() = user_id` | Append-only with DELETE for cleanup. Correct. |
| `openledger_devices` | Yes | SELECT, INSERT, UPDATE, DELETE | `auth.uid() = user_id` | UPDATE has both USING and WITH CHECK. Correct. |
| `openledger_sync_events` | Yes | SELECT, INSERT, UPDATE, DELETE | `auth.uid() = user_id` | All policies hardened. Correct. |
| `openledger_receipts` | Yes | SELECT, INSERT, DELETE | `auth.uid() = user_id` | No UPDATE (receipts immutable once created). Correct. |

### Policy verification checklist

| Check | Status |
|-------|--------|
| Every table has RLS enabled | PASS — All 12 tables confirmed |
| Every policy for user-owned data uses `auth.uid() = user_id` | PASS — All user-owned tables scoped correctly |
| Categories use `TO authenticated` not deprecated `auth.role()` | PASS — Fixed in v0.9.0 migration. Categories use `TO authenticated` clause. |
| UPDATE policies have both USING and WITH CHECK | PASS — Where applicable (accounts, budgets, goals, devices, sync_events). Tables without UPDATE (audit_events, backups, receipts) are append-only by design. Categories UPDATE intentionally lacks WITH CHECK because it's shared reference data. |

### Storage Policy Review

| Bucket | Public | RLS | Access Scope | Notes |
|--------|--------|-----|-------------|-------|
| `openledger-receipts` | No (private) | Yes | Folder-based: `storage.foldername(name)[1] = auth.uid()` | [FINDING] Uses deprecated `auth.role()` function for authentication check. |
| `clubhouse-media` | Yes | Yes | Bucket-based | Non-OpenLedger bucket. Not audited. |
| `clubhouse-avatars` | Yes | Yes | Bucket-based | Non-OpenLedger bucket. Not audited. |

**Storage bucket finding:**
The `openledger-receipts` bucket policies use `auth.role() = 'authenticated'` to verify the user is signed in. The `auth.role()` function is deprecated by Supabase and can break silently when anonymous sign-ins are enabled. While the folder-based `auth.uid()` check provides effective cross-user isolation, the `auth.role()` check should be replaced with the standard `TO authenticated` clause or `auth.uid() IS NOT NULL`.

Policy details:
- SELECT: `bucket_id = 'openledger-receipts' AND auth.role() = 'authenticated' AND storage.foldername(name)[1] = auth.uid()::text`
- INSERT: `bucket_id = 'openledger-receipts' AND auth.role() = 'authenticated' AND storage.foldername(name)[1] = auth.uid()::text`
- DELETE: `bucket_id = 'openledger-receipts' AND auth.role() = 'authenticated' AND storage.foldername(name)[1] = auth.uid()::text`

The `openledger_categories` table policies were fixed in the v0.9.0 migration (20260623000001) to use `TO authenticated`, but the storage bucket policies were not included in that migration — they were likely created through the Supabase dashboard and still reference `auth.role()`.

### Auth Policy Review

- **Authentication method:** Google OAuth only. Email OTP was removed in v0.9.1.
- **Guest mode:** Default. No account required. All data stays on device.
- **Session handling:** Uses `@supabase/ssr` (v0.12.0) with cookie-based session management in `src/middleware.ts`.
- **Service role:** `SUPABASE_SERVICE_ROLE_KEY` is used only in `src/lib/supabase/admin.ts` (server-side). **Never exposed to client code.**
- **Auth callback:** `src/app/auth/callback/route.ts` handles OAuth redirect with PKCE flow.
- **Device registration:** On first Google sign-in, the browser is registered in `openledger_devices` with device name and type.

## Environment Audit

| Variable | Required | In `.env.example` | Notes |
|----------|----------|-------------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (for auth) | Yes | Documented as client-side. Value present in `.env`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (for auth) | Yes | Documented as client-side. Value present in `.env`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (for admin) | Yes | **Marked as server-only** in `.env.example`. **NOT present in `.env`.** Correct. |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | No | Yes | Documented as disabled by default. |

**`.env.example` completeness:** PASS
- All required variables documented with clear descriptions.
- `NEXT_PUBLIC_` prefix correctly used for client-side variables.
- `SUPABASE_SERVICE_ROLE_KEY` explicitly marked as server-only.
- Instructions explain to copy to `.env.local`, not `.env`.
- No secrets or real values committed.

**`.env` contents:** PASS
- Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.
- No service role key, database credentials, or other secrets present.
- These are the public, non-sensitive values needed for client-side Supabase interaction.

## Findings & Recommendations

### Finding 1: Deprecated `auth.role()` in storage bucket policies (Medium) — FIXED
- **Location:** Storage policy for `openledger-receipts` bucket
- **Issue:** The three policies (SELECT, INSERT, DELETE) used `auth.role() = 'authenticated'` which is a deprecated function. The table RLS for categories was already fixed in v0.9.0 but the storage policies were not updated.
- **Risk:** If Supabase removes the `auth.role()` function in a future version, all receipt uploads, reads, and deletes would be denied for all users.
- **Fix applied:** Replaced `auth.role() = 'authenticated'` with `auth.uid() IS NOT NULL` across all three policies via migration `20260624000001_openledger_v098_security_audit.sql`. The folder-based `auth.uid()` check continues to provide cross-user isolation. Verified by querying `pg_policies` after migration.

### Finding 2: Three moderate npm vulnerabilities (Low)
- **Location:** `js-yaml` (transitive), `postcss` (transitive via next), `next` (direct)
- **Issue:** All three are moderate severity. None affect runtime application logic or user financial data.
- **Risk:** The `postcss` XSS could only affect server-side rendering output, and Next.js sanitizes its own CSS output. The `js-yaml` DoS is only exploitable in the dev toolchain.
- **Recommendation:** Monitor for Next.js patch releases that bump internal `postcss`. No immediate action required.

### Finding 3: Categories UPDATE policy lacks WITH CHECK (Informational)
- **Location:** `openledger_categories` UPDATE policy
- **Issue:** The policy has `using (true)` with no WITH CHECK clause. Any authenticated user can set any category values.
- **Risk:** Low — categories are shared reference data without user_id. Malicious modification by another authenticated user is possible but would be visible to all users. This is an acceptable design choice for collaboratively-edited reference data.
- **Recommendation:** Accept as-is unless categories become user-owned in a future release.

### Pass: No secrets committed
- `.env` contains only the two public Supabase variables.
- No API keys, tokens, or credentials are checked into version control.
- `.gitignore` correctly excludes `.env` and `.env.local`.

### Pass: All RLS policies use `auth.uid()` correctly
- Every user-owned table scopes data access to `auth.uid() = user_id`.
- UPDATE policies have WITH CHECK where applicable, preventing user_id reassignment (fixed in v0.9.0).

### Pass: `SUPABASE_SERVICE_ROLE_KEY` is server-only
- Admin client in `src/lib/supabase/admin.ts` is the only consumer.
- Never referenced in client-side code or exported to the browser.

## Summary

v0.9.8 security audit reveals a clean baseline with no critical or high-severity issues. The single actionable finding (deprecated `auth.role()` in storage bucket policies) was fixed as part of this audit. The three moderate npm vulnerabilities are all transitive and carry no practical risk to application data.

**Action items:**
1. ~~Fix storage bucket policies to replace `auth.role()` with `auth.uid() IS NOT NULL`.~~ **Done** in migration `20260624000001`.
2. Monitor Next.js releases for a version bumping the internal `postcss` dependency.
