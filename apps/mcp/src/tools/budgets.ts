/**
 * Budget tools — list, get, create, update, delete budgets.
 *
 * Budgets set spending limits per category per month (e.g. "Groceries: $500
 * for 2026-06"). They're used for tracking spending against targets.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Client } from "../supabase.js";

export function registerBudgetTools(
  server: McpServer,
  getClient: () => Client,
  userId: string,
) {
  // ── LIST ────────────────────────────────────────
  server.tool(
    "list_budgets",
    "List all budgets for a given month. Returns category, amount, and budget ID. Use this to see what spending limits are set and compare against actual spending.",
    {
      month: z.string().optional().describe("Filter by month (YYYY-MM format, e.g. '2026-06'). Defaults to current month."),
    },
    async ({ month }) => {
      const targetMonth = month ?? new Date().toISOString().slice(0, 7);
      const { data, error } = await getClient()
        .from("openledger_budgets")
        .select("*")
        .eq("user_id", userId)
        .eq("month", targetMonth)
        .order("created_at");

      if (error) {
        throw new Error(`Failed to list budgets: ${error.message}`);
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }],
      };
    },
  );

  // ── GET ─────────────────────────────────────────
  server.tool(
    "get_budget",
    "Get a specific budget by its ID. Returns the category, month, amount, and creation date.",
    {
      budgetId: z.string().describe("The ID of the budget to retrieve"),
    },
    async ({ budgetId }) => {
      const { data, error } = await getClient()
        .from("openledger_budgets")
        .select("*")
        .eq("id", budgetId)
        .eq("user_id", userId)
        .single();

      if (error) {
        throw new Error("Budget not found or access denied");
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── CREATE ──────────────────────────────────────
  server.tool(
    "create_budget",
    "Create a monthly budget for a category. Requires a month (YYYY-MM), spending limit amount, and optional category ID. Use this to set spending targets.",
    {
      month: z.string().describe("The budget month in YYYY-MM format (e.g. '2026-06')"),
      amount: z.number().describe("The spending limit amount"),
      categoryId: z.string().optional().describe("Optional category ID to link this budget to a specific category"),
    },
    async ({ month, amount, categoryId }) => {
      const c = getClient() as any;
      const { data, error } = await c
        .from("openledger_budgets")
        .insert({
          month,
          amount,
          category_id: categoryId ?? null,
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create budget: ${error.message}`);
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── UPDATE ──────────────────────────────────────
  server.tool(
    "update_budget",
    "Update an existing budget's amount or category. Use this to adjust spending limits.",
    {
      budgetId: z.string().describe("The ID of the budget to update"),
      amount: z.number().optional().describe("New spending limit amount"),
      categoryId: z.string().optional().describe("New category ID"),
    },
    async ({ budgetId, amount, categoryId }) => {
      const { data: existing, error: checkError } = await getClient()
        .from("openledger_budgets")
        .select("id")
        .eq("id", budgetId)
        .eq("user_id", userId)
        .single();

      if (checkError || !existing) {
        throw new Error("Budget not found or access denied");
      }

      const updates: Record<string, unknown> = {};
      if (amount !== undefined) updates.amount = amount;
      if (categoryId !== undefined) updates.category_id = categoryId;

      if (Object.keys(updates).length === 0) {
        return {
          content: [{ type: "text" as const, text: "No fields provided to update." }],
        };
      }

      const c = getClient() as any;
      const { data, error } = await c
        .from("openledger_budgets")
        .update(updates)
        .eq("id", budgetId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update budget: ${error.message}`);
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── DELETE ──────────────────────────────────────
  server.tool(
    "delete_budget",
    "Delete a budget by its ID. This removes the spending limit permanently. Use this to remove outdated or incorrect budgets.",
    {
      budgetId: z.string().describe("The ID of the budget to delete"),
    },
    async ({ budgetId }) => {
      const { data: existing, error: checkError } = await getClient()
        .from("openledger_budgets")
        .select("id")
        .eq("id", budgetId)
        .eq("user_id", userId)
        .single();

      if (checkError || !existing) {
        throw new Error("Budget not found or access denied");
      }

      const { error } = await getClient()
        .from("openledger_budgets")
        .delete()
        .eq("id", budgetId);

      if (error) {
        throw new Error(`Failed to delete budget: ${error.message}`);
      }
      return {
        content: [{ type: "text" as const, text: `Budget ${budgetId} deleted successfully.` }],
      };
    },
  );
}
