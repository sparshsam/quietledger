import { describe, it, expect } from "vitest";
import { detectConflicts } from "@/lib/sync/sync-engine";
import {
  findDuplicateTransactions,
  validateTransaction,
  reconcileAccounts,
  verifyBackupPayload,
  verifyRestore,
} from "@/lib/finance/validation";
import type { Transaction, Account, LedgerData } from "@/lib/data/types";

// ── Conflict Detection ─────────────────────────────────

describe("detectConflicts", () => {
  it("returns no conflicts when local and remote are identical", () => {
    const local = {
      accounts: [{ id: "a1", name: "Chequing", balance: 1000 }],
      transactions: [{ id: "t1", date: "2026-06-01", description: "Coffee", category: "Food", accountId: "a1", amount: -5 }],
      budgets: [],
      goals: [],
    };
    const remote = JSON.parse(JSON.stringify(local));

    const conflicts = detectConflicts(local, remote);
    expect(conflicts).toHaveLength(0);
  });

  it("flags a conflict when a transaction differs between local and remote", () => {
    const local = {
      accounts: [],
      transactions: [
        { id: "t1", date: "2026-06-01", description: "Coffee", category: "Food", accountId: "a1", amount: -5 },
      ],
      budgets: [],
      goals: [],
    };
    const remote = {
      accounts: [],
      transactions: [
        { id: "t1", date: "2026-06-01", description: "Coffee", category: "Food", accountId: "a1", amount: -7 },
      ],
      budgets: [],
      goals: [],
    };

    const conflicts = detectConflicts(local, remote);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].entityType).toBe("transaction");
    expect(conflicts[0].entityId).toBe("t1");
  });

  it("flags a conflict when local has an entity not in remote", () => {
    const local = {
      accounts: [],
      transactions: [
        { id: "t1", date: "2026-06-01", description: "Coffee", category: "Food", accountId: "a1", amount: -5 },
        { id: "t2", date: "2026-06-02", description: "Lunch", category: "Food", accountId: "a1", amount: -12 },
      ],
      budgets: [],
      goals: [],
    };
    const remote = {
      accounts: [],
      transactions: [
        { id: "t1", date: "2026-06-01", description: "Coffee", category: "Food", accountId: "a1", amount: -5 },
      ],
      budgets: [],
      goals: [],
    };

    const conflicts = detectConflicts(local, remote);
    expect(conflicts.length).toBeGreaterThanOrEqual(1);
    expect(conflicts.some((c) => c.entityId === "t2")).toBe(true);
  });

  it("flags a conflict when remote has an entity not in local", () => {
    const local = {
      accounts: [{ id: "a1", name: "Chequing", balance: 100 }],
      transactions: [],
      budgets: [],
      goals: [],
    };
    const remote = {
      accounts: [
        { id: "a1", name: "Chequing", balance: 100 },
        { id: "a2", name: "Savings", balance: 500 },
      ],
      transactions: [],
      budgets: [],
      goals: [],
    };

    const conflicts = detectConflicts(local, remote);
    const a2Conflict = conflicts.find((c) => c.entityId === "a2");
    expect(a2Conflict).toBeDefined();
    expect(a2Conflict!.entityType).toBe("account");
    expect(a2Conflict!.localVersion).toBeNull();
    expect(a2Conflict!.remoteVersion).toEqual(
      expect.objectContaining({ id: "a2", name: "Savings" }),
    );
  });

  it("flags conflicts across all entity types", () => {
    const local = {
      accounts: [{ id: "a1", name: "Chequing", balance: 100 }],
      transactions: [{ id: "t1", date: "2026-06-01", description: "A", category: "Food", accountId: "a1", amount: -5 }],
      budgets: [{ id: "b1", category: "Food", month: "2026-06", amount: 200 }],
      goals: [{ id: "g1", name: "Fund", targetAmount: 1000, currentAmount: 200, createdAt: "2026-01-01" }],
    };
    // Remote has different balances
    const remote = {
      accounts: [{ id: "a1", name: "Chequing", balance: 200 }],
      transactions: [{ id: "t1", date: "2026-06-01", description: "A", category: "Food", accountId: "a1", amount: -5 }],
      budgets: [{ id: "b1", category: "Food", month: "2026-06", amount: 300 }],
      goals: [{ id: "g1", name: "Fund", targetAmount: 1000, currentAmount: 500, createdAt: "2026-01-01" }],
    };

    const conflicts = detectConflicts(local, remote);
    expect(conflicts).toHaveLength(3);
    const types = conflicts.map((c) => c.entityType);
    expect(types).toContain("account");
    expect(types).toContain("budget");
    expect(types).toContain("goal");
  });
});

