"use client";

import { useMemo, useState } from "react";
import type { Account, Transaction, Budget } from "@/lib/data/types";
import {
  computeMonthIncome,
  computeMonthExpenses,
  computeMonthCashflow,
  computeEffectiveNetWorth,
  accountEffectiveBalance,
} from "@/lib/finance/totals";
import { categoryTotals, monthlyTotals } from "@/lib/finance/grouping";
import { budgetUtilization, remainingBudget, isOverBudget } from "@/lib/finance/budgets";
import { MonthPicker } from "@/components/month-picker";
import { ComparisonPills, COMPARISON_RANGES } from "@/components/comparison-pills";
import { AllMonthsBarChart } from "@/components/all-months-chart";
import type { ComparisonRange, ComparisonResult } from "@/lib/finance/comparisons";
import { computeExpenseComparison } from "@/lib/finance/comparisons";
import { IncomeVsExpensesChart } from "@/components/charts/income-vs-expenses";
import { SpendingByCategoryChart } from "@/components/charts/spending-by-category";

const currency = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

type LedgerReportProps = {
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  month: string;
  onMonthChange: (month: string) => void;
  activeCategory: string | null;
  activeAccountId: string | null;
  onCategoryFilter: (category: string | null) => void;
};

export function LedgerReport({
  transactions,
  accounts,
  budgets,
  month,
  onMonthChange,
  activeCategory,
  activeAccountId,
  onCategoryFilter,
}: LedgerReportProps) {
  const [comparisonRange, setComparisonRange] = useState<ComparisonRange>("last_month");

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
  const comparisonResult = computeExpenseComparison(filteredTxns, month, comparisonRange);

  const visibleAccounts = useMemo(() => accounts.filter((a) => !a.archivedAt), [accounts]);

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
      total: -spent,
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

  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleString("en-CA", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      {/* Report Header */}
      <div className="report-header">
        <div className="report-header-left">
          <h1 className="report-title" style={{ color: "var(--text-primary)" }}>
            {monthLabel}
          </h1>
          <MonthPicker value={month} onChange={onMonthChange} />
        </div>
      </div>

      {/* Summary Strip — numbers first */}
      <div className="month-summary">
        <div className="month-summary-item">
          <span className="month-summary-value positive">
            {currency.format(income)}
          </span>
          <span className="month-summary-label text-xs font-bold tracking-wider uppercase">
            Income
          </span>
        </div>
        <div className="month-summary-item">
          <span className="month-summary-value negative">
            {currency.format(expenses)}
          </span>
          <span className="month-summary-label text-xs font-bold tracking-wider uppercase">
            Spent
          </span>
        </div>
        <div className="month-summary-item">
          <span
            className={
              "month-summary-value " +
              (remaining >= 0 ? "positive" : "negative")
            }
          >
            {currency.format(remaining)}
          </span>
          <span className="month-summary-label text-xs font-bold tracking-wider uppercase">
            Remaining
          </span>
        </div>
      </div>

      {/* Comparison strip */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
        <ComparisonPills active={comparisonRange} onChange={setComparisonRange} />
        {comparisonResult && (
          <p className="comparison-text" style={{ fontSize: 15, marginTop: 4 }}>
            <span className={comparisonResult.direction === "up" ? "negative" : "positive"}>
              {comparisonResult.direction === "up" ? "▲" : "▼"}
            </span>
            {" "}
            {currency.format(Math.abs(comparisonResult.absChange))} (
            {Math.abs(comparisonResult.pctChange ?? 0)}%){" "}
            {comparisonResult.label}
          </p>
        )}
      </div>

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

      {/* All-Months Chart — full width */}
      <section className="report-section">
        <AllMonthsBarChart
          transactions={filteredTxns}
          activeMonth={month}
          onSelectMonth={onMonthChange}
        />
      </section>

      {/* Charts Grid */}
      <div className="charts-grid">
        <IncomeVsExpensesChart data={periodData} />
        <SpendingByCategoryChart data={catData} />
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

      {/* Net Worth — enlarged */}
      <section className="net-worth-section">
        <div className="net-worth-main">
          <span className="net-worth-label">Net worth</span>
          <span className="net-worth-value">
            {currency.format(netWorth)}
          </span>
        </div>
        {visibleAccounts.length > 1 && (
          <div className="net-worth-accounts">
            {visibleAccounts.map((a) => {
              const balance = accountEffectiveBalance(a, monthlyTxns);
              return (
                <div key={a.id} className="net-worth-account-row">
                  <span className="net-worth-account-name">{a.name}</span>
                  <span
                    className={
                      "net-worth-account-balance " +
                      (balance >= 0 ? "positive" : "negative")
                    }
                  >
                    {currency.format(balance)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
