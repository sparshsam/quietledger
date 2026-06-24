-- OpenLedger v0.9.9 — MCP Server Token Storage
-- Stores SHA-256 hashed access tokens for AI agent (MCP) authentication.
-- Raw token is shown once at creation and never stored.
-- Token prefix (first 10 chars) is stored for UI identification.

-- ============================================================
-- MCP TOKENS
-- ============================================================
create table if not exists openledger_mcp_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  token_hash  text not null,
  token_prefix text not null,
  last_used_at timestamptz,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);

create index if not exists idx_openledger_mcp_tokens_user on openledger_mcp_tokens(user_id);
create index if not exists idx_openledger_mcp_tokens_hash on openledger_mcp_tokens(token_hash);

-- ============================================================
-- RLS
-- ============================================================
alter table openledger_mcp_tokens enable row level security;

-- Users can view their own tokens (never expose token_hash)
create policy "Users can view own MCP tokens"
  on openledger_mcp_tokens for select
  using (auth.uid() = user_id);

-- Users can create their own tokens
create policy "Users can create own MCP tokens"
  on openledger_mcp_tokens for insert
  with check (auth.uid() = user_id);

-- Users can revoke (update) their own tokens
create policy "Users can revoke own MCP tokens"
  on openledger_mcp_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can delete their own tokens
create policy "Users can delete own MCP tokens"
  on openledger_mcp_tokens for delete
  using (auth.uid() = user_id);
