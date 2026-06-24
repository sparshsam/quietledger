/**
 * Dashboard tools — aggregate financial summaries and insights.
 *
 * These tools compute net worth, monthly income/expense totals, budget vs.
 * actual comparisons, and goal summary data for quick financial snapshots.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Client } from "../supabase.js";

export function registerDashboardTools(
  server: McpServer,
  getClient: () => Client,
  userId: string,
) {
  // ── ACCOUNT SUMMARY ─────────────────────────────
  server.tool(
    "get_account_summary",
    "Get a summary of all active accounts: total balance, net worth, and a breakdown by account type. Use this for a quick financial overview.",
    {},
    async () => {
      const { data: accounts, error } = await getClient()
        .from("openledger_accounts")
        .select("*")
        .eq("user_id", userId)
        .is("archived_at", null);

      if (error) {
        throw new Error(`Failed to get account summary: ${error.message}`);
      }

      const byKind: Record<string, { count: number; total: number }> = {};
      let totalBalance = 0;

      for (const acct of accounts ?? []) {
        const a = acct as { kind: string; balance: number; currency: string };
        const kind = a.kind;
        if (!byKind[kind]) byKind[kind] = { count: 0, total: 0 };
        byKind[kind].count++;
        byKind[kind].total += a.balance;
        totalBalance += a.balance;
      }

      const summary = {
        totalAccounts: accounts?.length ?? 0,
        totalBalance,
        netWorth: totalBalance,
        breakdownByType: byKind,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }],
      };
    },
  );

  // ── MONTHLY SUMMARY ─────────────────────────────
  server.tool(
    "get_monthly_summary",
    "Get income and expense totals for a specific month, broken down by category. Use this to see how much you earned, spent, and where the money went.",
    {
      month: z.string().optional().describe("Month in YYYY-MM format (e.g. '2026-06'). Defaults to the current month."),
    },
    async ({ month }) => {
      const targetMonth = month ?? new Date().toISOString().slice(0, 7);
      const startDate = `${targetMonth}-01`;
      const endDate = new Date(
        new Date(startDate).getFullYear(),
        new Date(startDate).getMonth() + 1,
        0,
      ).toISOString().slice(0, 10);

      const { data: transactions, error } = await getClient()
        .from("openledger_transactions")
        .select("*")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lte("date", endDate);

      if (error) {
        throw new Error(`Failed to get monthly summary: ${error.message}`);
      }

      let totalIncome = 0;
      let totalExpenses = 0;
      const byCategory: Record<string, { income: number; expenses: number; count: number }> = {};

      for (const t of transactions ?? []) {
        const tx = t as { amount: number; category: string };
        const cat = tx.category;
        if (!byCategory[cat]) byCategory[cat] = { income: 0, expenses: 0, count: 0 };
        byCategory[cat].count++;

        if (tx.amount >= 0) {
          totalIncome += tx.amount;
          byCategory[cat].income += tx.amount;
        } else {
          totalExpenses += Math.abs(tx.amount);
          byCategory[cat].expenses += Math.abs(tx.amount);
        }
      }

      const summary = {
        month: targetMonth,
        totalIncome,
        totalExpenses,
        netChange: totalIncome - totalExpenses,
        transactionCount: transactions?.length ?? 0,
        byCategory,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }],
      };
    },
  );

  // ── BUDGET VS ACTUAL ────────────────────────────
  server.tool(
    "get_budget_vs_actual",
    "Compare budgeted amounts against actual spending for a given month. Returns category-by-category breakdown showing budgeted amount, actual spend, and remaining (over/under). Use this to track budget adherence.",
    {
      month: z.string().optional().describe("Month in YYYY-MM format (e.g. '2026-06'). Defaults to the current month."),
    },
    async ({ month }) => {
      const targetMonth = month ?? new Date().toISOString().slice(0, 7);
      const startDate = `${targetMonth}-01`;
      const endDate = new Date(
        new Date(startDate).getFullYear(),
        new Date(startDate).getMonth() + 1,
        0,
      ).toISOString().slice(0, 10);

      const [budgetsResult, txResult] = await Promise.all([
        getClient()
          .from("openledger_budgets")
          .select("*")
          .eq("user_id", userId)
          .eq("month", targetMonth),
        getClient()
          .from("openledger_transactions")
          .select("amount, category")
          .eq("user_id", userId)
          .gte("date", startDate)
          .lte("date", endDate),
      ]);

      if (budgetsResult.error) {
        throw new Error(`Failed to get budgets: ${budgetsResult.error.message}`);
      }
      if (txResult.error) {
        throw new Error(`Failed to get transactions: ${txResult.error.message}`);
      }

      // Build per-category actual spending (expenses only)
      const actualByCategory: Record<string, number> = {};
      for (const t of txResult.data ?? []) {
        const tx = t as { amount: number; category: string };
        if (tx.amount < 0) {
          const cat = tx.category;
          actualByCategory[cat] = (actualByCategory[cat] ?? 0) + Math.abs(tx.amount);
        }
      }

      const comparisons = [];
      for (const b of budgetsResult.data ?? []) {
        const budget = b as { id: string; category_id: string | null; amount: number };
        const catName = budget.category_id ?? "Uncategorized";
        const actual = actualByCategory[catName] ?? 0;
        comparisons.push({
          budgetId: budget.id,
          categoryId: budget.category_id,
          budgeted: budget.amount,
          actual,
          remaining: budget.amount - actual,
          onTrack: actual <= budget.amount,
        });
      }

      // Categories with spending but no budget
      for (const [cat, amount] of Object.entries(actualByCategory)) {
        if (!comparisons.find((c) => c.categoryId === cat)) {
          comparisons.push({
            budgetId: null,
            categoryId: cat,
            budgeted: 0,
            actual: amount,
            remaining: -amount,
            onTrack: false,
          });
        }
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(comparisons, null, 2) }],
      };
    },
  );

  // ── GOALS PROGRESS ──────────────────────────────
  server.tool(
    "get_goals_progress",
    "Get a summary of all active goals and their progress. Returns completion percentage, amount remaining, and whether each goal is on track to meet its deadline.",
    {},
    async () => {
      const { data: goals, error } = await getClient()
        .from("openledger_goals")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active");

      if (error) {
        throw new Error(`Failed to get goals progress: ${error.message}`);
      }

      const progress = (goals ?? []).map((g) => {
        const goal = g as {
          id: string;
          name: string;
          target_amount: number;
          current_amount: number;
          deadline: string | null;
        };
        const pct = goal.target_amount > 0
          ? Math.round((goal.current_amount / goal.target_amount) * 100)
          : 0;
        let deadlineStatus = "no deadline";
        if (goal.deadline) {
          const daysLeft = Math.round(
            (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          );
          deadlineStatus = daysLeft > 0 ? `${daysLeft} days remaining` : `${Math.abs(daysLeft)} days overdue`;
        }
        return {
          id: goal.id,
          name: goal.name,
          targetAmount: goal.target_amount,
          currentAmount: goal.current_amount,
          remaining: Math.max(0, goal.target_amount - goal.current_amount),
          percentComplete: pct,
          deadline: goal.deadline,
          deadlineStatus,
        };
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify(progress, null, 2) }],
      };
    },
  );
}
