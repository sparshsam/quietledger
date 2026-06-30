# Deployment

Deploys automatically from `main` to Vercel.

[https://ledger.kovina.org](https://ledger.kovina.org)

```bash
npx vercel --prod
```

## Required Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | For MCP token auth (server-only) |
