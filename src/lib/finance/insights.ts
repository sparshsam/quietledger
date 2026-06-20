import type { Account, Transaction } from "@/lib/data/types";
import { categoryTotals, monthlyTotals } from "./grouping";
import { accountEffectiveBalance } from "./totals";

const LOW_BALANCE_THRESHOLD = 100;

export function largestExpenseThisMonth(
  transactions: Transaction[],
): { description: string; amount: number } | null {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthTxns = transactions.filter((t) => t.date.startsWith(currentMonth) && t.amount < 0);
  if (monthTxns.length === 0) return null;
  const largest = monthTxns.reduce((a, b) => (a.amount < b.amount ? a : b));
  return { description: largest.description, amount: largest.amount };
}

export function topSpendingCategory(
  transactions: Transaction[],
): { category: string; total: number } | null {
  const totals = categoryTotals(transactions).filter((t) => t.total < 0);
  if (totals.length === 0) return null;
  return totals.reduce((a, b) => (a.total < b.total ? a : b));
}

export function monthOverMonthChange(
  transactions: Transaction[],
): number | null {
  const months = monthlyTotals(transactions).filter((m) => m.expense > 0);
  if (months.length < 2) return null;
  const last = months[months.length - 1];
  const prev = months[months.length - 2];
  if (prev.expense === 0) return null;
  return Math.round(((last.expense - prev.expense) / prev.expense) * 100 * 100) / 100;
}

export function findRecurringTransactions(
  transactions: Transaction[],
): Array<{ description: string; amount: number; count: number }> {
  const seen = new Map<string, { description: string; amount: number; count: number }>();
  for (const t of transactions) {
    const key = `${t.description}|${t.amount}`;
    if (seen.has(key)) {
      seen.get(key)!.count++;
    } else {
      seen.set(key, { description: t.description, amount: t.amount, count: 1 });
    }
  }
  return Array.from(seen.values()).filter((r) => r.count >= 2);
}

export function lowBalanceAlerts(
  accounts: Account[],
  transactions: Transaction[],
): Array<{ accountName: string; balance: number }> {
  return accounts
    .filter((a) => !a.archivedAt)
    .map((a) => ({
      accountName: a.name,
      balance: accountEffectiveBalance(a, transactions),
    }))
    .filter((a) => a.balance >= 0 && a.balance < LOW_BALANCE_THRESHOLD);
}
