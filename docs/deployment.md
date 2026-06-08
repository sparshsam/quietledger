# Deployment

## Local Development

```bash
npm install
npm run dev
```

The MVP requires no database, environment variables, or backend. The entire application runs client-side with localStorage persistence.

## Production (Vercel)

```bash
npx vercel --prod
```

No environment variables are required for the local-only MVP. When hosted sync is added, Supabase or similar credentials will be needed.

## CSV Import Test Files

Sample CSV files for testing import are not included in the repository. You can use exported transaction CSVs from your bank, or create small test files with headers matching supported formats.

## Building

```bash
npm run build    # production build
npm run lint     # code quality
npm run typecheck  # TypeScript validation
```

## Browser Support

QuietLedger targets modern browsers. localStorage persistence may be cleared by browser settings, private browsing, or cleanup tools — export JSON backups regularly.
