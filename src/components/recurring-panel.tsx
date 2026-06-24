"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, SkipForward, Play, Pause } from "lucide-react";
import type { Account, RecurringEntry, RecurringFrequency } from "@/lib/data/types";
import { generateUpcomingEntries, isDue, skipOccurrence } from "@/lib/finance/recurring";

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

const today = new Date().toISOString().slice(0, 10);

const categoryOptions = [
  "Groceries",
  "Rent",
  "Food delivery",
  "Transport",
  "Subscriptions",
  "Income",
  "Debt",
  "Utilities",
  "Shopping",
  "Health",
  "Misc",
];

const frequencyOptions: Array<{ value: RecurringFrequency; label: string }> = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom (every N days)" },
];

type RecurringFormValues = {
  id?: string;
  description: string;
  amount: string;
  category: string;
  accountId: string;
  frequency: RecurringFrequency;
  intervalDays: string;
  nextDate: string;
  endDate: string;
  note: string;
};

type RecurringPanelProps = {
  recurringEntries: RecurringEntry[];
  accounts: Account[];
  onAdd: (entry: RecurringEntry) => void;
  onUpdate: (entry: RecurringEntry) => void;
  onDelete: (id: string) => void;
};

export function RecurringPanel({
  recurringEntries,
  accounts,
  onAdd,
  onUpdate,
  onDelete,
}: RecurringPanelProps) {
  const [form, setForm] = useState<RecurringFormValues>({
    description: "",
    amount: "",
    category: categoryOptions[0],
    accountId: accounts[0]?.id ?? "",
    frequency: "monthly",
    intervalDays: "30",
    nextDate: today,
    endDate: "",
    note: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const activeEntries = useMemo(
    () => recurringEntries.filter((e) => e.status === "active"),
    [recurringEntries],
  );

  const pausedEntries = useMemo(
    () => recurringEntries.filter((e) => e.status === "paused"),
    [recurringEntries],
  );

  const completedEntries = useMemo(
    () => recurringEntries.filter((e) => e.status === "completed"),
    [recurringEntries],
  );

  const upcoming = useMemo(
    () => generateUpcomingEntries(activeEntries, 30),
    [activeEntries],
  );

  const overdueCount = useMemo(
    () => activeEntries.filter((e) => isDue(e)).length,
    [activeEntries],
  );

  function handleSave() {
    const amount = Number(form.amount);
    if (!form.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Enter a description and a positive amount.");
      return;
    }
    if (!form.nextDate) {
      setError("Select a next occurrence date.");
      return;
    }
    if (!form.accountId) {
      setError("Select an account.");
      return;
    }
    if (form.frequency === "custom") {
      const days = Number(form.intervalDays);
      if (!Number.isFinite(days) || days < 1) {
        setError("Enter a positive interval (days) for custom frequency.");
        return;
      }
    }

    const entry: RecurringEntry = {
      id: form.id ?? `recurring-${crypto.randomUUID()}`,
      description: form.description.trim(),
      amount,
      category: form.category,
      accountId: form.accountId,
      frequency: form.frequency,
      intervalDays:
        form.frequency === "custom" ? Number(form.intervalDays) : undefined,
      nextDate: form.nextDate,
      endDate: form.endDate || undefined,
      status: "active",
      note: form.note.trim() || undefined,
      createdAt: form.id
        ? (recurringEntries.find((e) => e.id === form.id)?.createdAt ?? today)
        : today,
    };

    if (form.id) {
      onUpdate(entry);
    } else {
      onAdd(entry);
    }

    resetForm();
  }

  function handleEdit(entry: RecurringEntry) {
    setForm({
      id: entry.id,
      description: entry.description,
      amount: String(entry.amount),
      category: entry.category,
      accountId: entry.accountId,
      frequency: entry.frequency,
      intervalDays: String(entry.intervalDays ?? 30),
      nextDate: entry.nextDate,
      endDate: entry.endDate ?? "",
      note: entry.note ?? "",
    });
    setEditingId(entry.id);
    setShowForm(true);
    setError("");
  }

  function handleSkip(entry: RecurringEntry) {
    onUpdate(skipOccurrence(entry));
  }

  function handleTogglePause(entry: RecurringEntry) {
    onUpdate({
      ...entry,
      status: entry.status === "paused" ? "active" : "paused",
    });
  }

  function resetForm() {
    setForm({
      description: "",
      amount: "",
      category: categoryOptions[0],
      accountId: accounts[0]?.id ?? "",
      frequency: "monthly",
      intervalDays: "30",
      nextDate: today,
      endDate: "",
      note: "",
    });
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  function statusBadge(status: RecurringEntry["status"]) {
    switch (status) {
      case "active":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              color: "var(--positive)",
              background: "rgba(74, 124, 89, 0.1)",
              padding: "3px 10px",
              borderRadius: 999,
            }}
          >
            Active
          </span>
        );
      case "paused":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              color: "var(--warning)",
              background: "rgba(196, 148, 56, 0.1)",
              padding: "3px 10px",
              borderRadius: 999,
            }}
          >
            Paused
          </span>
        );
      case "completed":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              background: "rgba(156, 147, 130, 0.1)",
              padding: "3px 10px",
              borderRadius: 999,
            }}
          >
            Completed
          </span>
        );
    }
  }

  function frequencyLabel(freq: RecurringFrequency, days?: number) {
    switch (freq) {
      case "weekly":
        return "Weekly";
      case "monthly":
        return "Monthly";
      case "custom":
        return `Every ${days ?? 30} days`;
    }
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value + "T12:00:00"));
  }

  function renderEntryCard(entry: RecurringEntry) {
    const due = isDue(entry);
    const accountName =
      accounts.find((a) => a.id === entry.accountId)?.name ?? "Unknown";

    return (
      <div
        key={entry.id}
        className="card"
        style={{
          padding: 20,
          border: due
            ? "1px solid rgba(196, 74, 74, 0.25)"
            : "1px solid var(--border)",
          borderRadius: 8,
          background: due
            ? "rgba(196, 74, 74, 0.03)"
            : "var(--surface)",
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 8,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                marginBottom: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {entry.description}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-tertiary)",
                marginTop: 2,
              }}
            >
              {entry.category} &middot; {accountName}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {statusBadge(entry.status)}
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                color:
                  entry.amount > 0 ? "var(--positive)" : "var(--negative)",
              }}
            >
              {currency.format(entry.amount)}
            </span>
          </div>
        </div>

        {/* Frequency & next date */}
        <div
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <span>{frequencyLabel(entry.frequency, entry.intervalDays)}</span>
          <span
            style={{ color: due ? "var(--negative)" : "var(--text-tertiary)" }}
          >
            {due ? "Overdue: " : "Next: "}
            {formatDate(entry.nextDate)}
          </span>
          {entry.note ? (
            <span style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>
              {entry.note}
            </span>
          ) : null}
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: 6,
            borderTop: "1px solid var(--border)",
            paddingTop: 12,
          }}
        >
          {entry.status === "active" ? (
            <>
              <button
                className="pill pill-secondary"
                style={{ padding: "6px 14px", fontSize: 12 }}
                onClick={() => handleSkip(entry)}
                aria-label={`Skip ${entry.description}`}
              >
                <SkipForward size={13} /> Skip
              </button>
              <button
                className="pill pill-secondary"
                style={{ padding: "6px 14px", fontSize: 12 }}
                onClick={() => handleTogglePause(entry)}
                aria-label={`Pause ${entry.description}`}
              >
                <Pause size={13} /> Pause
              </button>
            </>
          ) : entry.status === "paused" ? (
            <button
              className="pill pill-primary"
              style={{ padding: "6px 14px", fontSize: 12 }}
              onClick={() => handleTogglePause(entry)}
              aria-label={`Resume ${entry.description}`}
            >
              <Play size={13} /> Resume
            </button>
          ) : null}
          <button
            className="pill pill-secondary"
            style={{ padding: "6px 14px", fontSize: 12 }}
            onClick={() => handleEdit(entry)}
            aria-label={`Edit ${entry.description}`}
          >
            <Pencil size={13} /> Edit
          </button>
          <button
            className="pill pill-secondary"
            style={{ padding: "6px 14px", fontSize: 12 }}
            onClick={() => {
              if (
                window.confirm(`Delete recurring entry "${entry.description}"?`)
              )
                onDelete(entry.id);
            }}
            aria-label={`Delete ${entry.description}`}
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>
    );
  }

  function renderEntrySection(
    title: string,
    entries: RecurringEntry[],
  ) {
    if (entries.length === 0) return null;
    return (
      <section style={{ marginBottom: 24 }}>
        <h3
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            margin: "0 0 12px",
          }}
        >
          {title}{" "}
          <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>
            ({entries.length})
          </span>
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {entries.map(renderEntryCard)}
        </div>
      </section>
    );
  }

  return (
    <div>
      {/* Header row */}
      <p
        style={{
          fontSize: 14,
          color: "var(--text-secondary)",
          marginBottom: 16,
          lineHeight: 1.5,
        }}
      >
        Manage recurring bills, subscriptions, and income. OpenLedger reminds
        you when each entry is due.
        {overdueCount > 0 ? (
          <span style={{ color: "var(--negative)", fontWeight: 600 }}>
            {" "}
            {overdueCount} overdue.
          </span>
        ) : null}
      </p>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h2 className="section-title" style={{ margin: 0 }}>
          Recurring entries
        </h2>
        <button
          className="pill pill-primary"
          onClick={() => {
            setForm({
              description: "",
              amount: "",
              category: categoryOptions[0],
              accountId: accounts[0]?.id ?? "",
              frequency: "monthly",
              intervalDays: "30",
              nextDate: today,
              endDate: "",
              note: "",
            });
            setEditingId(null);
            setShowForm(true);
            setError("");
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            whiteSpace: "nowrap",
          }}
        >
          New recurring
          <Plus size={16} style={{ strokeWidth: 2.5 }} />
        </button>
      </div>

      {/* Creation/Edit modal */}
      {showForm ? (
        <div className="sheet-overlay" onClick={() => resetForm()}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? "Edit recurring entry" : "New recurring entry"}</h2>
            <div className="ef">
              <input
                className="ef-input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description"
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <input
                  className="ef-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="Amount"
                />
                <select
                  className="ef-select"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <select
                  className="ef-select"
                  value={form.accountId}
                  onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <select
                  className="ef-select"
                  value={form.frequency}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      frequency: e.target.value as RecurringFrequency,
                    })
                  }
                >
                  {frequencyOptions.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              {form.frequency === "custom" ? (
                <input
                  className="ef-input"
                  type="number"
                  min="1"
                  step="1"
                  value={form.intervalDays}
                  onChange={(e) => setForm({ ...form, intervalDays: e.target.value })}
                  placeholder="Interval (days)"
                />
              ) : null}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
                  Next date
                  <input
                    className="ef-input"
                    type="date"
                    value={form.nextDate}
                    onChange={(e) => setForm({ ...form, nextDate: e.target.value })}
                    style={{ marginTop: 4 }}
                  />
                </label>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
                  End date{" "}
                  <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>
                    (optional)
                  </span>
                  <input
                    className="ef-input"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    style={{ marginTop: 4 }}
                  />
                </label>
              </div>
              <input
                className="ef-input"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Note (optional)"
              />
              {error ? <span className="ef-error">{error}</span> : null}
              <div className="ef-actions">
                <button
                  className="pill pill-primary"
                  onClick={handleSave}
                >
                  {editingId ? "Save changes" : "Add entry"}
                </button>
                <button
                  className="pill pill-secondary"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Entries by status */}
      {recurringEntries.length === 0 ? (
        <div className="empty-state">
          <strong>No recurring entries yet</strong>
          <p>
            Set up recurring bills, subscriptions, or income and OpenLedger
            will track when each one is due.
          </p>
        </div>
      ) : (
        <>
          {renderEntrySection("Active", activeEntries)}
          {renderEntrySection("Paused", pausedEntries)}
          {renderEntrySection("Completed", completedEntries)}
        </>
      )}

      {/* Upcoming entries */}
      {upcoming.length > 0 ? (
        <section style={{ marginTop: 32 }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              margin: "0 0 12px",
            }}
          >
            Upcoming (next 30 days)
          </h3>
          <div
            className="editorial-list"
            style={{ maxHeight: 320, overflowY: "auto" }}
          >
            {upcoming.map((item, idx) => {
              const daysUntil = Math.ceil(
                (new Date(item.dueDate + "T12:00:00").getTime() -
                  new Date().getTime()) /
                  (1000 * 60 * 60 * 24),
              );
              const accountName =
                accounts.find((a) => a.id === item.entry.accountId)?.name ??
                "Unknown";
              return (
                <div
                  key={`${item.entry.id}-${item.dueDate}-${idx}`}
                  className="editorial-row"
                  style={{ cursor: "default" }}
                >
                  <div>
                    <div className="editorial-row-title">
                      {item.entry.description}
                    </div>
                    <div className="editorial-row-meta">
                      {formatDate(item.dueDate)}
                      {daysUntil === 0
                        ? " (Today)"
                        : daysUntil === 1
                          ? " (Tomorrow)"
                          : ` (${daysUntil} days)`}
                      {" • "}
                      {frequencyLabel(
                        item.entry.frequency,
                        item.entry.intervalDays,
                      )}
                      {" • "}
                      {accountName}
                    </div>
                  </div>
                  <span
                    className={
                      "editorial-row-value " +
                      (item.entry.amount > 0 ? "positive" : "negative")
                    }
                  >
                    {currency.format(item.entry.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : recurringEntries.length > 0 ? (
        <section style={{ marginTop: 32 }}>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-tertiary)",
              textAlign: "center",
            }}
          >
            No upcoming entries in the next 30 days.
          </p>
        </section>
      ) : null}
    </div>
  );
}
