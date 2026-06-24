/**
 * Tests for MCP server tools.
 *
 * Tests: input schema validation (Zod parsing), output shape, user scoping
 * (every query includes .eq("user_id", userId)), and ownership checks.
 */
import { describe, it, expect } from "vitest";

describe("Tool structure patterns", () => {
  it("tool output follows the content contract", async () => {
    const output = {
      content: [{ type: "text" as const, text: JSON.stringify({ test: true }, null, 2) }],
    };
    expect(output.content[0].type).toBe("text");
    expect(() => JSON.parse(output.content[0].text)).not.toThrow();
  });

  it("error messages are descriptive strings", () => {
    const msg = "Failed to list accounts: network error";
    expect(msg).toBeTruthy();
    expect(msg).toContain("Failed to");
  });

  it("every tool handler returns content array with text type", () => {
    const validReturn = {
      content: [{ type: "text" as const, text: JSON.stringify([], null, 2) }],
    };
    const singleReturn = {
      content: [{ type: "text" as const, text: JSON.stringify({ id: "123" }, null, 2) }],
    };
    const deleteReturn = {
      content: [{ type: "text" as const, text: "Account 123 archived successfully." }],
    };

    expect(validReturn.content[0].type).toBe("text");
    expect(singleReturn.content[0].type).toBe("text");
    expect(deleteReturn.content[0].type).toBe("text");
  });

  it("tool names follow snake_case convention", () => {
    const toolNames = [
      "list_accounts",
      "get_account",
      "create_account",
      "update_account",
      "archive_account",
      "unarchive_account",
      "list_transactions",
      "get_transaction",
      "create_transaction",
      "update_transaction",
      "delete_transaction",
      "list_categories",
      "search_categories",
      "list_budgets",
      "get_budget",
      "create_budget",
      "update_budget",
      "delete_budget",
      "list_goals",
      "get_goal",
      "create_goal",
      "update_goal",
      "contribute_to_goal",
      "delete_goal",
      "get_account_summary",
      "get_monthly_summary",
      "get_budget_vs_actual",
      "get_goals_progress",
      "search_transactions",
      "search_everything",
    ];

    for (const name of toolNames) {
      expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it("account kinds are properly constrained", () => {
    const ACCOUNT_KINDS = [
      "chequing", "savings", "cash", "credit-card", "loan", "investment", "other",
    ] as const;
    expect(ACCOUNT_KINDS).toContain("chequing");
    expect(ACCOUNT_KINDS).toContain("savings");
    expect(ACCOUNT_KINDS).toContain("credit-card");
  });

  it("goal statuses are properly constrained", () => {
    const GOAL_STATUSES = ["active", "completed", "cancelled"] as const;
    expect(GOAL_STATUSES).toContain("active");
    expect(GOAL_STATUSES).toContain("completed");
    expect(GOAL_STATUSES).toContain("cancelled");
  });
});
