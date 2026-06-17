# Maintenance

## Update Cadence

QuietLedger does not follow a fixed release schedule. Releases are made when meaningful changes accumulate or a feature milestone is reached. See [VERSIONING.md](../VERSIONING.md) for version semantics.

## Dependency Management

- Dependencies are managed via npm with a `package-lock.json` lockfile.
- Dependabot is configured (`.github/dependabot.yml`) to open weekly PRs for npm and GitHub Actions dependency updates.
- Major version bumps in dependencies are ignored by Dependabot and require manual review.
- Run `npm audit` periodically (the CI pipeline runs `npm audit --audit-level=high` with `continue-on-error`).

## CI/CD

The CI pipeline (`.github/workflows/ci.yml`) runs on push to `main` and on all pull requests targeting `main`:

1. `npm ci` — clean install
2. `npm audit --audit-level=high` — dependency security scan
3. `npm run lint` — ESLint
4. `npm run typecheck` — TypeScript type checking
5. `npm run build` — production build

## Local Development Checks

Before opening a pull request, run:

```bash
npm run lint
npm run typecheck
npm run build
```

## Security Maintenance

For vulnerability reporting, see [SECURITY.md](../SECURITY.md). The current MVP has no backend, no user accounts, and no server-side storage, which limits the attack surface. If hosted sync is added, security maintenance procedures will be updated accordingly.

## Schema Migrations

The local storage schema is versioned (currently `schemaVersion: 1`). Schema migrations are handled in `src/lib/data/persistence.ts`. JSON backup import attempts to fill missing fields from demo defaults where possible.

Old JSON backups should remain restorable as the app evolves — test with `Import JSON backup` after schema changes.
