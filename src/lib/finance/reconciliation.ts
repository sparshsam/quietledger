// ─── Account Reconciliation Engine ───────────────────────────────────────────
// Reconciliation workflow, opening/closing balances, balance adjustments,
// statement reconciliation, reconciliation history, account health.

import type { Account, Transaction } from "@/lib/data/types";

// ─── Types ─────────────────────────────────────────────────────────────────

export type ReconciliationStatus = "open" | "in_progress" | "reconciled";

export type Reconciliation = {
  id: string;
  accountId: string;
  status: ReconciliationStatus;
  openedAt: string;
  completedAt?: string;
  openingBalance: number;
  closingBalance: number;
  calculatedBalance: number;
  difference: number;
  transactionIds: string[];
  statementBalance?: number;
  statementDate?: string;
  adjustments: BalanceAdjustment[];
};

export type BalanceAdjustment = {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  reason: string;
  type: "correction" | "fee" | "interest" | "rounding" | "opening" | "closing";
};

export type AccountHealth = {
  accountId: string;
  accountName: string;
  /** Overall health score 0–100 */
  score: number;
  /** Whether the account has been reconciled recently */
  reconciliationStatus: ReconciliationStatus;
  /** Days since last reconciliation */
  daysSinceReconciliation: number | null;
  /** Balance trend direction */
  balanceTrend: "increasing" | "decreasing" | "stable";
  /** Whether there's a balance discrepancy */
  hasDiscrepancy: boolean;
  /** Number of uncleared/pending transactions */
  unclearedCount: number;
  /** Whether the account has had recent activity */
  isActive: boolean;
  /** Flags for attention */
  flags: AccountHealthFlag[];
};

export type AccountHealthFlag = {
  type: "warning" | "critical" | "info";
  message: string;
};

// ─── Reconciliation Store ──────────────────────────────────────────────────

const RECONCILIATION_STORAGE_KEY = "openledger.reconciliations";

