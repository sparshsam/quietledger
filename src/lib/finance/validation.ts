/**
 * Data Integrity & Validation Utilities — v0.9.7
 *
 * Pure functions for duplicate detection, field validation, account reconciliation,
 * and backup/restore verification. No side effects — safe to use anywhere.
 */

import type { Transaction, Account, LedgerData } from "@/lib/data/types";

// ── Duplicate Detection ───────────────────────────────

/**
 * Find duplicate transactions based on matching date, description, and amount.
 * Returns an array of { original, duplicate, reason } tuples.
 */
export function findDuplicateTransactions(
  transactions: Transaction[],
): Array<{ original: Transaction; duplicate: Transaction; reason: string }> {
  const results: Array<{
    original: Transaction;
    duplicate: Transaction;
    reason: string;
  }> = [];
  const seen = new Set<string>();

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const key = makeDedupKey(tx);

    if (seen.has(key)) {
      // Find the first occurrence that matches this key
      const original = transactions.find(
        (t, idx) => idx < i && makeDedupKey(t) === key,
      );
      if (original) {
        results.push({
          original,
          duplicate: tx,
          reason: `Same date (${tx.date}), description ("${tx.description}"), and amount (${tx.amount}) as transaction ${original.id}`,
        });
      }
    }
    seen.add(key);
  }

  return results;
}

function makeDedupKey(tx: Transaction): string {
  return `${tx.date}|${tx.description.toLowerCase().trim()}|${tx.amount}`;
}

// ── Transaction Validation ────────────────────────────

const REQUIRED_TRANSACTION_FIELDS: Array<keyof Transaction> = [
  "id",
  "date",
  "description",
  "category",
  "accountId",
  "amount",
];

/**
 * Validate that a transaction-like object has all required fields with valid values.
 */
export function validateTransaction(
  tx: Partial<Transaction>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const field of REQUIRED_TRANSACTION_FIELDS) {
    const value = tx[field];
    if (value === undefined || value === null) {
      errors.push(`Missing required field: ${field}`);
    } else if (field === "description" && typeof value === "string" && value.trim().length === 0) {
      errors.push("Description cannot be empty");
    } else if (field === "date" && typeof value === "string") {
      const d = new Date(value);
      if (isNaN(d.getTime())) {
        errors.push("Date is not a valid ISO date string");
      }
    } else if (field === "amount" && typeof value === "number" && isNaN(value)) {
      errors.push("Amount is NaN");
    }
  }

  // Validate note type if present
  if (tx.note !== undefined && typeof tx.note !== "string") {
    errors.push("Note must be a string");
  }

  return { valid: errors.length === 0, errors };
}

// ── Account Reconciliation ────────────────────────────

/**
 * Reconcile accounts by comparing calculated balances (from transactions)
 * against declared balances. Returns a list of discrepancies.
 */
export function reconcileAccounts(
  accounts: Account[],
  transactions: Transaction[],
): Array<{
  account: Account;
  calculatedBalance: number;
  declaredBalance: number;
  difference: number;
}> {
  const results: Array<{
    account: Account;
    calculatedBalance: number;
    declaredBalance: number;
    difference: number;
  }> = [];

  // Compute running balance per account from transactions
  const balanceMap = new Map<string, number>();
  for (const tx of transactions) {
    const current = balanceMap.get(tx.accountId) ?? 0;
    balanceMap.set(tx.accountId, current + tx.amount);
  }

  for (const account of accounts) {
    const calculatedBalance = balanceMap.get(account.id) ?? 0;
    const difference = calculatedBalance - account.balance;
    if (Math.abs(difference) > 0.001) {
      results.push({
        account,
        calculatedBalance: Math.round(calculatedBalance * 100) / 100,
        declaredBalance: account.balance,
        difference: Math.round(difference * 100) / 100,
      });
    }
  }

  return results;
}

// ── Backup Verification ───────────────────────────────

/**
 * Verify that a backup payload has the expected structure and valid data.
 */
