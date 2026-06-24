/**
 * Search tools — cross-entity search.
 *
 * Allows agents to search across transactions, accounts, and categories
 * using a free-text query. Transactions are searched by description,
 * merchant, note, and category.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Client } from "../supabase.js";

export function registerSearchTools(
  server: McpServer,
  getClient: () => Client,
  userId: string,
) {
  // ── SEARCH TRANSACTIONS ─────────────────────────
  server.tool(
    "search_transactions",
    "Search transactions by keyword matching against description, merchant, notes, and category. Use this when you need to find a specific transaction but only remember partial details.",
    {
      query: z.string().min(1).describe("Search keyword to match against transaction descriptions, merchants, notes, and categories"),
      limit: z.number().optional().default(30).describe("Maximum number of results (default 30, max 100)"),
    },
    async ({ query, limit }) => {
      const cappedLimit = Math.min(limit ?? 30, 100);
      const q = `%${query}%`;

      const { data, error } = await getClient()
        .from("openledger_transactions")
        .select("*")
        .eq("user_id", userId)
        .or(`description.ilike.${q},merchant.ilike.${q},note.ilike.${q},category.ilike.${q}`)
        .order("date", { ascending: false })
        .limit(cappedLimit);

      if (error) {
        throw new Error(`Failed to search transactions: ${error.message}`);
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }],
      };
    },
  );

  // ── SEARCH EVERYTHING ───────────────────────────
  server.tool(
    "search_everything",
    "Search across all your data — transactions, accounts, and goals — by keyword. Use this as a unified search to find anything in your financial records.",
    {
      query: z.string().min(1).describe("Search keyword to match against descriptions, names, and notes across all entities"),
    },
    async ({ query }) => {
      const q = `%${query}%`;

      const [txResult, acctResult, goalsResult] = await Promise.all([
        getClient()
          .from("openledger_transactions")
          .select("*")
          .eq("user_id", userId)
          .or(`description.ilike.${q},merchant.ilike.${q},note.ilike.${q},category.ilike.${q}`)
          .order("date", { ascending: false })
          .limit(30),
        getClient()
          .from("openledger_accounts")
          .select("*")
          .eq("user_id", userId)
          .or(`name.ilike.${q},subtitle.ilike.${q}`)
          .order("name")
          .limit(20),
        getClient()
          .from("openledger_goals")
          .select("*")
          .eq("user_id", userId)
          .ilike("name", q)
          .order("name")
          .limit(20),
      ]);

      const results: Record<string, unknown[]> = {
        transactions: [],
        accounts: [],
        goals: [],
      };

      if (!txResult.error) results.transactions = txResult.data ?? [];
      if (!acctResult.error) results.accounts = acctResult.data ?? [];
      if (!goalsResult.error) results.goals = goalsResult.data ?? [];

      return {
        content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
      };
    },
  );
}
