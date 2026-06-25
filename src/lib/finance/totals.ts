import type { Account, Transaction } from "@/lib/data/types";
import { monthlyTotals } from "./grouping";

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

export function computeEffectiveNetWorth(accounts: Account[], transactions: Transaction[]): number {
  return accounts.reduce((sum, a) => sum + accountEffectiveBalance(a, transactions), 0);
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

export function computeMonthOverMonth(transactions: Transaction[], month: string): number | null {
  const months = monthlyTotals(transactions);
  const idx = months.findIndex((m) => m.month === month);
  if (idx < 1) return null;
  const current = months[idx].expense;
  const previous = months[idx - 1].expense;
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function computeCategoryMonthOverMonth(
  transactions: Transaction[],
  category: string,
  month: string,
): number | null {
  const current = transactions.filter((t) => t.category === category && t.date.startsWith(month));
  const currentExpense = Math.abs(current.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0));
  if (currentExpense === 0) return null;
  const prevMonth = `${Number(month.slice(0, 4))}-${String(Number(month.slice(5, 7)) - 1).padStart(2, "0")}`;
  if (prevMonth < "2000-01") return null;
  const previous = transactions.filter((t) => t.category === category && t.date.startsWith(prevMonth));
  const prevExpense = Math.abs(previous.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0));
  if (prevExpense === 0) return currentExpense > 0 ? null : null;
  return Math.round(((currentExpense - prevExpense) / prevExpense) * 100);
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
