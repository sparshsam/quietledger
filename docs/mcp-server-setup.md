# OpenLedger MCP Server — Setup Guide

> Connect AI agents to your OpenLedger personal finance data.
>
> **Supported agents:** Claude Code, Claude Desktop, ChatGPT, Cursor, Hermes, any MCP-compatible client.

## Overview

The OpenLedger MCP (Model Context Protocol) server allows AI agents to read and write your financial data — accounts, transactions, budgets, goals, and more — through natural language.

```
You → "Show me my spending on groceries this month"
Agent → calls list_transactions(category:"Groceries")
Agent → "You spent $320 on groceries in June 2026."
```

```
You → "Add a $45 dinner expense to my credit card"
Agent → calls create_transaction(...)
Agent → "Done! $45 dinner added to your Chase card."
```

## Prerequisites

- A signed-in OpenLedger account (Google auth)
- An MCP-compatible AI agent (Claude Code, etc.)

## Step 1: Generate an Access Token

1. Open OpenLedger → **Settings** → **MCP Access**
2. Enter a token name (e.g. "Claude Code Laptop")
3. Click **Create Token**
4. **Copy the token immediately** — it is shown only once. It starts with `ol_` followed by 64 hex characters.

> ⚠️ Treat this token like a password. Anyone with the token can read and write your financial data.

## Step 2: Configure Your AI Agent

The MCP server is hosted at `https://openledgerbysparsh.vercel.app/api/mcp`. You just need the URL and your token — no local setup required.

### Claude Code

Add this to your Claude Code configuration:

```json
// ~/.claude/settings.json (global) or .claude/settings.local.json (project)
{
  "mcpServers": {
    "openledger": {
      "url": "https://openledgerbysparsh.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer ol_<your-token-from-step-1>"
      }
    }
  }
}
```

### Claude Desktop

```json
// ~/.claude/claude_desktop_config.json
{
  "mcpServers": {
    "openledger": {
      "url": "https://openledgerbysparsh.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer ol_<your-token-from-step-1>"
      }
    }
  }
}
```

### Cursor

1. Settings → MCP → Add Server
2. URL: `https://openledgerbysparsh.vercel.app/api/mcp`
3. Headers: `{ "Authorization": "Bearer ol_<your-token>" }`

### ChatGPT (MCP support)

Follow your client's instructions for configuring a Streamable HTTP MCP server with the URL above and Authorization header.

---

> **For local development:** If you want to run the MCP server locally instead (e.g., for debugging), see the `apps/mcp/` package. Build with `cd apps/mcp && npm install && npm run build`, then configure your agent with stdio transport + env vars for `OPENLEDGER_ACCESS_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.

## Step 3: Build the Server

From the project root:

```bash
cd apps/mcp
npm install
npm run build
```

## Step 4: Verify

Run the server to confirm it starts and authenticates:

```bash
OPENLEDGER_ACCESS_TOKEN="ol_<your-token>" \
NEXT_PUBLIC_SUPABASE_URL="https://qoxmibmbyjmkntzrckyr.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<your-key>" \
node dist/index.js
```

If the server starts without errors, your AI agent is ready to interact with OpenLedger.

## Available Tools

The MCP server exposes **30 tools** across 7 domains:

### Accounts (6 tools)
- `list_accounts` — View all accounts
- `get_account` — Get account details
- `create_account` — Add a new account
- `update_account` — Modify an account
- `archive_account` — Soft-delete an account
- `unarchive_account` — Restore an archived account

### Transactions (5 tools)
- `list_transactions` — Browse with filters (date range, account, category)
- `get_transaction` — Get transaction details
- `create_transaction` — Record a new transaction
- `update_transaction` — Edit a transaction
- `delete_transaction` — Permanently remove a transaction

### Categories (2 tools)
- `list_categories` — See all available categories
- `search_categories` — Find a category by name

### Budgets (4 tools)
- `list_budgets` — View monthly budgets
- `get_budget` — Get budget details
- `create_budget` — Set a monthly spending limit
- `update_budget` — Adjust budget amounts
- `delete_budget` — Remove a budget

### Goals (5 tools)
- `list_goals` — View savings goals
- `get_goal` — Get goal details
- `create_goal` — Create a new savings goal
- `update_goal` — Modify goal targets
- `contribute_to_goal` — Add money toward a goal
- `delete_goal` — Remove a goal

### Dashboard (4 tools)
- `get_account_summary` — Net worth and account breakdown
- `get_monthly_summary` — Income/expense totals by month
- `get_budget_vs_actual` — Budget adherence comparison
- `get_goals_progress` — Goal completion status

### Search (2 tools)
- `search_transactions` — Keyword search in transactions
- `search_everything` — Cross-entity search (transactions, accounts, goals)

## Example Prompts

Once connected, try asking your AI agent:

**Accounts & overview**
- "Show me all my accounts and their balances"
- "What's my total net worth?"

**Transactions & recording**
- "List my last 10 expenses"
- "How much did I spend on groceries this month?"
- "Add a $35 lunch expense to my chequing account, categorized as Food"
- "I returned a jacket I bought for $120 — record that as a refund"

**Budgets**
- "Show my budget vs actual spending for this month"
- "I want to limit dining out to $300 per month — set that budget"

**Goals**
- "What's my progress on my Emergency Fund goal?"
- "I saved another $500 toward my vacation goal"

**Search**
- "Find transactions related to 'Amazon' "
- "Search everything for 'rent' "

## Security Notes

- **Token storage:** MCP tokens are stored as SHA-256 hashes. The raw token is shown once at creation and cannot be retrieved again.
- **Service role:** The MCP server uses the Supabase service role key to bypass RLS. Every query enforces user isolation in application code using `.eq("user_id", userId)`. Missing this filter would be a data leak.
- **Token revocation:** Revoke a token from Settings → MCP Access at any time. Revoked tokens are immediately rejected.
- **Guest mode:** MCP tokens require a signed-in Google account. Guest mode data stays in localStorage and is not accessible via the MCP server.
