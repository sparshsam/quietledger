/**
 * Account tools — list, get, create, update, delete accounts.
 *
 * Accounts are the core financial entities (chequing, savings, credit card, etc.)
 * that hold balance entries.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Client } from "../supabase.js";

const ACCOUNT_KINDS = [
  "chequing", "savings", "cash", "credit-card", "loan", "investment", "other",
] as const;

export function registerAccountTools(
  server: McpServer,
  getClient: () => Client,
  userId: string,
) {
  // ── LIST ────────────────────────────────────────
  server.tool(
    "list_accounts",
    "List all financial accounts belonging to the user. Returns account name, type (chequing/savings/credit-card/etc.), current balance, currency, and whether the account is archived. Use this to see an overview of all accounts on the ledger.",
    {
      includeArchived: z.boolean().optional().default(false)
        .describe("Set to true to include archived (closed) accounts"),
    },
    async ({ includeArchived }) => {
      let query = getClient()
        .from("openledger_accounts")
        .select("*")
        .eq("user_id", userId);

      if (!includeArchived) {
        query = query.is("archived_at", null);
      }

      const { data, error } = await query.order("created_at");

      if (error) {
        throw new Error(`Failed to list accounts: ${error.message}`);
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }],
      };
    },
  );

  // ── GET ─────────────────────────────────────────
  server.tool(
    "get_account",
    "Get detailed information about a specific account by its ID. Returns name, kind, balance, currency, and metadata. Use this when you need full account details.",
    {
      accountId: z.string().describe("The ID of the account to retrieve"),
    },
    async ({ accountId }) => {
      const { data, error } = await getClient()
        .from("openledger_accounts")
        .select("*")
        .eq("id", accountId)
        .eq("user_id", userId)
        .single();

      if (error) {
        throw new Error(
          `Account not found or access denied. Verify the account ID is correct.`,
        );
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── CREATE ──────────────────────────────────────
  server.tool(
    "create_account",
    "Create a new financial account. Requires a name and account type (chequing, savings, cash, credit-card, loan, investment, other). Optionally set an opening balance and currency.",
    {
      name: z.string().min(1).describe("The name of the account (e.g. 'Chase Checking', 'Travel Credit Card')"),
      kind: z.enum(ACCOUNT_KINDS).describe("The type of account"),
      subtitle: z.string().optional().default("").describe("A short description or institution name"),
      balance: z.number().optional().default(0).describe("Opening balance (defaults to 0)"),
      currency: z.string().optional().default("CAD").describe("Currency code (defaults to CAD)"),
    },
    async ({ name, kind, subtitle, balance, currency }) => {
      const c = getClient() as any;
      const { data, error } = await c
        .from("openledger_accounts")
        .insert({
          name,
          kind,
          subtitle: subtitle ?? "",
          balance,
          currency,
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create account: ${error.message}`);
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── UPDATE ──────────────────────────────────────
  server.tool(
    "update_account",
    "Update an existing account's fields. Only the fields you provide will be changed. Use this to rename an account, change its type, adjust its balance, or archive it.",
    {
      accountId: z.string().describe("The ID of the account to update"),
      name: z.string().optional().describe("New name for the account"),
      kind: z.enum(ACCOUNT_KINDS).optional().describe("New account type"),
      subtitle: z.string().optional().describe("New description or institution name"),
      balance: z.number().optional().describe("New balance value"),
      currency: z.string().optional().describe("New currency code"),
    },
    async ({ accountId, name, kind, subtitle, balance, currency }) => {
      // Ownership check
      const { data: existing, error: checkError } = await getClient()
        .from("openledger_accounts")
        .select("id")
        .eq("id", accountId)
        .eq("user_id", userId)
        .single();

      if (checkError || !existing) {
        throw new Error("Account not found or access denied");
      }

      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (kind !== undefined) updates.kind = kind;
      if (subtitle !== undefined) updates.subtitle = subtitle;
      if (balance !== undefined) updates.balance = balance;
      if (currency !== undefined) updates.currency = currency;

      if (Object.keys(updates).length === 0) {
        return {
          content: [{ type: "text" as const, text: "No fields provided to update." }],
        };
      }

      const c = getClient() as any;
      const { data, error } = await c
        .from("openledger_accounts")
        .update(updates)
        .eq("id", accountId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update account: ${error.message}`);
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── DELETE (archive) ────────────────────────────
  server.tool(
    "archive_account",
    "Archive (soft-delete) an account. The account is not permanently removed and can be viewed by listing accounts with includeArchived set to true. Use this when closing an account rather than deleting it permanently.",
    {
      accountId: z.string().describe("The ID of the account to archive"),
    },
    async ({ accountId }) => {
      const { data: existing, error: checkError } = await getClient()
        .from("openledger_accounts")
        .select("id")
        .eq("id", accountId)
        .eq("user_id", userId)
        .single();

      if (checkError || !existing) {
        throw new Error("Account not found or access denied");
      }

      const c2 = getClient() as any;
      const { error } = await c2
        .from("openledger_accounts")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", accountId);

      if (error) {
        throw new Error(`Failed to archive account: ${error.message}`);
      }
      return {
        content: [{ type: "text" as const, text: `Account ${accountId} archived successfully.` }],
      };
    },
  );

  // ── UNARCHIVE ───────────────────────────────────
  server.tool(
    "unarchive_account",
    "Restore a previously archived account, making it active again.",
    {
      accountId: z.string().describe("The ID of the account to restore"),
    },
    async ({ accountId }) => {
      const { data: existing, error: checkError } = await getClient()
        .from("openledger_accounts")
        .select("id")
        .eq("id", accountId)
        .eq("user_id", userId)
        .single();

      if (checkError || !existing) {
        throw new Error("Account not found or access denied");
      }

      const c3 = getClient() as any;
      const { error } = await c3
        .from("openledger_accounts")
        .update({ archived_at: null })
        .eq("id", accountId);

      if (error) {
        throw new Error(`Failed to unarchive account: ${error.message}`);
      }
      return {
        content: [{ type: "text" as const, text: `Account ${accountId} restored successfully.` }],
      };
    },
  );
}
