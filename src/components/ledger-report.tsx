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
import { categoryTotals } from "@/lib/finance/grouping";
import { budgetUtilization, remainingBudget, isOverBudget } from "@/lib/finance/budgets";
import { MonthPicker } from "@/components/month-picker";
import { ComparisonPills } from "@/components/comparison-pills";
import { AllMonthsBarChart } from "@/components/all-months-chart";
import type { ComparisonRange } from "@/lib/finance/comparisons";
import { computeExpenseComparison } from "@/lib/finance/comparisons";

const currency = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

type LedgerReportProps = {
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  month: string;
  onMonthChange: (month: string) => void;
  onImportClick?: () => void;
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
  onImportClick,
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
        {onImportClick && (
          <button className="pill pill-primary" onClick={onImportClick} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Import
          </button>
        )}
      </div>

      {/* Summary Strip — numbers first, net worth prominent */}
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
        <div className="month-summary-item net-worth-spot">
          <span
            className={
              "month-summary-value net-worth-spot-value " +
              (netWorth >= 0 ? "positive" : "negative")
            }
          >
            {currency.format(netWorth)}
          </span>
          <span className="month-summary-label text-xs font-bold tracking-wider uppercase">
            Net worth
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

      {/* Account breakdown — previously part of net worth section */}
      {visibleAccounts.length > 1 && (
        <section className="report-section" style={{ paddingTop: 0 }}>
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
        </section>
      )}
    </>
  );
}
