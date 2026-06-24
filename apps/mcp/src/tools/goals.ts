/**
 * Goal tools — list, get, create, update, delete, and contribute to goals.
 *
 * Goals are savings targets (e.g. "Emergency Fund: $10,000 by Dec 2026").
 * They track a target amount, current progress, and deadline.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Client } from "../supabase.js";

const GOAL_STATUSES = ["active", "completed", "cancelled"] as const;

export function registerGoalTools(
  server: McpServer,
  getClient: () => Client,
  userId: string,
) {
  // ── LIST ────────────────────────────────────────
  server.tool(
    "list_goals",
    "List all savings goals. Returns name, target amount, current progress, deadline, and status (active/completed/cancelled). Use this to see goal progress and identify goals that need contributions.",
    {
      status: z.enum(GOAL_STATUSES).optional().describe("Filter by status: active, completed, or cancelled"),
      includeCompleted: z.boolean().optional().default(false).describe("Set to true to include completed and cancelled goals"),
    },
    async ({ status, includeCompleted }) => {
      let query = getClient()
        .from("openledger_goals")
        .select("*")
        .eq("user_id", userId);

      if (status) {
        query = query.eq("status", status);
      } else if (!includeCompleted) {
        query = query.eq("status", "active");
      }

      const { data, error } = await query.order("created_at");

      if (error) {
        throw new Error(`Failed to list goals: ${error.message}`);
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }],
      };
    },
  );

  // ── GET ─────────────────────────────────────────
  server.tool(
    "get_goal",
    "Get detailed information about a specific savings goal by its ID. Returns name, target and current amounts, deadline, status, and timestamps.",
    {
      goalId: z.string().describe("The ID of the goal to retrieve"),
    },
    async ({ goalId }) => {
      const { data, error } = await getClient()
        .from("openledger_goals")
        .select("*")
        .eq("id", goalId)
        .eq("user_id", userId)
        .single();

      if (error) {
        throw new Error("Goal not found or access denied");
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── CREATE ──────────────────────────────────────
  server.tool(
    "create_goal",
    "Create a new savings goal. Requires a name and target amount. Optionally set a deadline and starting amount. Use this to set new financial targets like 'Emergency Fund' or 'Vacation 2026'.",
    {
      name: z.string().min(1).describe("The name of the goal (e.g. 'Emergency Fund', 'Hawaii Vacation')"),
      targetAmount: z.number().positive().describe("The target savings amount to reach"),
      currentAmount: z.number().optional().default(0).describe("Optional starting amount already saved"),
      deadline: z.string().optional().describe("Optional target deadline date in YYYY-MM-DD format"),
    },
    async ({ name, targetAmount, currentAmount, deadline }) => {
      const c = getClient() as any;
      const { data, error } = await c
        .from("openledger_goals")
        .insert({
          name,
          target_amount: targetAmount,
          current_amount: currentAmount ?? 0,
          deadline: deadline ?? null,
          status: "active",
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create goal: ${error.message}`);
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── UPDATE ──────────────────────────────────────
  server.tool(
    "update_goal",
    "Update a savings goal's name, target amount, deadline, or status. Use this to adjust targets or mark a goal as completed or cancelled.",
    {
      goalId: z.string().describe("The ID of the goal to update"),
      name: z.string().optional().describe("New name for the goal"),
      targetAmount: z.number().optional().describe("New target savings amount"),
      deadline: z.string().nullable().optional().describe("New deadline (YYYY-MM-DD) or pass null to remove the deadline"),
      status: z.enum(GOAL_STATUSES).optional().describe("New status: active, completed, or cancelled"),
    },
    async ({ goalId, name, targetAmount, deadline, status }) => {
      const { data: existing, error: checkError } = await getClient()
        .from("openledger_goals")
        .select("id")
        .eq("id", goalId)
        .eq("user_id", userId)
        .single();

      if (checkError || !existing) {
        throw new Error("Goal not found or access denied");
      }

      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (targetAmount !== undefined) updates.target_amount = targetAmount;
      if (deadline !== undefined) updates.deadline = deadline;
      if (status !== undefined) updates.status = status;

      if (Object.keys(updates).length === 0) {
        return {
          content: [{ type: "text" as const, text: "No fields provided to update." }],
        };
      }

      const c = getClient() as any;
      const { data, error } = await c
        .from("openledger_goals")
        .update(updates)
        .eq("id", goalId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update goal: ${error.message}`);
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── CONTRIBUTE ──────────────────────────────────
  server.tool(
    "contribute_to_goal",
    "Add a contribution amount to a savings goal, increasing its current progress. Use this when you want to record saving money toward a goal.",
    {
      goalId: z.string().describe("The ID of the goal to contribute to"),
      amount: z.number().positive().describe("The amount to add to the goal's current progress"),
    },
    async ({ goalId, amount }) => {
      const { data: goal, error: getError } = await getClient()
        .from("openledger_goals")
        .select("*")
        .eq("id", goalId)
        .eq("user_id", userId)
        .single();

      if (getError || !goal) {
        throw new Error("Goal not found or access denied");
      }

      const newAmount = (goal as { current_amount: number }).current_amount + amount;
      const newStatus = newAmount >= (goal as { target_amount: number }).target_amount
        ? "completed"
        : "active";

      const c = getClient() as any;
      const { data, error } = await c
        .from("openledger_goals")
        .update({
          current_amount: newAmount,
          status: newStatus,
        })
        .eq("id", goalId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to contribute to goal: ${error.message}`);
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── DELETE ──────────────────────────────────────
  server.tool(
    "delete_goal",
    "Permanently delete a savings goal by its ID. This action cannot be undone. Use this to remove goals that are no longer relevant.",
    {
      goalId: z.string().describe("The ID of the goal to delete"),
    },
    async ({ goalId }) => {
      const { data: existing, error: checkError } = await getClient()
        .from("openledger_goals")
        .select("id")
        .eq("id", goalId)
        .eq("user_id", userId)
        .single();

      if (checkError || !existing) {
        throw new Error("Goal not found or access denied");
      }

      const { error } = await getClient()
        .from("openledger_goals")
        .delete()
        .eq("id", goalId);

      if (error) {
        throw new Error(`Failed to delete goal: ${error.message}`);
      }
      return {
        content: [{ type: "text" as const, text: `Goal ${goalId} deleted successfully.` }],
      };
    },
  );
}
