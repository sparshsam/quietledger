import { describe, it, expect } from "vitest";
import {
  groupByCategory,
  groupByAccount,
  categoryTotals,
  monthlyTotals,
} from "../grouping";
import type { Transaction } from "@/lib/data/types";

const txns: Transaction[] = [
  { id: "1", date: "2026-05-01", description: "Salary", category: "Income", accountId: "a", amount: 5000 },
  { id: "2", date: "2026-05-10", description: "Rent", category: "Rent", accountId: "a", amount: -1500 },
  { id: "3", date: "2026-05-15", description: "Groceries", category: "Groceries", accountId: "b", amount: -200 },
  { id: "4", date: "2026-04-01", description: "Salary", category: "Income", accountId: "a", amount: 5000 },
];

describe("groupByCategory", () => {
  it("groups transactions by category key", () => {
    const grouped = groupByCategory(txns);
    expect(Object.keys(grouped).sort()).toEqual(["Groceries", "Income", "Rent"]);
    expect(grouped["Income"]).toHaveLength(2);
    expect(grouped["Rent"]).toHaveLength(1);
  });

  it("returns empty object for empty input", () => {
    expect(groupByCategory([])).toEqual({});
  });
});

describe("groupByAccount", () => {
  it("groups transactions by accountId", () => {
    const grouped = groupByAccount(txns);
    expect(Object.keys(grouped)).toEqual(["a", "b"]);
    expect(grouped["a"]).toHaveLength(3);
  });
});

describe("categoryTotals", () => {
  it("returns sorted category totals (expenses negative, income positive)", () => {
    const totals = categoryTotals(txns);
    const income = totals.find((t) => t.category === "Income");
    expect(income?.total).toBe(10000);
    const rent = totals.find((t) => t.category === "Rent");
    expect(rent?.total).toBe(-1500);
  });

  it("returns empty array for empty input", () => {
    expect(categoryTotals([])).toEqual([]);
  });
});

describe("monthlyTotals", () => {
  it("returns monthly income and expense totals", () => {
    const result = monthlyTotals(txns);
    const may = result.find((r) => r.month === "2026-05");
    expect(may?.income).toBe(5000);
    expect(may?.expense).toBe(1700);
    const apr = result.find((r) => r.month === "2026-04");
    expect(apr?.income).toBe(5000);
    expect(apr?.expense).toBe(0);
  });

  it("returns empty array for empty input", () => {
    expect(monthlyTotals([])).toEqual([]);
  });
});