// ── Offline Changes / Re-sync Behavior ─────────────────

describe("detectConflicts — offline changes", () => {
  it("detects when both devices modified the same transaction", () => {
    // Device A (local) modifies the amount
    const local = {
      accounts: [],
      transactions: [
        { id: "t1", date: "2026-06-01", description: "Groceries", category: "Food", accountId: "a1", amount: -85 },
      ],
      budgets: [],
      goals: [],
    };
    // Device B (remote) modifies a different field on the same transaction
    const remote = {
      accounts: [],
      transactions: [
        { id: "t1", date: "2026-06-01", description: "Groceries (Costco)", category: "Food", accountId: "a1", amount: -80 },
      ],
      budgets: [],
      goals: [],
    };

    const conflicts = detectConflicts(local, remote);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].entityId).toBe("t1");
    expect(conflicts[0].entityType).toBe("transaction");
  });
});

// ── Duplicate Transaction Detection ────────────────────

describe("findDuplicateTransactions", () => {
  it("returns empty array when no duplicates", () => {
    const txs: Transaction[] = [
      { id: "1", date: "2026-06-01", description: "Coffee", category: "Food", accountId: "a1", amount: -5 },
      { id: "2", date: "2026-06-02", description: "Lunch", category: "Food", accountId: "a1", amount: -12 },
    ];
    expect(findDuplicateTransactions(txs)).toHaveLength(0);
  });

  it("detects duplicate by date, description, and amount", () => {
    const txs: Transaction[] = [
      { id: "1", date: "2026-06-01", description: "Coffee", category: "Food", accountId: "a1", amount: -5 },
      { id: "2", date: "2026-06-01", description: "Coffee", category: "Food", accountId: "a1", amount: -5 },
    ];

    const duplicates = findDuplicateTransactions(txs);
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].original.id).toBe("1");
    expect(duplicates[0].duplicate.id).toBe("2");
  });

  it("is case-insensitive on description", () => {
    const txs: Transaction[] = [
      { id: "1", date: "2026-06-01", description: "Coffee", category: "Food", accountId: "a1", amount: -5 },
      { id: "2", date: "2026-06-01", description: "coffee", category: "Food", accountId: "a1", amount: -5 },
    ];

    const duplicates = findDuplicateTransactions(txs);
    expect(duplicates).toHaveLength(1);
  });

  it("ignores whitespace differences in description", () => {
    const txs: Transaction[] = [
      { id: "1", date: "2026-06-01", description: "  Coffee  ", category: "Food", accountId: "a1", amount: -5 },
      { id: "2", date: "2026-06-01", description: "Coffee", category: "Food", accountId: "a1", amount: -5 },
    ];

    const duplicates = findDuplicateTransactions(txs);
    expect(duplicates).toHaveLength(1);
  });

  it("does not flag transactions with different amounts", () => {
    const txs: Transaction[] = [
      { id: "1", date: "2026-06-01", description: "Coffee", category: "Food", accountId: "a1", amount: -5 },
      { id: "2", date: "2026-06-01", description: "Coffee", category: "Food", accountId: "a1", amount: -6 },
    ];

    expect(findDuplicateTransactions(txs)).toHaveLength(0);
  });

  it("handles empty array", () => {
    expect(findDuplicateTransactions([])).toHaveLength(0);
  });
});

// ── Transaction Validation ─────────────────────────────

describe("validateTransaction", () => {
  it("returns valid for a complete transaction", () => {
    const tx: Transaction = {
      id: "1", date: "2026-06-01", description: "Coffee", category: "Food",
      accountId: "a1", amount: -5,
    };
    const result = validateTransaction(tx);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns errors for missing required fields", () => {
    const result = validateTransaction({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes("id"))).toBe(true);
    expect(result.errors.some((e) => e.includes("date"))).toBe(true);
    expect(result.errors.some((e) => e.includes("description"))).toBe(true);
  });

  it("returns error for empty description", () => {
    const tx = { id: "1", date: "2026-06-01", description: "", category: "Food", accountId: "a1", amount: -5 };
    const result = validateTransaction(tx);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Description cannot be empty");
  });

  it("returns error for NaN amount", () => {
    const tx = { id: "1", date: "2026-06-01", description: "Coffee", category: "Food", accountId: "a1", amount: NaN };
    const result = validateTransaction(tx);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Amount is NaN");
  });
});

