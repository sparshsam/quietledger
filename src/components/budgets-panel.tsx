"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Budget, Transaction } from "@/lib/data/types";
import { budgetUtilization, remainingBudget, isOverBudget, averageSpendingByCategory } from "@/lib/finance/budgets";

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

const today = new Date();
const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

const categoryOptions = [
  "Groceries", "Rent", "Food delivery", "Transport", "Subscriptions",
  "Utilities", "Shopping", "Health", "Misc", "Debt",
];

type BudgetFormValues = {
  id?: string;
  category: string;
  month: string;
  amount: string;
};

export function BudgetsPanel({
  budgets,
  transactions,
  onSave,
  onDelete,
}: {
  budgets: Budget[];
  transactions: Transaction[];
  onSave: (budget: Budget) => void;
  onDelete: (id: string) => void;
}) {
  const [form, setForm] = useState<BudgetFormValues>({
    category: categoryOptions[0],
    month: defaultMonth,
    amount: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const budgetsByMonth = useMemo(() => {
    const grouped: Record<string, Budget[]> = {};
    for (const b of budgets) {
      if (!grouped[b.month]) grouped[b.month] = [];
      grouped[b.month].push(b);
    }
    return grouped;
  }, [budgets]);

  const suggestions = useMemo(() => {
    return averageSpendingByCategory(transactions, 3).filter(
      (s) => !budgets.some((b) => b.category === s.category && b.month === defaultMonth)
    );
  }, [transactions, budgets]);

  function handleSave() {
    const amount = Number(form.amount);
    if (!form.category || !form.month || !Number.isFinite(amount) || amount <= 0) {
      setError("Enter a category, month, and positive budget amount.");
      return;
    }
    onSave({
      id: form.id ?? `budget-${crypto.randomUUID()}`,
      category: form.category,
      month: form.month,
      amount,
    });
    setForm({ category: categoryOptions[0], month: defaultMonth, amount: "" });
    setEditingId(null);
    setError("");
  }

  function handleEdit(b: Budget) {
    setForm({ id: b.id, category: b.category, month: b.month, amount: String(b.amount) });
    setEditingId(b.id);
    setError("");
  }

  function handleCancel() {
    setForm({ category: categoryOptions[0], month: defaultMonth, amount: "" });
    setEditingId(null);
    setError("");
  }

  return (
    <div className="budgets-panel">
      <div className="budget-form">
        <h3 className="section-title">{editingId ? "Edit budget" : "New budget"}</h3>
        <div className="budget-form-grid">
          <label>
            <span>Category</span>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Month</span>
            <input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
          </label>
          <label>
            <span>Amount</span>
            <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
          </label>
        </div>
        {error ? <p className="gentle-error" role="status" aria-live="polite">{error}</p> : null}
        <div className="form-actions">
          <button onClick={handleSave}>
            <Plus size={16} />
            {editingId ? "Save changes" : "Add budget"}
          </button>
          {editingId ? <button onClick={handleCancel}>Cancel</button> : null}
        </div>
      </div>

      {budgets.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>No budgets yet</strong>
          <p>Create a budget to track your monthly spending by category.</p>
        </div>
      ) : (
        <div aria-live="polite" aria-atomic="false">
        {Object.entries(budgetsByMonth)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([month, monthBudgets]) => (
            <div key={month} className="budget-month-group">
              <h4 className="budget-month-label">
                {new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric" }).format(new Date(`${month}-01T12:00:00`))}
              </h4>
              <div className="budget-list">
                {monthBudgets.map((b) => {
                  const util = budgetUtilization(b, transactions);
                  const remaining = remainingBudget(b, transactions);
                  const over = isOverBudget(b, transactions);
                  return (
                    <div key={b.id} className={`budget-row ${over ? "over-budget" : ""}`}>
                      <div className="budget-info">
                        <strong>{b.category}</strong>
                        <span className="budget-amounts">
                          {currency.format(b.amount)} budgeted
                        </span>
                      </div>
                      <div className="budget-progress-section">
                        <div className="budget-bar-track">
                          <div
                            className={`budget-bar-fill ${over ? "budget-bar-over" : util > 80 ? "budget-bar-warn" : "budget-bar-ok"}`}
                            style={{ width: `${util}%` }}
                          />
                        </div>
                        <div className="budget-stats">
                          <span className={over ? "negative" : remaining < b.amount * 0.2 ? "budget-warn" : "positive"}>
                            {remaining >= 0 ? `${currency.format(remaining)} left` : `${currency.format(Math.abs(remaining))} over`}
                          </span>
                          <span className="budget-pct">{util}%</span>
                        </div>
                      </div>
                      <div className="row-actions">
                        <button onClick={() => handleEdit(b)} aria-label={`Edit ${b.category} budget`}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => onDelete(b.id)} aria-label={`Delete ${b.category} budget`}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <section style={{ marginTop: "var(--space-xl)" }}>
          <h3 className="section-title" style={{ fontSize: "var(--text-lg)" }}>Based on your spending</h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: "var(--space-md)" }}>
            You typically spend this amount per month. Tap to create a budget.
          </p>
          {suggestions.map((s) => (
            <div key={s.category} className="suggestion-row">
              <span>{s.category}</span>
              <span>{currency.format(s.monthlyAverage)}/mo</span>
              <button className="pill pill-small" onClick={() => {
                setForm({ category: s.category, month: defaultMonth, amount: s.monthlyAverage.toFixed(0) });
              }}>Set budget</button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
