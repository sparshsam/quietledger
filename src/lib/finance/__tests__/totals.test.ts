import { describe, it, expect } from "vitest";
import { computeIncome, computeExpenses, computeNetCashflow, computeNetWorth, computeMonthIncome, computeMonthExpenses, computeMonthCashflow, computeMonthOverMonth, computeCategoryMonthOverMonth } from "../totals";
import type { Account, Transaction } from "@/lib/data/types";

describe("computeIncome", () => {
  it("sums positive amounts across transactions", () => {
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Salary", category: "Income", accountId: "a", amount: 5000 },
      { id: "2", date: "2026-05-15", description: "Freelance", category: "Income", accountId: "a", amount: 800 },
      { id: "3", date: "2026-05-10", description: "Rent", category: "Rent", accountId: "a", amount: -1500 },
    ];
    expect(computeIncome(txns)).toBe(5800);
  });

  it("returns 0 for no transactions", () => {
    expect(computeIncome([])).toBe(0);
  });

  it("returns 0 when all amounts are negative", () => {
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Rent", category: "Rent", accountId: "a", amount: -1500 },
    ];
    expect(computeIncome(txns)).toBe(0);
  });
});

describe("computeExpenses", () => {
  it("sums absolute values of negative amounts", () => {
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Rent", category: "Rent", accountId: "a", amount: -1500 },
      { id: "2", date: "2026-05-10", description: "Groceries", category: "Groceries", accountId: "a", amount: -200 },
      { id: "3", date: "2026-05-15", description: "Salary", category: "Income", accountId: "a", amount: 5000 },
    ];
    expect(computeExpenses(txns)).toBe(1700);
  });

  it("returns 0 for no transactions", () => {
    expect(computeExpenses([])).toBe(0);
  });
});

describe("computeNetCashflow", () => {
  it("returns income minus expenses", () => {
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Salary", category: "Income", accountId: "a", amount: 5000 },
      { id: "2", date: "2026-05-10", description: "Rent", category: "Rent", accountId: "a", amount: -1500 },
      { id: "3", date: "2026-05-15", description: "Groceries", category: "Groceries", accountId: "a", amount: -200 },
    ];
    expect(computeNetCashflow(txns)).toBe(3300);
  });

  it("returns 0 for empty transactions", () => {
    expect(computeNetCashflow([])).toBe(0);
  });
});

describe("computeNetWorth", () => {
  it("sums all account balances", () => {
    const accounts: Account[] = [
      { id: "a", name: "Chequing", kind: "chequing" as const, subtitle: "", balance: 5000, currency: "CAD" },
      { id: "b", name: "Credit Card", kind: "credit-card" as const, subtitle: "", balance: -1000, currency: "CAD" },
      { id: "c", name: "Savings", kind: "savings" as const, subtitle: "", balance: 10000, currency: "CAD" },
    ];
    expect(computeNetWorth(accounts)).toBe(14000);
  });

  it("returns 0 for empty accounts", () => {
    expect(computeNetWorth([])).toBe(0);
  });
});

const txns: Transaction[] = [
  { id: "1", date: "2026-06-15", description: "Salary", category: "Income", accountId: "a1", amount: 5000 },
  { id: "2", date: "2026-06-10", description: "Rent", category: "Housing", accountId: "a1", amount: -1500 },
  { id: "3", date: "2026-05-15", description: "Freelance", category: "Income", accountId: "a1", amount: 2000 },
  { id: "4", date: "2026-05-10", description: "Groceries", category: "Food", accountId: "a1", amount: -400 },
];

describe("month-scoped helpers", () => {
  it("computeMonthIncome returns income for the given month", () => {
    expect(computeMonthIncome(txns, "2026-06")).toBe(5000);
  });

  it("computeMonthExpenses returns expenses for the given month", () => {
    expect(computeMonthExpenses(txns, "2026-06")).toBe(1500);
  });

  it("computeMonthCashflow returns income - expenses for the month", () => {
    expect(computeMonthCashflow(txns, "2026-06")).toBe(3500);
  });

  it("returns 0 for month with no transactions", () => {
    expect(computeMonthIncome(txns, "2027-01")).toBe(0);
  });
});

describe("month-over-month", () => {
  it("computeMonthOverMonth calculates % change in expenses", () => {
    // June spent 1500, May spent 400
    const result = computeMonthOverMonth(txns, "2026-06");
    expect(result).toBeCloseTo(275, 0); // (1500-400)/400 * 100
  });

  it("computeCategoryMonthOverMonth calculates % change for one category", () => {
    const result = computeCategoryMonthOverMonth(txns, "Food", "2026-06");
    expect(result).toBeNull(); // No Food txns in June
  });
});
