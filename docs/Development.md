# Development

## Prerequisites

- Node.js 20+
- npm
- Supabase account (optional, for cloud sync)

## Setup

```bash
git clone https://github.com/sparshsam/openledger.git
cd openledger
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app works fully without any environment variables.

### Optional: Supabase auth + cloud backup

Copy `.env.example` to `.env.local` and uncomment the Supabase variables to enable Google sign-in and cloud backup.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | For MCP token auth (server-only) |

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm run build` | Build for production |