// ── Account Reconciliation ─────────────────────────────

describe("reconcileAccounts", () => {
  it("returns empty when all balances match", () => {
    const accounts: Account[] = [
      { id: "a1", name: "Chequing", kind: "chequing", subtitle: "", balance: 500, currency: "CAD" },
    ];
    const transactions: Transaction[] = [
      { id: "t1", date: "2026-06-01", description: "Salary", category: "Income", accountId: "a1", amount: 1000 },
      { id: "t2", date: "2026-06-02", description: "Rent", category: "Housing", accountId: "a1", amount: -500 },
    ];

    const issues = reconcileAccounts(accounts, transactions);
    expect(issues).toHaveLength(0);
  });

  it("reports discrepancy between calculated and declared balance", () => {
    const accounts: Account[] = [
      { id: "a1", name: "Chequing", kind: "chequing", subtitle: "", balance: 1000, currency: "CAD" },
    ];
    const transactions: Transaction[] = [
      { id: "t1", date: "2026-06-01", description: "Deposit", category: "Income", accountId: "a1", amount: 500 },
    ];

    const issues = reconcileAccounts(accounts, transactions);
    expect(issues).toHaveLength(1);
    expect(issues[0].account.id).toBe("a1");
    expect(issues[0].calculatedBalance).toBe(500);
    expect(issues[0].declaredBalance).toBe(1000);
    expect(issues[0].difference).toBe(-500);
  });

  it("handles accounts with no transactions", () => {
    const accounts: Account[] = [
      { id: "a1", name: "Savings", kind: "savings", subtitle: "", balance: 0, currency: "CAD" },
    ];
    const issues = reconcileAccounts(accounts, []);
    expect(issues).toHaveLength(0);
  });

  it("skipped when declared balance is correct", () => {
    const accounts: Account[] = [
      { id: "a1", name: "Chequing", kind: "chequing", subtitle: "", balance: 2000, currency: "CAD" },
    ];
    const transactions: Transaction[] = [
      { id: "t1", date: "2026-06-01", description: "Opening", category: "Transfer", accountId: "a1", amount: 2000 },
    ];

    const issues = reconcileAccounts(accounts, transactions);
    expect(issues).toHaveLength(0);
  });
});

// ── Backup Payload Verification ────────────────────────

describe("verifyBackupPayload", () => {
  it("validates a correct backup payload", () => {
    const payload = {
      accounts: [{ id: "a1", name: "Chequing" }],
      transactions: [{ id: "t1", description: "Test", amount: -5 }],
      budgets: [],
      goals: [],
    };
    const result = verifyBackupPayload(payload);
    expect(result.valid).toBe(true);
  });

  it("rejects null or undefined payloads", () => {
    expect(verifyBackupPayload(null).valid).toBe(false);
    expect(verifyBackupPayload(undefined).valid).toBe(false);
  });

  it("rejects non-object payloads", () => {
    expect(verifyBackupPayload("string").valid).toBe(false);
    expect(verifyBackupPayload(42).valid).toBe(false);
  });

  it("reports missing entity arrays", () => {
    expect(verifyBackupPayload({}).valid).toBe(false);
  });
});

// ── Restore Verification ───────────────────────────────

describe("verifyRestore", () => {
  it("reports match when local and backup are identical", () => {
    const localData: LedgerData = {
      accounts: [],
      transactions: [],
      patterns: [],
      monthlySnapshots: [],
      memories: [],
      forecastItems: [],
      lifeCostEvents: [],
      budgets: [],
      goals: [],
      importSessions: [],
    };
    const backupData = {
      accounts: [],
      transactions: [],
      budgets: [],
      goals: [],
    };

    const result = verifyRestore(localData, backupData);
    expect(result.match).toBe(true);
  });

  it("reports a difference when entity counts do not match", () => {
    const localData: LedgerData = {
      accounts: [{ id: "a1", name: "Test", kind: "chequing", subtitle: "", balance: 0, currency: "CAD" }],
      transactions: [],
      patterns: [],
      monthlySnapshots: [],
      memories: [],
      forecastItems: [],
      lifeCostEvents: [],
      budgets: [],
      goals: [],
      importSessions: [],
    };
    const backupData = {
      accounts: [],
      transactions: [],
      budgets: [],
      goals: [],
    };

    const result = verifyRestore(localData, backupData);
    expect(result.match).toBe(false);
    expect(result.differences.length).toBeGreaterThan(0);
    expect(result.differences.some((d) => d.includes("accounts"))).toBe(true);
  });
});