export function verifyBackupPayload(
  payload: unknown,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (payload === null || payload === undefined) {
    return { valid: false, errors: ["Backup payload is null or undefined"] };
  }

  if (typeof payload !== "object") {
    return { valid: false, errors: ["Backup payload must be an object"] };
  }

  const p = payload as Record<string, unknown>;

  // Check for required entity arrays
  const requiredArrays = ["accounts", "transactions", "budgets", "goals"] as const;
  for (const key of requiredArrays) {
    if (!Array.isArray(p[key])) {
      errors.push(`Missing or invalid "${key}" — expected an array`);
    }
  }

  // Validate a sample of transaction entries if present
  if (Array.isArray(p.transactions)) {
    for (let i = 0; i < Math.min(p.transactions.length, 5); i++) {
      const tx = p.transactions[i] as Record<string, unknown>;
      if (!tx || typeof tx.id !== "string") {
        errors.push(`Transaction at index ${i} is missing a valid "id" field`);
      }
      if (!tx || typeof tx.amount !== "number") {
        errors.push(`Transaction at index ${i} is missing a valid "amount" field`);
      }
    }
  }

  // Validate a sample of account entries if present
  if (Array.isArray(p.accounts)) {
    for (let i = 0; i < Math.min(p.accounts.length, 5); i++) {
      const acct = p.accounts[i] as Record<string, unknown>;
      if (!acct || typeof acct.name !== "string") {
        errors.push(`Account at index ${i} is missing a valid "name" field`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ── Restore Verification ──────────────────────────────

/**
 * Verify a restore operation by comparing local data to backup data.
 * Returns whether they match and a list of specific differences.
 */
export function verifyRestore(
  localData: LedgerData,
  backupData: unknown,
): { match: boolean; differences: string[] } {
  const differences: string[] = [];

  if (!backupData || typeof backupData !== "object") {
    return {
      match: false,
      differences: ["Backup data is not a valid object"],
    };
  }

  const backup = backupData as Record<string, unknown>;

  // Compare entity counts
  const countChecks: Array<{ key: string; local: number; remote: unknown }> = [
    { key: "accounts", local: localData.accounts.length, remote: backup.accounts },
    { key: "transactions", local: localData.transactions.length, remote: backup.transactions },
    { key: "budgets", local: localData.budgets.length, remote: backup.budgets },
    { key: "goals", local: localData.goals.length, remote: backup.goals },
  ];

  for (const check of countChecks) {
    if (!Array.isArray(check.remote)) {
      differences.push(`Backup "${check.key}" is not an array`);
      continue;
    }
    if (check.local !== check.remote.length) {
      differences.push(
        `${check.key} count mismatch: local has ${check.local}, backup has ${check.remote.length}`,
      );
    }
  }

  // Sample-compare first few IDs from each entity type
  const idChecks: Array<{
    key: string;
    localEntities: { id: string }[];
    remoteEntities: unknown;
  }> = [
    { key: "accounts", localEntities: localData.accounts, remoteEntities: backup.accounts },
    { key: "transactions", localEntities: localData.transactions, remoteEntities: backup.transactions },
    { key: "budgets", localEntities: localData.budgets, remoteEntities: backup.budgets },
    { key: "goals", localEntities: localData.goals, remoteEntities: backup.goals },
  ];

  for (const check of idChecks) {
    if (!Array.isArray(check.remoteEntities)) continue;
    if (check.localEntities.length === 0 && check.remoteEntities.length === 0) continue;

    const localIds = new Set(check.localEntities.map((e) => e.id));
    const remoteIds = new Set(
      (check.remoteEntities as Array<Record<string, unknown>>).map((e) => String(e.id ?? "")),
    );

    // Check for IDs in local but not in remote
    for (const id of localIds) {
      if (!remoteIds.has(id)) {
        // Only flag if the remote array is non-empty (partial restore)
        if (check.remoteEntities.length > 0) {
          differences.push(`${check.key}: ID "${id}" exists locally but is missing from backup`);
        }
      }
    }
  }

  return {
    match: differences.length === 0,
    differences,
  };
}
