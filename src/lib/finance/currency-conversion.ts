// ─── Multi-Currency Finance Engine Layer ────────────────────────────────────
// Bridges the finance engine with the exchange rate system.
// Every displayed value must flow through these helpers — no inline conversion
// in React components.

import type { Account, CurrencySettings, Transaction } from "@/lib/data/types";
import { DEFAULT_BASE_CURRENCY, formatCurrency } from "./currency";
import { convertAmount, getCachedRate, isRateStale } from "./exchange-rates";

// ─── Currency Resolution ────────────────────────────────────────────────────

/**
 * Get the effective display currency for an entity.
 */
export function getDisplayCurrency(
  settings: CurrencySettings,
  entity?: { currency?: string },
): string {
  if (entity?.currency) return entity.currency;
  return settings.baseCurrency || DEFAULT_BASE_CURRENCY;
}

/**
 * Get an account's currency, with fallback to base currency.
 */
export function getAccountCurrency(
  account: Account,
  settings: CurrencySettings,
): string {
  return account.currency || settings.baseCurrency || DEFAULT_BASE_CURRENCY;
}

// ─── Transaction Conversion ─────────────────────────────────────────────────

/**
 * Convert a transaction's amount from its original currency to a target currency.
 * Returns the original amount if currencies match, or null if no rate is available.
 */
export function convertTransactionAmount(
  transaction: Transaction,
  targetCurrency: string,
): number | null {
  const sourceCurrency = transaction.originalCurrency;
  if (!sourceCurrency) return transaction.amount; // No currency info — pass through
  if (sourceCurrency.toUpperCase() === targetCurrency.toUpperCase())
    return transaction.amount; // Same currency — no conversion needed

  // Use original amount if available, else the transaction amount
  const sourceAmount = transaction.originalAmount ?? transaction.amount;
  return convertAmount(sourceAmount, sourceCurrency, targetCurrency);
}

/**
 * Convert all transactions' amounts to a target currency.
 * Returns converted values array in the same order.
 */
export function convertTransactionsToCurrency(
  transactions: Transaction[],
  targetCurrency: string,
): Array<{ transaction: Transaction; convertedAmount: number | null }> {
  return transactions.map((tx) => ({
    transaction: tx,
    convertedAmount: convertTransactionAmount(tx, targetCurrency),
  }));
}

// ─── Currency-Aware Finance Helpers ─────────────────────────────────────────

/**
 * Compute income in a specified target currency, converting as needed.
 */
export function computeIncomeInCurrency(
  transactions: Transaction[],
  targetCurrency: string,
): number {
  let total = 0;
  for (const tx of transactions) {
    const effectiveAmount = convertTransactionAmount(tx, targetCurrency) ?? tx.amount;
    if (effectiveAmount > 0) total += effectiveAmount;
  }
  return total;
}

/**
 * Compute expenses in a specified target currency, converting as needed.
 */
export function computeExpensesInCurrency(
  transactions: Transaction[],
  targetCurrency: string,
): number {
  let total = 0;
  for (const tx of transactions) {
    const effectiveAmount = convertTransactionAmount(tx, targetCurrency) ?? tx.amount;
    if (effectiveAmount < 0) total += Math.abs(effectiveAmount);
  }
  return total;
}

/**
 * Compute net cashflow in a specified target currency.
 */
export function computeCashflowInCurrency(
  transactions: Transaction[],
  targetCurrency: string,
): number {
  return (
    computeIncomeInCurrency(transactions, targetCurrency) -
    computeExpensesInCurrency(transactions, targetCurrency)
  );
}

/**
 * Compute month-scoped income in base currency.
 */
export function computeMonthIncomeInCurrency(
  transactions: Transaction[],
  month: string,
  targetCurrency: string,
): number {
  return computeIncomeInCurrency(
    transactions.filter((t) => t.date.startsWith(month)),
    targetCurrency,
  );
}

/**
 * Compute month-scoped expenses in base currency.
 */
export function computeMonthExpensesInCurrency(
  transactions: Transaction[],
  month: string,
  targetCurrency: string,
): number {
  return computeExpensesInCurrency(
    transactions.filter((t) => t.date.startsWith(month)),
    targetCurrency,
  );
}

/**
 * Compute month-scoped cashflow in base currency.
 */
export function computeMonthCashflowInCurrency(
  transactions: Transaction[],
  month: string,
  targetCurrency: string,
): number {
  return (
    computeMonthIncomeInCurrency(transactions, month, targetCurrency) -
    computeMonthExpensesInCurrency(transactions, month, targetCurrency)
  );
}

/**
 * Compute net worth in base currency, converting all account balances.
 */
export function computeNetWorthInCurrency(
  accounts: Account[],
  targetCurrency: string,
): number {
  let total = 0;
  for (const account of accounts) {
    if (account.archivedAt) continue;
    const accountCurrency = account.currency || DEFAULT_BASE_CURRENCY;
    if (accountCurrency.toUpperCase() === targetCurrency.toUpperCase()) {
      total += account.balance;
    } else {
      const converted = convertAmount(account.balance, accountCurrency, targetCurrency);
      total += converted ?? account.balance;
    }
  }
  return total;
}

// ─── Budget Helpers ─────────────────────────────────────────────────────────

/**
 * Compute budget progress (spent vs budgeted) in a target currency.
 */