export function loadReconciliations(): Reconciliation[] {
  try {
    const raw = localStorage.getItem(RECONCILIATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveReconciliations(reconciliations: Reconciliation[]): void {
  try {
    localStorage.setItem(RECONCILIATION_STORAGE_KEY, JSON.stringify(reconciliations));
  } catch {
    // Non-critical
  }
}

// ─── Reconciliation Workflow ────────────────────────────────────────────────

/**
 * Start a new reconciliation session for an account.
 */
export function startReconciliation(
  account: Account,
  transactions: Transaction[],
  existingReconciliations: Reconciliation[] = [],
): Reconciliation {
  const previous = getLastReconciliation(account.id, existingReconciliations);
  const openingBalance = previous?.closingBalance ?? account.balance;

  const accountTxns = transactions.filter((t) => t.accountId === account.id);
  const calculatedBalance = accountTxns.reduce((s, t) => s + t.amount, 0);

  const reconciliation: Reconciliation = {
    id: `recon-${crypto.randomUUID()}`,
    accountId: account.id,
    status: "in_progress",
    openedAt: new Date().toISOString(),
    openingBalance,
    closingBalance: account.balance,
    calculatedBalance,
    difference: Math.round((calculatedBalance - account.balance) * 100) / 100,
    transactionIds: accountTxns.map((t) => t.id),
    adjustments: [],
  };

  return reconciliation;
}

/**
 * Complete a reconciliation, setting status to reconciled.
 */
export function completeReconciliation(
  reconciliation: Reconciliation,
  statementBalance?: number,
  statementDate?: string,
): Reconciliation {
  return {
    ...reconciliation,
    status: "reconciled",
    completedAt: new Date().toISOString(),
    closingBalance: reconciliation.calculatedBalance,
    difference: statementBalance !== undefined
      ? Math.round((reconciliation.calculatedBalance - statementBalance) * 100) / 100
      : reconciliation.difference,
    statementBalance,
    statementDate: statementDate ?? reconciliation.statementDate,
  };
}

/**
 * Add a balance adjustment to a reconciliation.
 */
export function addAdjustment(
  reconciliation: Reconciliation,
  adjustment: Omit<BalanceAdjustment, "id" | "accountId">,
): Reconciliation {
  const newAdjustment: BalanceAdjustment = {
    id: `adj-${crypto.randomUUID()}`,
    accountId: reconciliation.accountId,
    ...adjustment,
  };

  const newBalance = reconciliation.calculatedBalance + adjustment.amount;

  return {
    ...reconciliation,
    adjustments: [...reconciliation.adjustments, newAdjustment],
    calculatedBalance: Math.round(newBalance * 100) / 100,
    difference: Math.round((newBalance - reconciliation.closingBalance) * 100) / 100,
  };
}

/**
 * Get the last completed reconciliation for an account.
 */
export function getLastReconciliation(
  accountId: string,
  reconciliations: Reconciliation[],
): Reconciliation | null {
  return reconciliations
    .filter((r) => r.accountId === accountId && r.status === "reconciled")
    .sort((a, b) => new Date(b.completedAt ?? "").getTime() - new Date(a.completedAt ?? "").getTime())[0] ?? null;
}

/**
 * Get reconciliation history for an account.
 */
export function getReconciliationHistory(
  accountId: string,
  reconciliations: Reconciliation[],
): Reconciliation[] {
  return reconciliations
    .filter((r) => r.accountId === accountId)
    .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
}

/**
 * Calculate the opening balance for a given period.
 */
export function calculateOpeningBalance(
  accountId: string,
  transactions: Transaction[],
  startDate: string,
): number {
  return transactions
    .filter((t) => t.accountId === accountId && t.date < startDate)
    .reduce((s, t) => s + t.amount, 0);
}

/**
 * Calculate the closing balance for a given period.
 */
export function calculateClosingBalance(
  accountId: string,
  transactions: Transaction[],
  endDate: string,
): number {
  return transactions
    .filter((t) => t.accountId === accountId && t.date <= endDate)
    .reduce((s, t) => s + t.amount, 0);
}

// ─── Statement Reconciliation ───────────────────────────────────────────────

export type StatementReconciliation = {
  accountId: string;
  statementBalance: number;
  statementDate: string;
  ledgerBalance: number;
  difference: number;
  /** Transactions in ledger but not in statement */
  missingFromStatement: Transaction[];
  /** Transactions in statement but not in ledger */
  missingFromLedger: Transaction[];
  status: "matched" | "minor_difference" | "major_difference";
};

/**
 * Reconcile a bank statement against the ledger.
 * matchedTxns are transactions the user has confirmed appear on the statement.
 */
export function reconcileStatement(
  accountId: string,
  statementBalance: number,
  statementDate: string,
  transactions: Transaction[],
  matchedTransactionIds: string[],
): StatementReconciliation {
  const accountTxns = transactions.filter((t) => t.accountId === accountId && t.date <= statementDate);
  const ledgerBalance = accountTxns.reduce((s, t) => s + t.amount, 0);
  const difference = Math.round((ledgerBalance - statementBalance) * 100) / 100;

  // Find transactions not on the statement
  const matchedSet = new Set(matchedTransactionIds);
  const missingFromStatement = accountTxns.filter((t) => !matchedSet.has(t.id));

  // Determine severity
  let status: StatementReconciliation["status"];
  const absDiff = Math.abs(difference);
  if (absDiff <= 0.01) status = "matched";
  else if (absDiff <= 10) status = "minor_difference";
  else status = "major_difference";

  return {
    accountId,
    statementBalance,
    statementDate,
    ledgerBalance,
    difference,
    missingFromStatement,
    missingFromLedger: [], // Would come from bank statement data
    status,
  };
}

// ─── Account Health ────────────────────────────────────────────────────────

/**
 * Assess the health of all active accounts.
 */
export function assessAccountHealth(
  accounts: Account[],
  transactions: Transaction[],
  reconciliations: Reconciliation[],
): AccountHealth[] {
  return accounts
    .filter((a) => !a.archivedAt)
    .map((account) => assessSingleAccountHealth(account, transactions, reconciliations));
}

/**
 * Assess health for a single account.
 */
export function assessSingleAccountHealth(
  account: Account,
  transactions: Transaction[],
  reconciliations: Reconciliation[],
): AccountHealth {
  const flags: AccountHealthFlag[] = [];
  const accountTxns = transactions.filter((t) => t.accountId === account.id);
  const lastReconciliation = getLastReconciliation(account.id, reconciliations);

  // Reconciliation status
  const reconStatus: ReconciliationStatus = lastReconciliation?.status ?? "open";

  // Days since last reconciliation
  const daysSinceReconciliation = lastReconciliation?.completedAt
    ? Math.floor((Date.now() - new Date(lastReconciliation.completedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (daysSinceReconciliation !== null && daysSinceReconciliation > 90) {
    flags.push({ type: "warning", message: `Not reconciled in ${daysSinceReconciliation} days` });
  }

  // Balance trend
  const recentTxns = accountTxns.slice(-20);
  const recentCount = recentTxns.length;
  const positiveCount = recentTxns.filter((t) => t.amount > 0).length;
  const negativeCount = recentTxns.filter((t) => t.amount < 0).length;

  let balanceTrend: AccountHealth["balanceTrend"];
  if (recentCount < 3) balanceTrend = "stable";
  else if (positiveCount > negativeCount * 1.5) balanceTrend = "increasing";
  else if (negativeCount > positiveCount * 1.5) balanceTrend = "decreasing";
  else balanceTrend = "stable";

  // Balance discrepancy
  const calculatedBalance = accountTxns.reduce((s, t) => s + t.amount, 0);
  const hasDiscrepancy = Math.abs(calculatedBalance - account.balance) > 0.01;

  if (hasDiscrepancy) {
    flags.push({ type: "critical", message: "Balance discrepancy detected" });
  }

  // Uncleared items (manual transactions that haven't been reconciled)
  const unclearedCount = accountTxns.filter((t) => t.source === "manual").length;

  // Active status
  const lastActivity = accountTxns.length > 0
    ? accountTxns.sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;
  const isActive = lastActivity
    ? (Date.now() - new Date(lastActivity.date).getTime()) / (1000 * 60 * 60 * 24) < 90
    : false;

  // Low balance warning
  if (account.kind === "chequing" && account.balance < 100 && account.balance >= 0) {
    flags.push({ type: "warning", message: "Low balance (under $100)" });
  }

  // Negative balance for non-liability accounts
  if (account.balance < 0 && !["credit-card", "credit", "loan"].includes(account.kind)) {
    flags.push({ type: "critical", message: "Negative balance on non-liability account" });
  }

  // Score computation
  let score = 100;
  if (hasDiscrepancy) score -= 30;
  if (reconStatus === "open") score -= 15;
  if (daysSinceReconciliation !== null && daysSinceReconciliation > 60) score -= Math.min(20, Math.floor(daysSinceReconciliation / 30));
  if (!isActive && accountTxns.length > 0) score -= 10;
  if (unclearedCount > 10) score -= 5;
  score = Math.max(0, Math.min(100, score));

  return {
    accountId: account.id,
    accountName: account.name,
    score,
    reconciliationStatus: reconStatus,
    daysSinceReconciliation,
    balanceTrend,
    hasDiscrepancy,
    unclearedCount,
    isActive,
    flags,
  };
}

// ─── Account Filtering ─────────────────────────────────────────────────────

export type AccountFilter = {
  search?: string;
  kinds?: string[];
  currencies?: string[];
  minBalance?: number;
  maxBalance?: number;
  healthStatus?: "good" | "warning" | "critical";
  showArchived?: boolean;
};

/**
 * Filter accounts by multiple criteria.
 */
export function filterAccounts(
  accounts: Account[],
  filter: AccountFilter,
  healthMap?: Map<string, AccountHealth>,
): Account[] {
  return accounts.filter((account) => {
    // Search
    if (filter.search) {
      const q = filter.search.toLowerCase();
      if (!account.name.toLowerCase().includes(q) && !account.subtitle.toLowerCase().includes(q)) {
        return false;
      }
    }

    // Kinds
    if (filter.kinds && filter.kinds.length > 0 && !filter.kinds.includes(account.kind)) return false;

    // Currencies
    if (filter.currencies && filter.currencies.length > 0 && !filter.currencies.includes(account.currency)) return false;

    // Archive
    if (!filter.showArchived && account.archivedAt) return false;

    // Balance
    if (filter.minBalance !== undefined && account.balance < filter.minBalance) return false;
    if (filter.maxBalance !== undefined && account.balance > filter.maxBalance) return false;

    // Health
    if (filter.healthStatus && healthMap) {
      const health = healthMap.get(account.id);
      if (!health) return false;
      if (filter.healthStatus === "good" && health.score < 70) return false;
      if (filter.healthStatus === "warning" && (health.score >= 70 || health.score < 40)) return false;
      if (filter.healthStatus === "critical" && health.score >= 40) return false;
    }

    return true;
  });
}
