import { describe, it, expect } from "vitest";
import { budgetUtilization, remainingBudget, isOverBudget, findOverBudget, averageSpendingByCategory } from "../budgets";
import type { Budget, Transaction } from "@/lib/data/types";

describe("budgetUtilization", () => {
  it("calculates percentage of budget spent", () => {
    const budget: Budget = { id: "b1", category: "Groceries", month: "2026-05", amount: 500 };
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Store", category: "Groceries", accountId: "a", amount: -200 },
      { id: "2", date: "2026-05-10", description: "Market", category: "Groceries", accountId: "a", amount: -150 },
    ];
    expect(budgetUtilization(budget, txns)).toBe(70);
  });

  it("returns 0 when no transactions match", () => {
    const budget: Budget = { id: "b1", category: "Groceries", month: "2026-05", amount: 500 };
    expect(budgetUtilization(budget, [])).toBe(0);
  });

  it("caps at 100 when over budget", () => {
    const budget: Budget = { id: "b1", category: "Groceries", month: "2026-05", amount: 100 };
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Store", category: "Groceries", accountId: "a", amount: -200 },
    ];
    expect(budgetUtilization(budget, txns)).toBe(100);
  });
});

describe("remainingBudget", () => {
  it("returns positive remaining amount", () => {
    const budget: Budget = { id: "b1", category: "Groceries", month: "2026-05", amount: 500 };
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Store", category: "Groceries", accountId: "a", amount: -200 },
    ];
    expect(remainingBudget(budget, txns)).toBe(300);
  });

  it("returns negative when over budget", () => {
    const budget: Budget = { id: "b1", category: "Groceries", month: "2026-05", amount: 100 };
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Store", category: "Groceries", accountId: "a", amount: -200 },
    ];
    expect(remainingBudget(budget, txns)).toBe(-100);
  });
});

describe("isOverBudget", () => {
  it("returns true when spent exceeds budget", () => {
    const budget: Budget = { id: "b1", category: "Groceries", month: "2026-05", amount: 100 };
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Store", category: "Groceries", accountId: "a", amount: -150 },
    ];
    expect(isOverBudget(budget, txns)).toBe(true);
  });

  it("returns false when within budget", () => {
    const budget: Budget = { id: "b1", category: "Groceries", month: "2026-05", amount: 200 };
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Store", category: "Groceries", accountId: "a", amount: -150 },
    ];
    expect(isOverBudget(budget, txns)).toBe(false);
  });
});

describe("findOverBudget", () => {
  it("returns only budgets that are over budget", () => {
    const budgets: Budget[] = [
      { id: "b1", category: "Groceries", month: "2026-05", amount: 100 },
      { id: "b2", category: "Rent", month: "2026-05", amount: 1600 },
    ];
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Store", category: "Groceries", accountId: "a", amount: -150 },
    ];
    const over = findOverBudget(budgets, txns);
    expect(over).toHaveLength(1);
    expect(over[0].budget.id).toBe("b1");
  });

  it("returns empty array when all budgets are on track", () => {
    const budgets: Budget[] = [
      { id: "b1", category: "Groceries", month: "2026-05", amount: 200 },
    ];
    expect(findOverBudget(budgets, [])).toEqual([]);
  });
});

const txns: Transaction[] = [
  { id: "1", date: "2026-06-15", description: "Metro", category: "Food", accountId: "a1", amount: -85 },
  { id: "2", date: "2026-06-10", description: "Uber Eats", category: "Food", accountId: "a1", amount: -32 },
  { id: "3", date: "2026-05-15", description: "Loblaws", category: "Food", accountId: "a1", amount: -200 },
  { id: "4", date: "2026-05-10", description: "Shell", category: "Transport", accountId: "a1", amount: -60 },
  { id: "5", date: "2026-06-05", description: "Rent", category: "Housing", accountId: "a1", amount: -1100 },
];

describe("averageSpendingByCategory", () => {
  it("computes monthly avg per category over given months", () => {
    const result = averageSpendingByCategory(txns, 3);
    expect(result).toContainEqual({ category: "Food", monthlyAverage: expect.closeTo(158.5, 1) });
    expect(result).toContainEqual({ category: "Transport", monthlyAverage: expect.closeTo(60, 1) });
  });

  it("sorts by highest average first", () => {
    const result = averageSpendingByCategory(txns, 3);
    expect(result[0].category).toBe("Housing");
  });

  it("returns empty array for no transactions", () => {
    expect(averageSpendingByCategory([], 3)).toEqual([]);
  });
});
