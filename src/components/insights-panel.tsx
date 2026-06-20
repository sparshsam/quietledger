"use client";

import type { Account, Transaction } from "@/lib/data/types";
import {
  largestExpenseThisMonth,
  topSpendingCategory,
  monthOverMonthChange,
  findRecurringTransactions,
  lowBalanceAlerts,
} from "@/lib/finance/insights";
import { AlertTriangle, ArrowUp, ArrowDown, RefreshCw, WalletCards } from "lucide-react";

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

export function InsightsPanel({
  accounts,
  transactions,
}: {
  accounts: Account[];
  transactions: Transaction[];
}) {
  const largestExpense = largestExpenseThisMonth(transactions);
  const topCategory = topSpendingCategory(transactions);
  const momChange = monthOverMonthChange(transactions);
  const recurring = findRecurringTransactions(transactions);
  const alerts = lowBalanceAlerts(accounts, transactions);

  const hasAny = largestExpense || topCategory || momChange !== null || recurring.length > 0 || alerts.length > 0;

  if (!hasAny) {
    return (
      <div className="insights-panel-body">
        <p className="insights-empty">Add transactions to see financial insights.</p>
      </div>
    );
  }

  return (
    <div className="insights-panel-body">
      {largestExpense ? (
        <div className="insight-card">
          <AlertTriangle size={18} className="insight-icon-expense" />
          <div>
            <strong>Largest expense this month</strong>
            <p>{largestExpense.description} &mdash; {currency.format(Math.abs(largestExpense.amount))}</p>
          </div>
        </div>
      ) : null}

      {topCategory ? (
        <div className="insight-card">
          <ArrowDown size={18} className="insight-icon-expense" />
          <div>
            <strong>Top spending category</strong>
            <p>{topCategory.category} &mdash; {currency.format(Math.abs(topCategory.total))}</p>
          </div>
        </div>
      ) : null}

      {momChange !== null ? (
        <div className="insight-card">
          {momChange > 0 ? <ArrowUp size={18} className="insight-icon-warn" /> : <ArrowDown size={18} className="insight-icon-save" />}
          <div>
            <strong>Month-over-month spending</strong>
            <p>{momChange > 0 ? "+" : ""}{momChange.toFixed(1)}% vs last month</p>
          </div>
        </div>
      ) : null}

      {recurring.length > 0 ? (
        <div className="insight-card">
          <RefreshCw size={18} className="insight-icon-recur" />
          <div>
            <strong>Possible recurring transactions</strong>
            <p>{recurring.slice(0, 3).map((r) => r.description).join(", ")}{recurring.length > 3 ? ` +${recurring.length - 3} more` : ""}</p>
          </div>
        </div>
      ) : null}

      {alerts.length > 0 ? (
        <div className="insight-card">
          <WalletCards size={18} className="insight-icon-warn" />
          <div>
            <strong>Low balance warnings</strong>
            <p>{alerts.map((a) => `${a.accountName} (${currency.format(a.balance)})`).join(", ")}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
