"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Search, X, Filter, Save } from "lucide-react";
import type { Account, Transaction } from "@/lib/data/types";
import { Select } from "@/components/select";

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

type SavedFilter = {
  id: string;
  name: string;
  query: string;
  category?: string;
  accountId?: string;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
};

type SearchViewProps = {
  transactions: Transaction[];
  accounts: Account[];
  onSelectTransaction: (transactionId: string) => void;
  onClose: () => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

const quickFilters = [
  {
    id: "expenses-100",
    label: "Expenses > $100",
    filter: (t: Transaction) => t.amount < -100,
  },
  {
    id: "income-only",
    label: "Income only",
    filter: (t: Transaction) => t.amount > 0,
  },
  {
    id: "this-month",
    label: "This month",
    filter: (t: Transaction) => {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      return t.date.startsWith(month);
    },
  },
];

const MAX_SAVED_FILTERS = 10;

const SAVED_FILTERS_KEY = "openledger.savedFilters";

function loadSavedFilters(): SavedFilter[] {
  try {
    const stored = localStorage.getItem(SAVED_FILTERS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Silently fail if localStorage is unavailable or corrupt
  }
  return [];
}

function saveSavedFilters(filters: SavedFilter[]) {
  try {
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(filters));
  } catch {
    // Silently fail
  }
}

export function SearchView({
  transactions,
  accounts,
  onSelectTransaction,
  onClose,
}: SearchViewProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() =>
    loadSavedFilters(),
  );
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Auto-focus the search input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const allCategories = useMemo(
    () => [...new Set(transactions.map((t) => t.category))].sort(),
    [transactions],
  );

  const accountName = useCallback(
    (id: string) => accounts.find((a) => a.id === id)?.name ?? id,
    [accounts],
  );

  const results = useMemo(() => {
    let result = [...transactions];

    // Text search — across description, merchant, category, note, and amount
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      const amountSearch = q.replace(/[$,]/g, ""); // strip $ and commas for amount matching
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          (t.merchant ?? "").toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.note ?? "").toLowerCase().includes(q) ||
          (amountSearch && Math.abs(t.amount).toFixed(2).includes(amountSearch)),
      );
    }

    // Date range filters
    if (dateFrom) result = result.filter((t) => t.date >= dateFrom);
    if (dateTo) result = result.filter((t) => t.date <= dateTo);

    // Category filter
    if (categoryFilter !== "all")
      result = result.filter((t) => t.category === categoryFilter);

    // Account filter
    if (accountFilter !== "all")
      result = result.filter((t) => t.accountId === accountFilter);

    // Amount range filters
    if (minAmount) {
      const min = Number(minAmount);
      if (!isNaN(min))
        result = result.filter((t) => Math.abs(t.amount) >= min);
    }
    if (maxAmount) {
      const max = Number(maxAmount);
      if (!isNaN(max))
        result = result.filter((t) => Math.abs(t.amount) <= max);
    }

    // Quick filter
    if (activeQuickFilter) {
      const qf = quickFilters.find((f) => f.id === activeQuickFilter);
      if (qf) result = result.filter(qf.filter);
    }

    // Sort by date descending
    result.sort((a, b) => b.date.localeCompare(a.date));

    // Limit to 100 results for performance
    return result.slice(0, 100);
  }, [
    transactions,
    debouncedQuery,
    dateFrom,
    dateTo,
    categoryFilter,
    accountFilter,
    minAmount,
    maxAmount,
    activeQuickFilter,
  ]);

  function saveCurrentFilter(name: string) {
    if (savedFilters.length >= MAX_SAVED_FILTERS) return;
    const filter: SavedFilter = {
      id: crypto.randomUUID(),
      name,
      query: debouncedQuery,
      category: categoryFilter !== "all" ? categoryFilter : undefined,
      accountId: accountFilter !== "all" ? accountFilter : undefined,
      minAmount: minAmount ? Number(minAmount) : undefined,
      maxAmount: maxAmount ? Number(maxAmount) : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };
    const next = [...savedFilters, filter];
    setSavedFilters(next);
    saveSavedFilters(next);
  }

  function deleteSavedFilter(id: string) {
    const next = savedFilters.filter((f) => f.id !== id);
    setSavedFilters(next);
    saveSavedFilters(next);
  }

  function applySavedFilter(filter: SavedFilter) {
    setQuery(filter.query);
    setDebouncedQuery(filter.query);
    setCategoryFilter(filter.category ?? "all");
    setAccountFilter(filter.accountId ?? "all");
    setMinAmount(filter.minAmount?.toString() ?? "");
    setMaxAmount(filter.maxAmount?.toString() ?? "");
    setDateFrom(filter.dateFrom ?? "");
    setDateTo(filter.dateTo ?? "");
    setActiveQuickFilter(null);
  }

  function toggleQuickFilter(id: string) {
    setActiveQuickFilter((prev) => (prev === id ? null : id));
  }

  function clearAll() {
    setQuery("");
    setDebouncedQuery("");
    setDateFrom("");
    setDateTo("");
    setCategoryFilter("all");
    setAccountFilter("all");
    setMinAmount("");
    setMaxAmount("");
    setActiveQuickFilter(null);
  }

  function handleSelect(id: string) {
    onSelectTransaction(id);
    onClose();
  }

  const hasActiveFilters =
    dateFrom ||
    dateTo ||
    categoryFilter !== "all" ||
    accountFilter !== "all" ||
    minAmount ||
    maxAmount ||
    activeQuickFilter;

  const hasSearchActivity = debouncedQuery || hasActiveFilters;

  return (
    <div className="search-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Search the ledger">
      <div className="search-panel" onClick={(e) => e.stopPropagation()}>
        {/* Search header */}
        <div className="search-header">
          <div className="search-input-wrapper">
            <Search size={18} aria-hidden />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search descriptions, merchants, categories, amounts&hellip;"
              aria-label="Search ledger entries"
            />
            {query && (
              <button
                className="search-clear-btn"
                onClick={() => {
                  setQuery("");
                  setDebouncedQuery("");
                }}
                aria-label="Clear search text"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="search-header-actions">
            <button
              className={`search-filter-toggle ${showFilters ? "active" : ""}`}
              onClick={() => setShowFilters((prev) => !prev)}
              aria-expanded={showFilters}
            >
              <Filter size={15} aria-hidden />
              Filters
            </button>
            <button
              className="search-close-btn"
              onClick={onClose}
              aria-label="Close search"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick filter pills */}
        <div className="search-quick-filters" role="group" aria-label="Quick filters">
          {quickFilters.map((qf) => (
            <button
              key={qf.id}
              className={`quick-filter-chip ${activeQuickFilter === qf.id ? "active" : ""}`}
              onClick={() => toggleQuickFilter(qf.id)}
            >
              {qf.label}
            </button>
          ))}
        </div>

        {/* Saved filters row */}
        {savedFilters.length > 0 && (
          <div className="search-saved-filters">
            <span className="search-saved-filters-label">Saved:</span>
            <div className="search-saved-filters-list">
              {savedFilters.map((f) => (
                <div key={f.id} className="saved-filter-chip">
                  <button
                    className="saved-filter-chip-apply"
                    onClick={() => applySavedFilter(f)}
                  >
                    <Save size={12} aria-hidden />
                    {f.name}
                  </button>
                  <button
                    className="saved-filter-chip-remove"
                    onClick={() => deleteSavedFilter(f.id)}
                    aria-label={`Delete saved filter "${f.name}"`}
                  >
                    <X size={12} aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advanced filters panel (collapsible) */}
        {showFilters && (
          <div className="search-filters-panel">
            <div className="search-filter-row">
              <label>
                <span>From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </label>
              <label>
                <span>To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </label>
            </div>
            <div className="search-filter-row">
              <label>
                <span>Category</span>
                <Select value={categoryFilter} onChange={setCategoryFilter} options={[{ value: "all", label: "All categories" }, ...allCategories.map((c) => ({ value: c, label: c }))]} />
              </label>
              <label>
                <span>Account</span>
                <Select value={accountFilter} onChange={setAccountFilter} options={[{ value: "all", label: "All accounts" }, ...accounts.filter((a) => !a.archivedAt).map((a) => ({ value: a.id, label: a.name }))]} />
              </label>
            </div>
            <div className="search-filter-row">
              <label>
                <span>Min amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  placeholder="0.00"
                />
              </label>
              <label>
                <span>Max amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  placeholder="No limit"
                />
              </label>
            </div>
            <div className="search-filter-actions">
              <button className="pill pill-ghost" onClick={clearAll}>
                Clear filters
              </button>
              {hasSearchActivity && savedFilters.length < MAX_SAVED_FILTERS && (
                <button
                  className="pill pill-primary"
                  onClick={() => {
                    const name = prompt("Name this saved filter:")?.trim();
                    if (name) saveCurrentFilter(name);
                  }}
                >
                  <Save size={14} aria-hidden />
                  Save filter
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results count */}
        <div className="search-results-count">
          {hasSearchActivity
            ? `${results.length} transaction${results.length !== 1 ? "s" : ""} found`
            : `${results.length} recent transaction${results.length !== 1 ? "s" : ""}`}
          {hasSearchActivity && (
            <button className="clear-filters" onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>

        {/* Results list */}
        <div className="search-results">
          {results.length === 0 ? (
            <div className="empty-state">
              <strong>No transactions match your search</strong>
              <p>Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            results.map((t) => (
              <div
                key={t.id}
                className="search-result-row"
                onClick={() => handleSelect(t.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSelect(t.id);
                }}
                tabIndex={0}
                aria-label={`${t.description}, ${currency.format(t.amount)}`}
              >
                <div className="search-result-info">
                  <div className="search-result-date">{formatDate(t.date)}</div>
                  <div className="search-result-desc">{t.description}</div>
                  <div className="search-result-meta">
                    <span>{t.category}</span>
                    <span className="search-result-sep">&middot;</span>
                    <span>{accountName(t.accountId)}</span>
                    {t.merchant && (
                      <>
                        <span className="search-result-sep">&middot;</span>
                        <span>{t.merchant}</span>
                      </>
                    )}
                    {t.note && (
                      <>
                        <span className="search-result-sep">&middot;</span>
                        <span className="search-result-note">{t.note}</span>
                      </>
                    )}
                  </div>
                </div>
                <div
                  className={`search-result-amount ${t.amount > 0 ? "positive" : "negative"}`}
                >
                  {currency.format(t.amount)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        {!hasSearchActivity && results.length === 0 && (
          <div className="search-footer-hint">
            Type to search across descriptions, merchants, categories, notes, and amounts.
          </div>
        )}
      </div>
    </div>
  );
}
