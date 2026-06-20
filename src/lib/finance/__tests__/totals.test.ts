import { describe, it, expect } from "vitest";
import { computeIncome, computeExpenses, computeNetCashflow, computeNetWorth } from "../totals";
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
