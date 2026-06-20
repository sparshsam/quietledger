"use client";

import { useState, useMemo } from "react";
import { Search, ArrowUpDown } from "lucide-react";
import type { Account, Transaction } from "@/lib/data/types";
import { NoTransactions } from "./empty-states";

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

type SortKey = "date" | "amount" | "category" | "account";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function TransactionsView({
  transactions,
  accounts,
}: {
  transactions: Transaction[];
  accounts: Account[];
}) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirAsc, setSortDirAsc] = useState(false);

  const allCategories = useMemo(
    () => [...new Set(transactions.map((t) => t.category))].sort(),
    [transactions],
  );

  const filtered = useMemo(() => {
    let result = [...transactions];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          (t.merchant ?? "").toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q),
      );
    }
    if (dateFrom) result = result.filter((t) => t.date >= dateFrom);
    if (dateTo) result = result.filter((t) => t.date <= dateTo);
    if (accountFilter !== "all") result = result.filter((t) => t.accountId === accountFilter);
    if (categoryFilter !== "all") result = result.filter((t) => t.category === categoryFilter);
    if (typeFilter === "income") result = result.filter((t) => t.amount > 0);
    if (typeFilter === "expense") result = result.filter((t) => t.amount < 0);

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "date": cmp = a.date.localeCompare(b.date); break;
        case "amount": cmp = a.amount - b.amount; break;
        case "category": cmp = a.category.localeCompare(b.category); break;
        case "account": cmp = a.accountId.localeCompare(b.accountId); break;
      }
      return sortDirAsc ? cmp : -cmp;
    });

    return result;
  }, [transactions, search, dateFrom, dateTo, accountFilter, categoryFilter, typeFilter, sortKey, sortDirAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirAsc((d) => !d);
    } else {
      setSortKey(key);
      setSortDirAsc(false);
    }
  }

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;

  return (
    <div className="transactions-view">
      <div className="filter-bar">
        <div className="filter-search">
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions&hellip;"
            aria-label="Search transactions"
          />
        </div>
        <div className="filter-controls">
          <label>
            <span className="sr-only">From date</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label>
            <span className="sr-only">To date</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
          <select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)} aria-label="Filter by account">
            <option value="all">All accounts</option>
            {accounts.filter((a) => !a.archivedAt).map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filter by category">
            <option value="all">All categories</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "all" | "income" | "expense")} aria-label="Filter by type">
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
      </div>

      <div className="filter-summary">
        <span>{filtered.length} transaction{filtered.length !== 1 ? "s" : ""}</span>
        {(search || dateFrom || dateTo || accountFilter !== "all" || categoryFilter !== "all" || typeFilter !== "all") && (
          <button className="clear-filters" onClick={() => {
            setSearch("");
            setDateFrom("");
            setDateTo("");
            setAccountFilter("all");
            setCategoryFilter("all");
            setTypeFilter("all");
          }}>
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <NoTransactions />
      ) : (
        <div className="transaction-table-improved">
          <div className="table-head">
            <button className="sort-header" onClick={() => toggleSort("date")}>
              Date <ArrowUpDown size={13} />
            </button>
            <span>Description</span>
            <button className="sort-header" onClick={() => toggleSort("category")}>
              Category <ArrowUpDown size={13} />
            </button>
            <button className="sort-header" onClick={() => toggleSort("account")}>
              Account <ArrowUpDown size={13} />
            </button>
            <button className="sort-header" onClick={() => toggleSort("amount")}>
              Amount <ArrowUpDown size={13} />
            </button>
          </div>
          {filtered.map((t) => (
            <div className="table-row" key={t.id}>
              <span>{formatDate(t.date)}</span>
              <strong>
                {t.description}
                {t.merchant ? <small> &mdash; {t.merchant}</small> : null}
              </strong>
              <span>{t.category}</span>
              <span>{accountName(t.accountId)}</span>
              <em className={t.amount < 0 ? "negative" : "positive"}>{currency.format(t.amount)}</em>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
