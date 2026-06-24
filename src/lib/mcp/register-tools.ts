/**
 * Tool registration for the Vercel-hosted MCP server.
 * Mirrors apps/mcp/src/tools/ but imports from the main app's lib.
 */
import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Client } from "@/lib/supabase/mcp-auth";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Zod compatibility: v4 wraps .optional() differently ──
// MCP SDK expects Zod schema objects. zod v4 works with the same
// .string(), .number(), .enum(), .optional(), .default() API.

// ── Account tools ────────────────────────────────
const ACCOUNT_KINDS = [
  "chequing", "savings", "cash", "credit-card", "loan", "investment", "other",
] as const;

function registerAccountTools(
  server: McpServer,
  getClient: () => Client,
  userId: string,
) {
  server.tool(
    "list_accounts",
    "List all financial accounts belonging to the user. Returns account name, type (chequing/savings/credit-card/etc.), current balance, currency, and whether the account is archived.",
    {
      includeArchived: z.boolean().optional().default(false)
        .describe("Set to true to include archived accounts"),
    },
    async ({ includeArchived }) => {
      let query = getClient()
        .from("openledger_accounts")
        .select("*")
        .eq("user_id", userId);
      if (!includeArchived) query = query.is("archived_at", null);
      const { data, error } = await query.order("created_at");
      if (error) throw new Error(`Failed to list accounts: ${error.message}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }] };
    },
  );

  server.tool(
    "get_account",
    "Get detailed information about a specific account by its ID.",
    { accountId: z.string().describe("The ID of the account to retrieve") },
    async ({ accountId }) => {
      const { data, error } = await getClient()
        .from("openledger_accounts").select("*").eq("id", accountId)
        .eq("user_id", userId).single();
      if (error) throw new Error("Account not found or access denied");
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "create_account",
    "Create a new financial account.",
    {
      name: z.string().min(1).describe("Account name"),
      kind: z.enum(ACCOUNT_KINDS).describe("Account type"),
      subtitle: z.string().optional().default("").describe("Description or institution"),
      balance: z.number().optional().default(0).describe("Opening balance"),
      currency: z.string().optional().default("CAD").describe("Currency code"),
    },
    async ({ name, kind, subtitle, balance, currency }) => {
      const { data, error } = await (getClient() as DbClient)
        .from("openledger_accounts")
        .insert({ name, kind, subtitle, balance, currency, user_id: userId })
        .select().single();
      if (error) throw new Error(`Failed to create account: ${error.message}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "update_account",
    "Update an existing account's fields.",
    {
      accountId: z.string().describe("The ID of the account to update"),
      name: z.string().optional().describe("New name"),
      kind: z.enum(ACCOUNT_KINDS).optional().describe("New type"),
      subtitle: z.string().optional().describe("New description"),
      balance: z.number().optional().describe("New balance"),
      currency: z.string().optional().describe("New currency"),
    },
    async ({ accountId, name, kind, subtitle, balance, currency }) => {
      const { data: existing, error: checkError } = await getClient()
        .from("openledger_accounts").select("id").eq("id", accountId)
        .eq("user_id", userId).single();
      if (checkError || !existing) throw new Error("Account not found or access denied");
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (kind !== undefined) updates.kind = kind;
      if (subtitle !== undefined) updates.subtitle = subtitle;
      if (balance !== undefined) updates.balance = balance;
      if (currency !== undefined) updates.currency = currency;
      if (Object.keys(updates).length === 0) return { content: [{ type: "text" as const, text: "No fields provided." }] };
      const { data, error } = await (getClient() as DbClient)
        .from("openledger_accounts").update(updates).eq("id", accountId).select().single();
      if (error) throw new Error(`Failed to update account: ${error.message}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "archive_account",
    "Archive (soft-delete) an account. Not permanently removed.",
    { accountId: z.string().describe("The ID of the account to archive") },
    async ({ accountId }) => {
      const { data: existing, error: checkError } = await getClient()
        .from("openledger_accounts").select("id").eq("id", accountId)
        .eq("user_id", userId).single();
      if (checkError || !existing) throw new Error("Account not found or access denied");
      const { error } = await (getClient() as DbClient)
        .from("openledger_accounts").update({ archived_at: new Date().toISOString() }).eq("id", accountId);
      if (error) throw new Error(`Failed to archive account: ${error.message}`);
      return { content: [{ type: "text" as const, text: `Account ${accountId} archived.` }] };
    },
  );

  server.tool(
    "unarchive_account",
    "Restore a previously archived account.",
    { accountId: z.string().describe("The ID of the account to restore") },
    async ({ accountId }) => {
      const { data: existing, error: checkError } = await getClient()
        .from("openledger_accounts").select("id").eq("id", accountId)
        .eq("user_id", userId).single();
      if (checkError || !existing) throw new Error("Account not found or access denied");
      const { error } = await (getClient() as DbClient)
        .from("openledger_accounts").update({ archived_at: null }).eq("id", accountId);
      if (error) throw new Error(`Failed to unarchive account: ${error.message}`);
      return { content: [{ type: "text" as const, text: `Account ${accountId} restored.` }] };
    },
  );
}

// ── Transaction tools ────────────────────────────
function registerTransactionTools(
  server: McpServer,
  getClient: () => Client,
  userId: string,
) {
  server.tool(
    "list_transactions",
    "List transactions with optional filters. Returns date, description, merchant, amount, category, and account.",
    {
      accountId: z.string().optional().describe("Filter by account ID"),
      category: z.string().optional().describe("Filter by category"),
      startDate: z.string().optional().describe("Start date YYYY-MM-DD"),
      endDate: z.string().optional().describe("End date YYYY-MM-DD"),
      limit: z.number().optional().default(50).describe("Max results (max 200)"),
      offset: z.number().optional().default(0).describe("Pagination offset"),
    },
    async ({ accountId, category, startDate, endDate, limit, offset }) => {
      let q = getClient().from("openledger_transactions").select("*").eq("user_id", userId);
      if (accountId) q = q.eq("account_id", accountId);
      if (category) q = q.eq("category", category);
      if (startDate) q = q.gte("date", startDate);
      if (endDate) q = q.lte("date", endDate);
      const capped = Math.min(limit ?? 50, 200);
      const { data, error } = await q
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(offset ?? 0, (offset ?? 0) + capped - 1);
      if (error) throw new Error(`Failed to list transactions: ${error.message}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }] };
    },
  );

  server.tool(
    "get_transaction",
    "Get full details of a single transaction by ID.",
    { transactionId: z.string().describe("The ID of the transaction") },
    async ({ transactionId }) => {
      const { data, error } = await getClient()
        .from("openledger_transactions").select("*").eq("id", transactionId)
        .eq("user_id", userId).single();
      if (error) throw new Error("Transaction not found or access denied");
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "create_transaction",
    "Record a new transaction. Positive amounts = income, negative = expenses.",
    {
      accountId: z.string().describe("Account ID"),
      date: z.string().describe("Date YYYY-MM-DD"),
      description: z.string().min(1).describe("Description"),
      amount: z.number().describe("Amount (positive = income, negative = expense)"),
      category: z.string().describe("Category name. Use list_categories to see options."),
      merchant: z.string().optional().describe("Merchant name"),
      note: z.string().optional().describe("Optional note"),
    },
    async ({ accountId, date, description, amount, category, merchant, note }) => {
      const { data, error } = await (getClient() as DbClient)
        .from("openledger_transactions")
        .insert({ account_id: accountId, date, description, amount, category, merchant: merchant ?? null, note: note ?? null, source: "manual", user_id: userId })
        .select().single();
      if (error) throw new Error(`Failed to create transaction: ${error.message}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "update_transaction",
    "Update a transaction's fields.",
    {
      transactionId: z.string().describe("Transaction ID"),
      date: z.string().optional().describe("New date YYYY-MM-DD"),
      description: z.string().optional().describe("New description"),
      amount: z.number().optional().describe("New amount"),
      category: z.string().optional().describe("New category"),
      merchant: z.string().optional().describe("New merchant"),
      note: z.string().optional().describe("New note"),
      accountId: z.string().optional().describe("New account ID"),
    },
    async ({ transactionId, date, description, amount, category, merchant, note, accountId }) => {
      const { data: existing, error: checkError } = await getClient()
        .from("openledger_transactions").select("id").eq("id", transactionId)
        .eq("user_id", userId).single();
      if (checkError || !existing) throw new Error("Transaction not found or access denied");
      const u: Record<string, unknown> = {};
      if (date !== undefined) u.date = date;
      if (description !== undefined) u.description = description;
      if (amount !== undefined) u.amount = amount;
      if (category !== undefined) u.category = category;
      if (merchant !== undefined) u.merchant = merchant;
      if (note !== undefined) u.note = note;
      if (accountId !== undefined) u.account_id = accountId;
      if (Object.keys(u).length === 0) return { content: [{ type: "text" as const, text: "No fields provided." }] };
      const { data, error } = await (getClient() as DbClient)
        .from("openledger_transactions").update(u).eq("id", transactionId).select().single();
      if (error) throw new Error(`Failed to update transaction: ${error.message}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "delete_transaction",
    "Permanently delete a transaction.",
    { transactionId: z.string().describe("The ID of the transaction to delete") },
    async ({ transactionId }) => {
      const { data: existing, error: checkError } = await getClient()
        .from("openledger_transactions").select("id").eq("id", transactionId)
        .eq("user_id", userId).single();
      if (checkError || !existing) throw new Error("Transaction not found or access denied");
      const { error } = await (getClient() as DbClient)
        .from("openledger_transactions").delete().eq("id", transactionId);
      if (error) throw new Error(`Failed to delete transaction: ${error.message}`);
      return { content: [{ type: "text" as const, text: `Transaction ${transactionId} deleted.` }] };
    },
  );
}

// ── Category tools ──────────────────────────────
function registerCategoryTools(
  server: McpServer,
  getClient: () => Client,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string,
) {
  server.tool(
    "list_categories",
    "List all transaction categories. Each has a name, optional hex color and icon.",
    {},
    async () => {
      const { data, error } = await getClient()
        .from("openledger_categories").select("*").order("name");
      if (error) throw new Error(`Failed to list categories: ${error.message}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }] };
    },
  );

  server.tool(
    "search_categories",
    "Search categories by name.",
    { query: z.string().describe("Search term") },
    async ({ query }) => {
      const { data, error } = await getClient()
        .from("openledger_categories").select("*").ilike("name", `%${query}%`).order("name");
      if (error) throw new Error(`Failed to search categories: ${error.message}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }] };
    },
  );
}

// ── Budget tools ────────────────────────────────
function registerBudgetTools(
  server: McpServer,
  getClient: () => Client,
  userId: string,
) {
  server.tool(
    "list_budgets",
    "List budgets for a given month.",
    { month: z.string().optional().describe("Month YYYY-MM. Defaults to current.") },
    async ({ month }) => {
      const target = month ?? new Date().toISOString().slice(0, 7);
      const { data, error } = await getClient()
        .from("openledger_budgets").select("*").eq("user_id", userId)
        .eq("month", target).order("created_at");
      if (error) throw new Error(`Failed to list budgets: ${error.message}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }] };
    },
  );

  server.tool(
    "get_budget",
    "Get a specific budget by ID.",
    { budgetId: z.string().describe("Budget ID") },
    async ({ budgetId }) => {
      const { data, error } = await getClient()
        .from("openledger_budgets").select("*").eq("id", budgetId)
        .eq("user_id", userId).single();
      if (error) throw new Error("Budget not found or access denied");
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "create_budget",
    "Create a monthly budget.",
    {
      month: z.string().describe("Month YYYY-MM"),
      amount: z.number().describe("Spending limit"),
      categoryId: z.string().optional().describe("Category ID"),
    },
    async ({ month, amount, categoryId }) => {
      const { data, error } = await (getClient() as DbClient)
        .from("openledger_budgets")
        .insert({ month, amount, category_id: categoryId ?? null, user_id: userId })
        .select().single();
      if (error) throw new Error(`Failed to create budget: ${error.message}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "update_budget",
    "Update a budget's amount or category.",
    {
      budgetId: z.string().describe("Budget ID"),
      amount: z.number().optional().describe("New amount"),
      categoryId: z.string().optional().describe("New category ID"),
    },
    async ({ budgetId, amount, categoryId }) => {
      const { data: existing, error: checkError } = await getClient()
        .from("openledger_budgets").select("id").eq("id", budgetId)
        .eq("user_id", userId).single();
      if (checkError || !existing) throw new Error("Budget not found or access denied");
      const u: Record<string, unknown> = {};
      if (amount !== undefined) u.amount = amount;
      if (categoryId !== undefined) u.category_id = categoryId;
      if (Object.keys(u).length === 0) return { content: [{ type: "text" as const, text: "No fields provided." }] };
      const { data, error } = await (getClient() as DbClient)
        .from("openledger_budgets").update(u).eq("id", budgetId).select().single();
      if (error) throw new Error(`Failed to update budget: ${error.message}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "delete_budget",
    "Delete a budget.",
    { budgetId: z.string().describe("Budget ID") },
    async ({ budgetId }) => {
      const { data: existing, error: checkError } = await getClient()
        .from("openledger_budgets").select("id").eq("id", budgetId)
        .eq("user_id", userId).single();
      if (checkError || !existing) throw new Error("Budget not found or access denied");
      const { error } = await (getClient() as DbClient)
        .from("openledger_budgets").delete().eq("id", budgetId);
      if (error) throw new Error(`Failed to delete budget: ${error.message}`);
      return { content: [{ type: "text" as const, text: `Budget ${budgetId} deleted.` }] };
    },
  );
}

// ── Goal tools ──────────────────────────────────
const GOAL_STATUSES = ["active", "completed", "cancelled"] as const;

function registerGoalTools(
  server: McpServer,
  getClient: () => Client,
  userId: string,
) {
  server.tool(
    "list_goals",
    "List savings goals with progress.",
    {
      status: z.enum(GOAL_STATUSES).optional().describe("Filter by status"),
      includeCompleted: z.boolean().optional().default(false).describe("Include completed/cancelled"),
    },
    async ({ status, includeCompleted }) => {
      let q = getClient().from("openledger_goals").select("*").eq("user_id", userId);
      if (status) q = q.eq("status", status);
      else if (!includeCompleted) q = q.eq("status", "active");
      const { data, error } = await q.order("created_at");
      if (error) throw new Error(`Failed to list goals: ${error.message}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }] };
    },
  );

  server.tool(
    "get_goal",
    "Get a specific goal by ID.",
    { goalId: z.string().describe("Goal ID") },
    async ({ goalId }) => {
      const { data, error } = await getClient()
        .from("openledger_goals").select("*").eq("id", goalId)
        .eq("user_id", userId).single();
      if (error) throw new Error("Goal not found or access denied");
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "create_goal",
    "Create a new savings goal.",
    {
      name: z.string().min(1).describe("Goal name"),
      targetAmount: z.number().positive().describe("Target amount"),
      currentAmount: z.number().optional().default(0).describe("Starting amount"),
      deadline: z.string().optional().describe("Deadline YYYY-MM-DD"),
    },
    async ({ name, targetAmount, currentAmount, deadline }) => {
      const { data, error } = await (getClient() as DbClient)
        .from("openledger_goals")
        .insert({ name, target_amount: targetAmount, current_amount: currentAmount ?? 0, deadline: deadline ?? null, status: "active", user_id: userId })
        .select().single();
      if (error) throw new Error(`Failed to create goal: ${error.message}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "update_goal",
    "Update a goal's fields or status.",
    {
      goalId: z.string().describe("Goal ID"),
      name: z.string().optional().describe("New name"),
      targetAmount: z.number().optional().describe("New target"),
      deadline: z.string().optional().describe("New deadline YYYY-MM-DD, or empty to remove"),
      status: z.enum(GOAL_STATUSES).optional().describe("New status"),
    },
    async ({ goalId, name, targetAmount, deadline, status }) => {
      const { data: existing, error: checkError } = await getClient()
        .from("openledger_goals").select("id").eq("id", goalId)
        .eq("user_id", userId).single();
      if (checkError || !existing) throw new Error("Goal not found or access denied");
      const u: Record<string, unknown> = {};
      if (name !== undefined) u.name = name;
      if (targetAmount !== undefined) u.target_amount = targetAmount;
      if (deadline !== undefined) u.deadline = deadline;
      if (status !== undefined) u.status = status;
      if (Object.keys(u).length === 0) return { content: [{ type: "text" as const, text: "No fields provided." }] };
      const { data, error } = await (getClient() as DbClient)
        .from("openledger_goals").update(u).eq("id", goalId).select().single();
      if (error) throw new Error(`Failed to update goal: ${error.message}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "contribute_to_goal",
    "Add money toward a goal.",
    {
      goalId: z.string().describe("Goal ID"),
      amount: z.number().positive().describe("Amount to add"),
    },
    async ({ goalId, amount }) => {
      const { data: goal, error: getError } = await getClient()
        .from("openledger_goals").select("*").eq("id", goalId)
        .eq("user_id", userId).single();
      if (getError || !goal) throw new Error("Goal not found or access denied");
      const g = goal as { current_amount: number; target_amount: number };
      const newAmount = g.current_amount + amount;
      const newStatus = newAmount >= g.target_amount ? "completed" : "active";
      const { data, error } = await (getClient() as DbClient)
        .from("openledger_goals").update({ current_amount: newAmount, status: newStatus })
        .eq("id", goalId).select().single();
      if (error) throw new Error(`Failed to contribute: ${error.message}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "delete_goal",
    "Permanently delete a goal.",
    { goalId: z.string().describe("Goal ID") },
    async ({ goalId }) => {
      const { data: existing, error: checkError } = await getClient()
        .from("openledger_goals").select("id").eq("id", goalId)
        .eq("user_id", userId).single();
      if (checkError || !existing) throw new Error("Goal not found or access denied");
      const { error } = await (getClient() as DbClient)
        .from("openledger_goals").delete().eq("id", goalId);
      if (error) throw new Error(`Failed to delete goal: ${error.message}`);
      return { content: [{ type: "text" as const, text: `Goal ${goalId} deleted.` }] };
    },
  );
}

// ── Dashboard tools ─────────────────────────────
function registerDashboardTools(
  server: McpServer,
  getClient: () => Client,
  userId: string,
) {
  server.tool(
    "get_account_summary",
    "Get total balance, net worth, and breakdown by account type.",
    {},
    async () => {
      const { data: accounts, error } = await getClient()
        .from("openledger_accounts").select("*").eq("user_id", userId).is("archived_at", null);
      if (error) throw new Error(`Failed: ${error.message}`);
      const byKind: Record<string, { count: number; total: number }> = {};
      let totalBalance = 0;
      for (const a of accounts ?? []) {
        const acct = a as { kind: string; balance: number };
        if (!byKind[acct.kind]) byKind[acct.kind] = { count: 0, total: 0 };
        byKind[acct.kind].count++;
        byKind[acct.kind].total += acct.balance;
        totalBalance += acct.balance;
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ totalAccounts: accounts?.length ?? 0, totalBalance, netWorth: totalBalance, breakdownByType: byKind }, null, 2) }] };
    },
  );

  server.tool(
    "get_monthly_summary",
    "Get income and expense totals for a month, broken down by category.",
    { month: z.string().optional().describe("Month YYYY-MM. Defaults to current.") },
    async ({ month }) => {
      const target = month ?? new Date().toISOString().slice(0, 7);
      const start = `${target}-01`;
      const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 0).toISOString().slice(0, 10);
      const { data: txs, error } = await getClient()
        .from("openledger_transactions").select("*").eq("user_id", userId)
        .gte("date", start).lte("date", end);
      if (error) throw new Error(`Failed: ${error.message}`);
      let income = 0, expenses = 0;
      const byCat: Record<string, { income: number; expenses: number; count: number }> = {};
      for (const t of txs ?? []) {
        const tx = t as { amount: number; category: string };
        const cat = tx.category;
        if (!byCat[cat]) byCat[cat] = { income: 0, expenses: 0, count: 0 };
        byCat[cat].count++;
        if (tx.amount >= 0) { income += tx.amount; byCat[cat].income += tx.amount; }
        else { expenses += Math.abs(tx.amount); byCat[cat].expenses += Math.abs(tx.amount); }
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ month: target, totalIncome: income, totalExpenses: expenses, netChange: income - expenses, byCategory: byCat }, null, 2) }] };
    },
  );

  server.tool(
    "get_budget_vs_actual",
    "Compare budgeted amounts vs actual spending for a month.",
    { month: z.string().optional().describe("Month YYYY-MM. Defaults to current.") },
    async ({ month }) => {
      const target = month ?? new Date().toISOString().slice(0, 7);
      const start = `${target}-01`;
      const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 0).toISOString().slice(0, 10);
      const [bRes, tRes] = await Promise.all([
        getClient().from("openledger_budgets").select("*").eq("user_id", userId).eq("month", target),
        getClient().from("openledger_transactions").select("amount, category").eq("user_id", userId).gte("date", start).lte("date", end),
      ]);
      if (bRes.error) throw new Error(`Failed: ${bRes.error.message}`);
      if (tRes.error) throw new Error(`Failed: ${tRes.error.message}`);
      const actualByCat: Record<string, number> = {};
      for (const t of tRes.data ?? []) {
        const tx = t as { amount: number; category: string };
        if (tx.amount < 0) actualByCat[tx.category] = (actualByCat[tx.category] ?? 0) + Math.abs(tx.amount);
      }
      const comparisons: Record<string, unknown>[] = (bRes.data ?? []).map((b: Record<string, unknown>) => {
        const budget = b as { id: string; category_id: string | null; amount: number };
        const catName = budget.category_id ?? "Uncategorized";
        const actual = actualByCat[catName] ?? 0;
        const cmp: Record<string, unknown> = { budgetId: budget.id, categoryId: budget.category_id, budgeted: budget.amount, actual, remaining: budget.amount - actual, onTrack: actual <= budget.amount };
        return cmp;
      });
      for (const [cat, amount] of Object.entries(actualByCat)) {
        if (!comparisons.find((c: any) => c.categoryId === cat))
          comparisons.push({ budgetId: null, categoryId: cat, budgeted: 0, actual: amount, remaining: -amount, onTrack: false });
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(comparisons, null, 2) }] };
    },
  );

  server.tool(
    "get_goals_progress",
    "Get progress on all active goals with completion percentage and deadline status.",
    {},
    async () => {
      const { data: goals, error } = await getClient()
        .from("openledger_goals").select("*").eq("user_id", userId).eq("status", "active");
      if (error) throw new Error(`Failed: ${error.message}`);
      const progress = (goals ?? []).map((g: Record<string, unknown>) => {
        const goal = g as { id: string; name: string; target_amount: number; current_amount: number; deadline: string | null };
        const pct = goal.target_amount > 0 ? Math.round((goal.current_amount / goal.target_amount) * 100) : 0;
        let ds = "no deadline";
        if (goal.deadline) {
          const days = Math.round((new Date(goal.deadline).getTime() - Date.now()) / 86400000);
          ds = days > 0 ? `${days} days remaining` : `${Math.abs(days)} days overdue`;
        }
        return { id: goal.id, name: goal.name, target: goal.target_amount, current: goal.current_amount, remaining: Math.max(0, goal.target_amount - goal.current_amount), percentComplete: pct, deadline: goal.deadline, deadlineStatus: ds };
      });
      return { content: [{ type: "text" as const, text: JSON.stringify(progress, null, 2) }] };
    },
  );
}

// ── Search tools ────────────────────────────────
function registerSearchTools(
  server: McpServer,
  getClient: () => Client,
  userId: string,
) {
  server.tool(
    "search_transactions",
    "Search transactions by keyword matching description, merchant, notes, and category.",
    {
      query: z.string().min(1).describe("Search keyword"),
      limit: z.number().optional().default(30).describe("Max results (max 100)"),
    },
    async ({ query, limit }) => {
      const capped = Math.min(limit ?? 30, 100);
      const q = `%${query}%`;
      const { data, error } = await getClient()
        .from("openledger_transactions").select("*").eq("user_id", userId)
        .or(`description.ilike.${q},merchant.ilike.${q},note.ilike.${q},category.ilike.${q}`)
        .order("date", { ascending: false }).limit(capped);
      if (error) throw new Error(`Failed to search: ${error.message}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(data ?? [], null, 2) }] };
    },
  );

  server.tool(
    "search_everything",
    "Search across transactions, accounts, and goals by keyword.",
    { query: z.string().min(1).describe("Search keyword") },
    async ({ query }) => {
      const q = `%${query}%`;
      const [txR, acctR, goalR] = await Promise.all([
        getClient().from("openledger_transactions").select("*").eq("user_id", userId)
          .or(`description.ilike.${q},merchant.ilike.${q},note.ilike.${q},category.ilike.${q}`)
          .order("date", { ascending: false }).limit(30),
        getClient().from("openledger_accounts").select("*").eq("user_id", userId)
          .or(`name.ilike.${q},subtitle.ilike.${q}`).order("name").limit(20),
        getClient().from("openledger_goals").select("*").eq("user_id", userId)
          .ilike("name", q).order("name").limit(20),
      ]);
      return { content: [{ type: "text" as const, text: JSON.stringify({ transactions: txR.error ? [] : txR.data ?? [], accounts: acctR.error ? [] : acctR.data ?? [], goals: goalR.error ? [] : goalR.data ?? [] }, null, 2) }] };
    },
  );
}

// ── Entry point ────────────────────────────────
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
