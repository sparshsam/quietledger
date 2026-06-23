"use client";

import { useState } from "react";
import { Pencil, Trash2, ArrowUp, Plus } from "lucide-react";
import type { Goal } from "@/lib/data/types";
import { goalProgress } from "@/lib/finance/goals";

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

const today = new Date().toISOString().slice(0, 10);

type GoalFormValues = {
  id?: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
};

export function GoalsPanel({
  goals,
  onSave,
  onDelete,
  onContribute,
}: {
  goals: Goal[];
  onSave: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onContribute: (id: string, amount: number) => void;
}) {
  const [form, setForm] = useState<GoalFormValues>({ name: "", targetAmount: "", currentAmount: "0", targetDate: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [contributeId, setContributeId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState("");

  function handleSave() {
    const target = Number(form.targetAmount);
    const current = Number(form.currentAmount);
    if (!form.name.trim() || !Number.isFinite(target) || target <= 0) {
      setError("Enter a goal name and a positive target amount.");
      return;
    }
    onSave({
      id: form.id ?? `goal-${crypto.randomUUID()}`,
      name: form.name.trim(),
      targetAmount: target,
      currentAmount: Number.isFinite(current) ? current : 0,
      targetDate: form.targetDate || undefined,
      createdAt: form.id ? (goals.find((g) => g.id === form.id)?.createdAt ?? today) : today,
    });
    setForm({ name: "", targetAmount: "", currentAmount: "0", targetDate: "" });
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  function handleEdit(g: Goal) {
    setForm({ id: g.id, name: g.name, targetAmount: String(g.targetAmount), currentAmount: String(g.currentAmount), targetDate: g.targetDate ?? "" });
    setEditingId(g.id);
    setShowForm(true);
    setError("");
  }

  function handleContribute(goalId: string) {
    const amount = Number(contributeAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    onContribute(goalId, amount);
    setContributeId(null);
    setContributeAmount("");
  }

  const now = new Date();

  return (
    <div>
      {/* Header row */}
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>Track your saving milestones. Set a target, contribute regularly, and watch your progress grow.</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Milestones</h2>
        <button className="pill pill-primary" onClick={() => { setForm({ name: "", targetAmount: "", currentAmount: "0", targetDate: "" }); setEditingId(null); setShowForm(true); setError(""); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
          New Goal
          <Plus size={16} style={{ strokeWidth: 2.5 }} />
        </button>
      </div>

      {/* Creation/Edit modal */}
      {showForm ? (
        <div className="sheet-overlay" onClick={() => setShowForm(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? "Edit milestone" : "New milestone"}</h2>
            <div className="ef">
              <input className="ef-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Goal name" />
              <input className="ef-input" type="number" min="0" step="0.01" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} placeholder="Target amount" />
              <input className="ef-input" type="number" min="0" step="0.01" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} placeholder="Current amount" />
              <input className="ef-input" type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
              {error ? <span className="ef-error">{error}</span> : null}
              <div className="ef-actions">
                <button className="pill pill-primary" onClick={handleSave}>{editingId ? "Save" : "Save"}</button>
                <button className="pill pill-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Empty state */}
      {goals.length === 0 ? (
        <div className="empty-state">
          <strong>No milestones yet</strong>
          <p>Tap "New goal" to create your first milestone.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {goals.map((g) => {
            const progress = goalProgress(g);
            const remaining = g.targetAmount - g.currentAmount;
            const daysLeft = g.targetDate ? Math.ceil((new Date(g.targetDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

            return (
              <div key={g.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>{g.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>{currency.format(g.targetAmount)} target</div>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--positive)', fontVariantNumeric: 'tabular-nums' }}>{progress}%</div>
                </div>

                <div className="progress-track" style={{ margin: '0 0 10px' }}>
                  <div className="progress-fill ok" style={{ width: Math.min(progress, 100) + '%' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-tertiary)', marginBottom: daysLeft !== null ? 4 : 12 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{currency.format(g.currentAmount)} saved</span>
                  <span>{currency.format(remaining)} to go</span>
                </div>

                {g.targetDate ? (
                  <div style={{ fontSize: 12, color: daysLeft !== null && daysLeft < 30 ? 'var(--negative)' : 'var(--text-tertiary)', marginBottom: 12 }}>
                    {daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} days remaining` : "Past target date") : null}
                  </div>
                ) : null}

                <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  {contributeId === g.id ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="number" min="0" step="0.01" value={contributeAmount}
                        onChange={(e) => setContributeAmount(e.target.value)} placeholder="Amount" autoFocus
                        style={{ width: 100, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-secondary)', fontSize: 13, outline: 'none' }} />
                      <button className="pill pill-primary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => handleContribute(g.id)}><ArrowUp size={13} /> Add</button>
                      <button className="pill pill-secondary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => { setContributeId(null); setContributeAmount(""); }}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <button className="pill pill-primary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => { setContributeId(g.id); setContributeAmount(""); }} aria-label={`Contribute to ${g.name}`}><ArrowUp size={13} /> Contribute</button>
                      <button className="pill pill-secondary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => handleEdit(g)} aria-label={`Edit ${g.name}`}><Pencil size={13} /> Edit</button>
                      <button className="pill pill-secondary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => onDelete(g.id)} aria-label={`Delete ${g.name}`}><Trash2 size={13} /> Delete</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
