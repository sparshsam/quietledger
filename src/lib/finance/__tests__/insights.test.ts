import { describe, it, expect } from "vitest";
import {
  largestExpenseThisMonth,
  topSpendingCategory,
  monthOverMonthChange,
  findRecurringTransactions,
  lowBalanceAlerts,
} from "../insights";
import type { Account, Transaction } from "@/lib/data/types";

const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

describe("largestExpenseThisMonth", () => {
  it("returns the single largest expense for the current month", () => {
    const txns: Transaction[] = [
      { id: "1", date: `${currentMonth}-01`, description: "Rent", category: "Rent", accountId: "a", amount: -1500 },
      { id: "2", date: `${currentMonth}-10`, description: "Groceries", category: "Groceries", accountId: "a", amount: -300 },
      { id: "3", date: `${currentMonth}-15`, description: "Salary", category: "Income", accountId: "a", amount: 5000 },
    ];
    expect(largestExpenseThisMonth(txns)).toEqual({ description: "Rent", amount: -1500 });
  });

  it("returns null when no expenses this month", () => {
    expect(largestExpenseThisMonth([])).toBeNull();
  });
});

describe("topSpendingCategory", () => {
  it("returns category with highest absolute expense total", () => {
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Rent", category: "Rent", accountId: "a", amount: -1500 },
      { id: "2", date: "2026-05-10", description: "Groceries", category: "Groceries", accountId: "a", amount: -200 },
      { id: "3", date: "2026-05-15", description: "More Groceries", category: "Groceries", accountId: "a", amount: -100 },
    ];
    expect(topSpendingCategory(txns)).toEqual({ category: "Rent", total: -1500 });
  });

  it("returns null for empty input", () => {
    expect(topSpendingCategory([])).toBeNull();
  });
});

describe("monthOverMonthChange", () => {
  it("calculates percentage change in total expenses between last two months", () => {
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Rent", category: "Rent", accountId: "a", amount: -1500 },
      { id: "2", date: "2026-05-10", description: "Groceries", category: "Groceries", accountId: "a", amount: -200 },
      { id: "3", date: "2026-04-01", description: "Rent", category: "Rent", accountId: "a", amount: -1500 },
    ];
    const change = monthOverMonthChange(txns);
    expect(change).not.toBeNull();
    expect(change).toBeCloseTo(13.33, 1);
  });

  it("returns null when fewer than 2 months of data", () => {
    expect(monthOverMonthChange([])).toBeNull();
  });
});

describe("findRecurringTransactions", () => {
  it("finds transactions with same description and amount appearing 2+ times", () => {
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Netflix", category: "Subscriptions", accountId: "a", amount: -15.99 },
      { id: "2", date: "2026-04-01", description: "Netflix", category: "Subscriptions", accountId: "a", amount: -15.99 },
      { id: "3", date: "2026-05-10", description: "Coffee", category: "Food & Drink", accountId: "a", amount: -4.5 },
    ];
    const recurring = findRecurringTransactions(txns);
    expect(recurring).toHaveLength(1);
    expect(recurring[0].description).toBe("Netflix");
    expect(recurring[0].count).toBe(2);
  });

  it("returns empty array when no recurring transactions", () => {
    expect(findRecurringTransactions([])).toEqual([]);
  });
});

describe("lowBalanceAlerts", () => {
  it("flags accounts with balance below 100", () => {
    const accounts: Account[] = [
      { id: "a", name: "Chequing", kind: "chequing" as const, subtitle: "", balance: 50, currency: "CAD" },
      { id: "b", name: "Savings", kind: "savings" as const, subtitle: "", balance: 5000, currency: "CAD" },
    ];
    const alerts = lowBalanceAlerts(accounts, []);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].accountName).toBe("Chequing");
  });

  it("returns empty array when all balances are healthy", () => {
    const accounts: Account[] = [
      { id: "a", name: "Chequing", kind: "chequing" as const, subtitle: "", balance: 500, currency: "CAD" },
    ];
    expect(lowBalanceAlerts(accounts, [])).toEqual([]);
  });
});