export function computeBudgetProgressInCurrency(
  transactions: Transaction[],
  budgetAmount: number,
  category: string,
  month: string,
  targetCurrency: string,
): { spent: number; remaining: number; percentage: number } {
  const spent = Math.abs(
    computeExpensesInCurrency(
      transactions.filter(
        (t) => t.category === category && t.date.startsWith(month),
      ),
      targetCurrency,
    ),
  );

  return {
    spent,
    remaining: Math.max(0, budgetAmount - spent),
    percentage: budgetAmount > 0 ? Math.min(100, (spent / budgetAmount) * 100) : 0,
  };
}

// ─── Category Totals ────────────────────────────────────────────────────────

export type CategoryTotalInCurrency = {
  category: string;
  subcategory?: string;
  total: number;
  count: number;
  currency: string;
};

/**
 * Compute category spending totals in a target currency.
 */
export function computeCategoryTotalsInCurrency(
  transactions: Transaction[],
  targetCurrency: string,
): CategoryTotalInCurrency[] {
  const groups = new Map<string, { total: number; count: number; subcategory?: string }>();

  for (const tx of transactions) {
    if (tx.amount >= 0) continue; // Only expenses

    const key = tx.subcategory ? `${tx.category}:${tx.subcategory}` : tx.category;
    const existing = groups.get(key) || { total: 0, count: 0, subcategory: tx.subcategory };

    const converted = convertTransactionAmount(tx, targetCurrency) ?? tx.amount;
    existing.total += Math.abs(converted);
    existing.count += 1;
    groups.set(key, existing);
  }

  return [...groups.entries()]
    .map(([key, value]) => ({
      category: key.includes(":") ? key.split(":")[0] : key,
      subcategory: value.subcategory,
      total: value.total,
      count: value.count,
      currency: targetCurrency,
    }))
    .sort((a, b) => b.total - a.total);
}

// ─── Account Balance Conversion ─────────────────────────────────────────────

export type ConvertedBalance = {
  account: Account;
  originalBalance: number;
  convertedBalance: number;
  originalCurrency: string;
  displayCurrency: string;
  rate: number | null;
};

/**
 * Convert an account's balance to the display currency.
 */
export function convertAccountBalance(
  account: Account,
  displayCurrency: string,
): ConvertedBalance {
  const accountCurrency = account.currency || DEFAULT_BASE_CURRENCY;

  if (accountCurrency.toUpperCase() === displayCurrency.toUpperCase()) {
    return {
      account,
      originalBalance: account.balance,
      convertedBalance: account.balance,
      originalCurrency: accountCurrency,
      displayCurrency,
      rate: 1,
    };
  }

  const rate = getCachedRate(accountCurrency, displayCurrency);
  const converted = rate
    ? account.balance * rate.rate
    : account.balance;

  return {
    account,
    originalBalance: account.balance,
    convertedBalance: converted,
    originalCurrency: accountCurrency,
    displayCurrency,
    rate: rate?.rate ?? null,
  };
}

/**
 * Format conversion info for display.
 * "Original: €42.50 → Base: 45.92 USDC"
 */
export function formatConversionDisplay(
  originalAmount: number,
  originalCurrency: string,
  convertedAmount: number,
  targetCurrency: string,
): string {
  const src = formatCurrency(originalAmount, originalCurrency);
  const dst = formatCurrency(convertedAmount, targetCurrency);
  return `${src} → ${dst}`;
}

// ─── Amount Display Helper ──────────────────────────────────────────────────

/**
 * Get a display-ready amount for a transaction, considering currency conversion.
 * Returns both the original display and the converted display.
 */
export function getTransactionDisplayAmount(
  transaction: Transaction,
  displayCurrency: string,
): {
  primaryAmount: number;
  primaryCurrency: string;
  originalAmount?: number;
  originalCurrency?: string;
  showConversion: boolean;
  secondaryLine?: string;
} {
  const hasCurrencyInfo =
    transaction.originalCurrency &&
    transaction.originalCurrency !== displayCurrency;

  if (!hasCurrencyInfo) {
    return {
      primaryAmount: transaction.amount,
      primaryCurrency: displayCurrency,
      showConversion: false,
    };
  }

  const converted = convertTransactionAmount(transaction, displayCurrency);

  return {
    primaryAmount: converted ?? transaction.amount,
    primaryCurrency: displayCurrency,
    originalAmount: transaction.originalAmount ?? transaction.amount,
    originalCurrency: transaction.originalCurrency,
    showConversion: true,
    secondaryLine: converted
      ? formatConversionDisplay(
          transaction.originalAmount ?? transaction.amount,
          transaction.originalCurrency!,
          converted,
          displayCurrency,
        )
      : undefined,
  };
}

// ─── Async batch conversion ─────────────────────────────────────────────────

/**
 * Ensure exchange rates are fetched for any currencies present in transactions
 * that differ from the display currency.
 */
export async function ensureTransactionRates(
  transactions: Transaction[],
  displayCurrency: string,
): Promise<void> {
  const neededPairs = new Set<string>();

  for (const tx of transactions) {
    const sourceCurrency = tx.originalCurrency;
    if (!sourceCurrency) continue;
    if (sourceCurrency.toUpperCase() === displayCurrency.toUpperCase()) continue;

    // Only fetch if stale or missing
    const cached = getCachedRate(sourceCurrency, displayCurrency);
    if (!cached || isRateStale({ from: sourceCurrency, to: displayCurrency })) {
      neededPairs.add(`${sourceCurrency}:${displayCurrency}`);
    }
  }

  if (neededPairs.size === 0) return;

  // Batch fetch
  const { getExchangeRate } = await import("./exchange-rates");
  await Promise.allSettled(
    [...neededPairs].map(async (pair) => {
      const [from, to] = pair.split(":");
      await getExchangeRate(from, to);
    }),
  );
}
