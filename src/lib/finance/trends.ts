import type { Transaction } from "@/lib/data/types";
import { monthlyTotals } from "./grouping";

export function monthlyTrend(
  transactions: Transaction[],
): Array<{ month: string; income: number; expense: number; net: number }> {
  return monthlyTotals(transactions).map((m) => ({
    month: m.month,
    income: m.income,
    expense: m.expense,
    net: m.income - m.expense,
  }));
}
