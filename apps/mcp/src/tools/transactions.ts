/**
 * Transaction tools — list, get, create, update, delete transactions.
 *
 * Transactions are the core ledger entries, linked to accounts and categorized
 * for budgeting and reporting.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Client } from "../supabase.js";

export function registerTransactionTools(
  server: McpServer,
  getClient: () => Client,
  userId: string,
) {
  // ── LIST ────────────────────────────────────────
  server.tool(
    "list_transactions",
    "List financial transactions with optional date range, account, and category filters. Returns date, description, merchant, amount, category, and account. Ordered by date descending (most recent first). Use this to browse recent activity or filter by specific criteria.",
    {
      accountId: z.string().optional().describe("Filter by account ID"),
      category: z.string().optional().describe("Filter by category name (e.g. 'Groceries', 'Rent')"),
      startDate: z.string().optional().describe("Start date for range filter (YYYY-MM-DD format)"),
      endDate: z.string().optional().describe("End date for range filter (YYYY-MM-DD format)"),
      limit: z.number().optional().default(50).describe("Maximum number of transactions to return (default 50, max 200)"),
      offset: z.number().optional().default(0).describe("Number of transactions to skip (for pagination)"),
    },
    async ({ accountId, category, startDate, endDate, limit, offset }) => {
      let query = getClient()
        .from("openledger_transactions")
        .select("*")
        .eq("user_id", userId);

      if (accountId) query = query.eq("account_id", accountId);
      if (category) query = query.eq("category", category);
      if (startDate) query = query.gte("date", startDate);
      if (endDate) query = query.lte("date", endDate);

      const cappedLimit = Math.min(limit ?? 50, 200);

      const { data, error } = await query
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(offset ?? 0, (offset ?? 0) + cappedLimit - 1);

      if (error) {
        throw new Error(`Failed to list transactions: ${error.message}`);
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }],
      };
    },
  );

  // ── GET ─────────────────────────────────────────
  server.tool(
    "get_transaction",
    "Get full details of a single transaction by its ID. Returns date, description, merchant, amount, category, notes, account ID, and timestamps.",
    {
      transactionId: z.string().describe("The ID of the transaction to retrieve"),
    },
    async ({ transactionId }) => {
      const { data, error } = await getClient()
        .from("openledger_transactions")
        .select("*")
        .eq("id", transactionId)
        .eq("user_id", userId)
        .single();

      if (error) {
        throw new Error(
          "Transaction not found or access denied. Verify the transaction ID is correct.",
        );
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── CREATE ──────────────────────────────────────
  server.tool(
    "create_transaction",
    "Record a new financial transaction. Requires an account ID, date, description, amount, and category. Positive amounts are income, negative amounts are expenses. Use this to log a purchase, deposit, transfer, or any financial event.",
    {
      accountId: z.string().describe("The ID of the account this transaction belongs to"),
      date: z.string().describe("Transaction date in YYYY-MM-DD format"),
      description: z.string().min(1).describe("A short description of the transaction"),
      amount: z.number().describe("The amount (positive for income/deposits, negative for expenses/withdrawals)"),
      category: z.string().describe("The category name (e.g. 'Groceries', 'Rent', 'Income'). Use list_categories to see available options."),
      merchant: z.string().optional().describe("The merchant or payee name"),
      note: z.string().optional().describe("Optional private note about this transaction"),
    },
    async ({ accountId, date, description, amount, category, merchant, note }) => {
      const c = getClient() as any;
      const { data, error } = await c
        .from("openledger_transactions")
        .insert({
          account_id: accountId,
          date,
          description,
          amount,
          category,
          merchant: merchant ?? null,
          note: note ?? null,
          source: "manual",
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create transaction: ${error.message}`);
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── UPDATE ──────────────────────────────────────
  server.tool(
    "update_transaction",
    "Update an existing transaction's fields. Only the fields you provide are changed. Use this to correct an amount, recategorize, edit the description, or add notes.",
    {
      transactionId: z.string().describe("The ID of the transaction to update"),
      date: z.string().optional().describe("New date in YYYY-MM-DD format"),
      description: z.string().optional().describe("New description"),
      amount: z.number().optional().describe("New amount"),
      category: z.string().optional().describe("New category name"),
      merchant: z.string().optional().describe("New merchant name"),
      note: z.string().optional().describe("New note text"),
      accountId: z.string().optional().describe("New account ID (to move the transaction to a different account)"),
    },
    async ({ transactionId, date, description, amount, category, merchant, note, accountId }) => {
      const { data: existing, error: checkError } = await getClient()
        .from("openledger_transactions")
        .select("id")
        .eq("id", transactionId)
        .eq("user_id", userId)
        .single();

      if (checkError || !existing) {
        throw new Error("Transaction not found or access denied");
      }

      const updates: Record<string, unknown> = {};
      if (date !== undefined) updates.date = date;
      if (description !== undefined) updates.description = description;
      if (amount !== undefined) updates.amount = amount;
      if (category !== undefined) updates.category = category;
      if (merchant !== undefined) updates.merchant = merchant;
      if (note !== undefined) updates.note = note;
      if (accountId !== undefined) updates.account_id = accountId;

      if (Object.keys(updates).length === 0) {
        return {
          content: [{ type: "text" as const, text: "No fields provided to update." }],
        };
      }

      const c = getClient() as any;
      const { data, error } = await c
        .from("openledger_transactions")
        .update(updates)
        .eq("id", transactionId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update transaction: ${error.message}`);
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── DELETE ──────────────────────────────────────
  server.tool(
    "delete_transaction",
    "Permanently delete a transaction by its ID. This action cannot be undone. Use this to remove incorrect or duplicate entries.",
    {
      transactionId: z.string().describe("The ID of the transaction to delete permanently"),
    },
    async ({ transactionId }) => {
      const { data: existing, error: checkError } = await getClient()
        .from("openledger_transactions")
        .select("id")
        .eq("id", transactionId)
        .eq("user_id", userId)
        .single();

      if (checkError || !existing) {
        throw new Error("Transaction not found or access denied");
      }

      const { error } = await getClient()
        .from("openledger_transactions")
        .delete()
        .eq("id", transactionId);

      if (error) {
        throw new Error(`Failed to delete transaction: ${error.message}`);
      }
      return {
        content: [{ type: "text" as const, text: `Transaction ${transactionId} deleted successfully.` }],
      };
    },
  );
}
