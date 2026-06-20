"use client";

import type { Account, Transaction } from "@/lib/data/types";
import { computeIncome, computeExpenses, computeNetCashflow, computeNetWorth } from "@/lib/finance/totals";

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

export function DashboardSummary({
  accounts,
  transactions,
}: {
  accounts: Account[];
  transactions: Transaction[];
}) {
  const income = computeIncome(transactions);
  const expenses = computeExpenses(transactions);
  const cashflow = computeNetCashflow(transactions);
  const netWorth = computeNetWorth(accounts);

  type Tone = "positive" | "negative" | "neutral";

  const cards: Array<{ label: string; amount: number; tone: Tone }> = [
    { label: "Income", amount: income, tone: income > 0 ? "positive" : "neutral" },
    { label: "Expenses", amount: expenses, tone: "negative" },
    { label: "Net cash flow", amount: cashflow, tone: cashflow >= 0 ? "positive" : "negative" },
    { label: "Net worth", amount: netWorth, tone: netWorth >= 0 ? "positive" : "negative" },
  ];

  return (
    <div className="summary-grid" role="region" aria-label="Financial summary">
      {cards.map((card) => (
        <div className="summary-card" key={card.label}>
          <span className="summary-label">{card.label}</span>
          <strong className={card.tone}>{currency.format(card.amount)}</strong>
        </div>
      ))}
    </div>
  );
}
