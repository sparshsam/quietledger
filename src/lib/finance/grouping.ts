import type { Transaction } from "@/lib/data/types";

export function groupByCategory(transactions: Transaction[]): Record<string, Transaction[]> {
  const groups: Record<string, Transaction[]> = {};
  for (const t of transactions) {
    if (!groups[t.category]) groups[t.category] = [];
    groups[t.category].push(t);
  }
  return groups;
}

export function groupByAccount(transactions: Transaction[]): Record<string, Transaction[]> {
  const groups: Record<string, Transaction[]> = {};
  for (const t of transactions) {
    if (!groups[t.accountId]) groups[t.accountId] = [];
    groups[t.accountId].push(t);
  }
  return groups;
}

export function groupByMonth(transactions: Transaction[]): Record<string, Transaction[]> {
  const groups: Record<string, Transaction[]> = {};
  for (const t of transactions) {
    const month = t.date.slice(0, 7);
    if (!groups[month]) groups[month] = [];
    groups[month].push(t);
  }
  return groups;
}

export function categoryTotals(
  transactions: Transaction[],
): Array<{ category: string; total: number }> {
  const grouped = groupByCategory(transactions);
  return Object.entries(grouped)
    .map(([category, txns]) => ({
      category,
      total: txns.reduce((sum, t) => sum + t.amount, 0),
    }))
    .sort((a, b) => a.total - b.total);
}

export function monthlyTotals(
  transactions: Transaction[],
): Array<{ month: string; income: number; expense: number }> {
  const grouped = groupByMonth(transactions);
  return Object.entries(grouped)
    .map(([month, txns]) => ({
      month,
      income: txns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
      expense: txns.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
