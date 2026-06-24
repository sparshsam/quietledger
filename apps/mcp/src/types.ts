// ── OpenLedger MCP Server — Database Types ──────────────
// Mirrors src/lib/supabase/database.types.ts for the MCP server
// which runs independently from the main app.

export interface DbProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbAccount {
  id: string;
  user_id: string | null;
  name: string;
  kind: string;
  subtitle: string;
  balance: number;
  currency: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTransaction {
  id: string;
  user_id: string | null;
  account_id: string;
  date: string;
  description: string;
  merchant: string | null;
  amount: number;
  category: string;
  note: string | null;
  source: string;
  import_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCategory {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

export interface DbBudget {
  id: string;
  user_id: string | null;
  category_id: string | null;
  month: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface DbGoal {
  id: string;
  user_id: string | null;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DbDevice {
  id: string;
  user_id: string;
  device_name: string;
  device_type: string | null;
  device_id: string;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbSyncEvent {
  id: string;
  user_id: string;
  device_id: string | null;
  sync_type: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  records_synced: number;
  created_at: string;
}

export interface DbReceipt {
  id: string;
  user_id: string;
  transaction_id: string | null;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  storage_url: string;
  created_at: string;
}

export interface DbMcpToken {
  id: string;
  user_id: string;
  name: string;
  token_hash: string;
  token_prefix: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface Database {
  public: {
    Tables: {
      openledger_profiles: { Row: DbProfile };
      openledger_accounts: { Row: DbAccount };
      openledger_transactions: { Row: DbTransaction };
      openledger_categories: { Row: DbCategory };
      openledger_budgets: { Row: DbBudget };
      openledger_goals: { Row: DbGoal };
      openledger_devices: { Row: DbDevice };
      openledger_sync_events: { Row: DbSyncEvent };
      openledger_receipts: { Row: DbReceipt };
      openledger_mcp_tokens: { Row: DbMcpToken };
    };
  };
}
