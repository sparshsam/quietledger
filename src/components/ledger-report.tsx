"use client";

import { useMemo } from "react";
import type { Account, Transaction, Budget } from "@/lib/data/types";
import {
  computeMonthIncome,
  computeMonthExpenses,
  computeMonthCashflow,
  computeMonthOverMonth,
  computeNetWorth,
  computeEffectiveNetWorth,
} from "@/lib/finance/totals";
import { categoryTotals, monthlyTotals } from "@/lib/finance/grouping";
import { budgetUtilization, remainingBudget, isOverBudget } from "@/lib/finance/budgets";
import { IncomeVsExpensesChart } from "@/components/charts/income-vs-expenses";
import { SpendingByCategoryChart } from "@/components/charts/spending-by-category";
import { MonthlyTrendChart } from "@/components/charts/monthly-trend";

const currency = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

type LedgerReportProps = {
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  month: string;
  activeCategory: string | null;
  activeAccountId: string | null;
  onCategoryFilter: (category: string | null) => void;
};

export function LedgerReport({
  transactions,
  accounts,
  budgets,
  month,
  activeCategory,
  activeAccountId,
  onCategoryFilter,
}: LedgerReportProps) {
  // Filter by month AND account
  const filteredTxns = useMemo(() => {
    let txns = transactions;
    if (activeAccountId) txns = txns.filter((t) => t.accountId === activeAccountId);
    return txns;
  }, [transactions, activeAccountId]);

  const monthlyTxns = useMemo(
    () => filteredTxns.filter((t) => t.date.startsWith(month)),
    [filteredTxns, month],
  );

  const income = computeMonthIncome(monthlyTxns, month);
  const expenses = computeMonthExpenses(monthlyTxns, month);
  const remaining = computeMonthCashflow(monthlyTxns, month);
  const vsLastMonth = computeMonthOverMonth(filteredTxns, month);

  const categories = useMemo(() => {
    const expenseTxns = monthlyTxns.filter((t) => t.amount < 0);
    const total = Math.abs(expenseTxns.reduce((s, t) => s + t.amount, 0));
    const grouped = categoryTotals(expenseTxns);
    return grouped.map(({ category, total: catTotal }) => ({
      category,
      spent: Math.abs(catTotal),
      pct: total > 0 ? Math.round((Math.abs(catTotal) / total) * 100) : 0,
    }));
  }, [monthlyTxns]);

  const netWorth = computeEffectiveNetWorth(accounts, monthlyTxns);

  const catData = useMemo(() => {
    return categories.map(({ category, spent }) => ({
      category,
      total: -spent,  // convert back to negative for chart
    }));
  }, [categories]);

  const periodData = useMemo(() => {
    return monthlyTotals(monthlyTxns).map((m) => ({
      label: new Date(`${m.month}-01T12:00:00`).toLocaleString("default", {
        month: "short",
      }),
      income: m.income,
      expense: m.expense,
    }));
  }, [monthlyTxns]);

  const trendData = useMemo(() => {
    return monthlyTotals(filteredTxns)
      .slice(-6)
      .map((m) => ({
        month: m.month,
        income: m.income,
        expense: m.expense,
        net: m.income - m.expense,
      }));
  }, [filteredTxns]);

  return (
    <>
      {/* Summary Strip — numbers first */}
      <div className="month-summary">
        <div className="month-summary-item">
          <span className="month-summary-value positive">
            {currency.format(income)}
          </span>
          <span className="month-summary-label">Income</span>
        </div>
        <div className="month-summary-item">
          <span className="month-summary-value negative">
            {currency.format(expenses)}
          </span>
          <span className="month-summary-label">Spent</span>
        </div>
        <div className="month-summary-item">
          <span
            className={
              "month-summary-value " + (remaining >= 0 ? "positive" : "negative")
            }
          >
            {currency.format(remaining)}
          </span>
          <span className="month-summary-label">Remaining</span>
        </div>
      </div>

      {vsLastMonth !== null && (
        <div className="month-comparison">
          <span className={vsLastMonth > 0 ? "negative" : "positive"}>
            {vsLastMonth > 0 ? "▲" : "▼"} {Math.abs(vsLastMonth)}% vs
            last month
          </span>
        </div>
      )}

      {/* Where Did My Money Go? — signature section */}
      <section className="report-section">
        <h2 className="section-title">Where did my money go?</h2>
        <div className="category-breakdown">
          {categories.length === 0 ? (
            <div
              className="empty-state"
              style={{ textAlign: "center", padding: "var(--space-xl) 0" }}
            >
              <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                No spending data this month. Import a statement to begin.
              </p>
            </div>
          ) : (
            categories.map(({ category, spent }) => (
              <button
                key={category}
                className={
                  "category-row" + (activeCategory === category ? " active" : "")
                }
                onClick={() =>
                  onCategoryFilter(
                    activeCategory === category ? null : category,
                  )
                }
              >
                <span className="category-row-name">{category}</span>
                <span className="category-row-amount">
                  {currency.format(spent)}
                </span>
              </button>
            ))
          )}
        </div>
      </section>

      {/* Charts */}
      <div className="charts-grid">
        <IncomeVsExpensesChart data={periodData} />
        <SpendingByCategoryChart data={catData} />
        <MonthlyTrendChart data={trendData} />
      </div>

      {/* Budget Progress */}
      {budgets.filter((b) => b.month === month).length > 0 && (
        <section className="report-section">
          <h2 className="section-title">Budget progress</h2>
          {budgets
            .filter((b) => b.month === month)
            .map((b) => {
              const util = budgetUtilization(b, monthlyTxns);
              const remainingAmt = remainingBudget(b, monthlyTxns);
              return (
                <div key={b.id} className="budget-row">
                  <span>{b.category}</span>
                  <div className="budget-bar">
                    <div
                      className={
                        "budget-fill " +
                        (isOverBudget(b, monthlyTxns)
                          ? "over"
                          : util > 80
                            ? "warn"
                            : "ok")
                      }
                      style={{ width: Math.min(util, 100) + "%" }}
                    />
                  </div>
                  <span className={remainingAmt >= 0 ? "" : "negative"}>
                    {currency.format(remainingAmt)}
                  </span>
                </div>
              );
            })}
        </section>
      )}

      {/* Net Worth — secondary */}
      <div className="net-worth-line">
        <span className="month-summary-label">Net worth</span>
        <span className="month-summary-value">
          {currency.format(netWorth)}
        </span>
      </div>
    </>
  );
}
