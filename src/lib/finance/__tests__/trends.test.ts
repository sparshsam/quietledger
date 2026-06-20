import { describe, it, expect } from "vitest";
import { monthlyTrend } from "../trends";
import type { Transaction } from "@/lib/data/types";

describe("monthlyTrend", () => {
  it("returns monthly income, expense, net sorted chronologically", () => {
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Salary", category: "Income", accountId: "a", amount: 5000 },
      { id: "2", date: "2026-05-10", description: "Rent", category: "Rent", accountId: "a", amount: -1500 },
      { id: "3", date: "2026-04-01", description: "Salary", category: "Income", accountId: "a", amount: 4800 },
      { id: "4", date: "2026-04-10", description: "Rent", category: "Rent", accountId: "a", amount: -1400 },
    ];
    const trend = monthlyTrend(txns);
    expect(trend).toHaveLength(2);
    expect(trend[0].month).toBe("2026-04");
    expect(trend[0].income).toBe(4800);
    expect(trend[0].expense).toBe(1400);
    expect(trend[0].net).toBe(3400);
    expect(trend[1].month).toBe("2026-05");
    expect(trend[1].net).toBe(3500);
  });

  it("returns empty array for empty input", () => {
    expect(monthlyTrend([])).toEqual([]);
  });
});
