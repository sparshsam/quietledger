import type { Account, Transaction } from "@/lib/data/types";

export function computeIncome(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
}

export function computeExpenses(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

export function computeNetCashflow(transactions: Transaction[]): number {
  return computeIncome(transactions) - computeExpenses(transactions);
}

export function computeNetWorth(accounts: Account[]): number {
  return accounts.reduce((sum, a) => sum + a.balance, 0);
}

function inMonth(transactions: Transaction[], month: string): Transaction[] {
  return transactions.filter((t) => t.date.startsWith(month));
}

export function computeMonthIncome(transactions: Transaction[], month: string): number {
  return inMonth(transactions, month)
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
}

export function computeMonthExpenses(transactions: Transaction[], month: string): number {
  return inMonth(transactions, month)
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

export function computeMonthCashflow(transactions: Transaction[], month: string): number {
  return computeMonthIncome(transactions, month) - computeMonthExpenses(transactions, month);
}

export function accountEffectiveBalance(
  account: Account,
  transactions: Transaction[],
): number {
  return (
    account.balance +
    transactions
      .filter((t) => t.accountId === account.id && (t.source === "csv" || t.source === "manual"))
      .reduce((sum, t) => sum + t.amount, 0)
  );
}
