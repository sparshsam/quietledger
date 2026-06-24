/**
 * Shared tool registration — used by both stdio (local) and HTTP (Vercel) transports.
 *
 * Registers all 30 tools on a given McpServer, scoped to the provided userId.
 */
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Client } from "./supabase.js";
import { registerAccountTools } from "./tools/accounts.js";
import { registerTransactionTools } from "./tools/transactions.js";
import { registerCategoryTools } from "./tools/categories.js";
import { registerBudgetTools } from "./tools/budgets.js";
import { registerGoalTools } from "./tools/goals.js";
import { registerDashboardTools } from "./tools/dashboard.js";
import { registerSearchTools } from "./tools/search.js";

export function registerAllTools(
  server: McpServer,
  getClient: () => Client,
  userId: string,
) {
  registerAccountTools(server, getClient, userId);
  registerTransactionTools(server, getClient, userId);
  registerCategoryTools(server, getClient, userId);
  registerBudgetTools(server, getClient, userId);
  registerGoalTools(server, getClient, userId);
  registerDashboardTools(server, getClient, userId);
  registerSearchTools(server, getClient, userId);
}
