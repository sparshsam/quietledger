import { describe, it, expect, beforeEach } from "vitest";
import type { Account, Transaction } from "@/lib/data/types";
import {
  startReconciliation,
  completeReconciliation,
  addAdjustment,
  getLastReconciliation,
  getReconciliationHistory,
  calculateOpeningBalance,
  calculateClosingBalance,
  reconcileStatement,
  assessAccountHealth,
  filterAccounts,
} from "../reconciliation";

const account: Account = {
  id: "a1", name: "Chequing", kind: "chequing", subtitle: "", balance: 1500, currency: "USDC",
};

const txns: Transaction[] = [
  { id: "t1", date: "2024-01-01", description: "Salary", amount: 5000, accountId: "a1", category: "Income" },
  { id: "t2", date: "2024-01-05", description: "Rent", amount: -1500, accountId: "a1", category: "Housing" },
  { id: "t3", date: "2024-01-10", description: "Groceries", amount: -200, accountId: "a1", category: "Food" },
];

describe("startReconciliation", () => {
  it("creates a new reconciliation session", () => {
    const recon = startReconciliation(account, txns);
    expect(recon.accountId).toBe("a1");
    expect(recon.status).toBe("in_progress");
    expect(recon.transactionIds).toHaveLength(3);
  });

  it("calculates opening balance from previous reconciliation", () => {
    const prev = startReconciliation(account, txns);
    const completed = completeReconciliation(prev, 1500);
    const next = startReconciliation(account, txns, [completed]);
    expect(next.openingBalance).toBe(completed.closingBalance);
  });
});

describe("completeReconciliation", () => {
  it("marks reconciliation as completed", () => {
    const recon = startReconciliation(account, txns);
    const completed = completeReconciliation(recon);
    expect(completed.status).toBe("reconciled");
    expect(completed.completedAt).toBeDefined();
  });

  it("includes statement balance when provided", () => {
    const recon = startReconciliation(account, txns);
    const completed = completeReconciliation(recon, 3300, "2024-01-31");
    expect(completed.statementBalance).toBe(3300);
    expect(completed.statementDate).toBe("2024-01-31");
  });
});

describe("addAdjustment", () => {
  it("adds a balance adjustment", () => {
    const recon = startReconciliation(account, txns);
    const adjusted = addAdjustment(recon, {
      date: "2024-01-15",
      amount: -10,
      reason: "Bank fee",
      type: "fee",
    });
    expect(adjusted.adjustments).toHaveLength(1);
    expect(adjusted.adjustments[0].reason).toBe("Bank fee");
  });
});

describe("calculateOpeningBalance / calculateClosingBalance", () => {
  it("calculates balance up to a date", () => {
    const opening = calculateOpeningBalance("a1", txns, "2024-01-10");
    // t1 (Jan 1) and t2 (Jan 5) are before Jan 10; t3 (Jan 10) is excluded
    expect(opening).toBe(3500);
  });
});

describe("reconcileStatement", () => {
  it("matches when balances align", () => {
    const result = reconcileStatement("a1", 3300, "2024-01-31", txns, ["t1", "t2", "t3"]);
    expect(result.status).toBe("matched");
    expect(result.difference).toBe(0);
  });

  it("detects major difference", () => {
    const result = reconcileStatement("a1", 3000, "2024-01-31", txns, ["t1", "t2"]);
    expect(result.status).toBe("major_difference");
  });
});

describe("assessAccountHealth", () => {
  it("scores healthy account highly", () => {
    const health = assessAccountHealth([account], txns, []);
    expect(health).toHaveLength(1);
    // Score: 100 - 30 (discrepancy) - 15 (open) - 10 (inactive) = 45
    expect(health[0].score).toBe(45);
  });

  it("flags balance discrepancy", () => {
    const badAccount = { ...account, balance: 9999 }; // Way off
    const health = assessAccountHealth([badAccount], txns, []);
    expect(health[0].flags.some((f) => f.type === "critical")).toBe(true);
  });
});

describe("filterAccounts", () => {
  it("filters by search text", () => {
    const accounts = [
      { ...account, name: "Main Account" },
      { ...account, id: "a2", name: "Savings" },
    ];
    const result = filterAccounts(accounts, { search: "Savings" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Savings");
  });

  it("filters by kind", () => {
    const accounts = [
      { ...account, kind: "chequing" as const },
      { ...account, id: "a2", name: "Credit Card", kind: "credit-card" as const },
    ];
    const result = filterAccounts(accounts, { kinds: ["credit-card"] });
    expect(result).toHaveLength(1);
  });
});
