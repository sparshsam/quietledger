/**
 * Category tools — list and search categories.
 *
 * Categories are shared reference data (not user-owned). They define the
 * classification system for transactions and budgets (e.g. Groceries, Rent,
 * Income, Transport).
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Client } from "../supabase.js";

export function registerCategoryTools(
  server: McpServer,
  getClient: () => Client,
  _userId: string,
) {
  // ── LIST ────────────────────────────────────────
  server.tool(
    "list_categories",
    "List all transaction categories. Categories classify transactions for budgeting and reporting. Each category has a name, optional hex color, and optional icon name. Use this to see available categories before creating or updating a transaction.",
    {},
    async () => {
      const { data, error } = await getClient()
        .from("openledger_categories")
        .select("*")
        .order("name");

      if (error) {
        throw new Error(`Failed to list categories: ${error.message}`);
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }],
      };
    },
  );

  // ── SEARCH ──────────────────────────────────────
  server.tool(
    "search_categories",
    "Search categories by name. Use this when you need to find the exact category name to use when creating or updating a transaction.",
    {
      query: z.string().describe("Search term to find matching categories"),
    },
    async ({ query }) => {
      const { data, error } = await getClient()
        .from("openledger_categories")
        .select("*")
        .ilike("name", `%${query}%`)
        .order("name");

      if (error) {
        throw new Error(`Failed to search categories: ${error.message}`);
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }],
      };
    },
  );
}
