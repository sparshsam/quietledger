"use client";

import { useState, useMemo } from "react";
import { Search, ArrowUpDown } from "lucide-react";
import type { Account, Transaction } from "@/lib/data/types";
import { NoTransactions } from "./empty-states";
import { Select } from "@/components/select";
import { DatePicker } from "@/components/date-picker";

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

type SortKey = "date" | "amount" | "category" | "account";

const kindBadgeClass: Record<string, string> = {
  chequing: "badge-chq",
  "credit-card": "badge-cc",
  savings: "badge-sav",
  loan: "badge-loan",
  other: "badge-misc",
};

const kindLabel: Record<string, string> = {
  chequing: "Checking",
  "credit-card": "Credit",
  savings: "Savings",
  loan: "Loan",
  other: "Misc",
};

function getAccountKind(accountId: string | null, accounts: Account[]): string {
  if (!accountId) return "";
  const account = accounts.find((a) => a.id === accountId);
  if (!account) return "";
  const kind = account.kind === "credit" ? "credit-card" : account.kind;
  return kindLabel[kind] ?? "Account";
}

function getAccountKindBadge(accountId: string | null, accounts: Account[]): string {
  if (!accountId) return "";
  const account = accounts.find((a) => a.id === accountId);
  if (!account) return "";
  const kind = account.kind === "credit" ? "credit-card" : account.kind;
  return kindBadgeClass[kind] ?? "badge-misc";
}

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
          <div className="date-range-pills">
            <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="From" className="date-range-pill" />
            <span className="date-range-sep">—</span>
            <DatePicker value={dateTo} onChange={setDateTo} placeholder="To" className="date-range-pill" />
          </div>
          <Select value={accountFilter} onChange={setAccountFilter} options={[{ value: "all", label: "All accounts" }, ...accounts.filter((a) => !a.archivedAt).map((a) => ({ value: a.id, label: a.name }))]} />
          <Select value={categoryFilter} onChange={setCategoryFilter} options={[{ value: "all", label: "All categories" }, ...allCategories.map((c) => ({ value: c, label: c }))]} />
          <Select value={typeFilter} onChange={(v) => setTypeFilter(v as "all" | "income" | "expense")} options={[{ value: "all", label: "All types" }, { value: "income", label: "Income" }, { value: "expense", label: "Expense" }]} />
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
        <div className="transaction-table-improved" role="table" aria-label="Transactions">
          <div className="table-head" role="row">
            <button
              className="sort-header"
              onClick={() => toggleSort("date")}
              role="columnheader"
              aria-sort={sortKey === "date" ? (sortDirAsc ? "ascending" : "descending") : "none"}
            >
              Date <ArrowUpDown size={13} />
            </button>
            <span role="columnheader">Description</span>
            <button
              className="sort-header"
              onClick={() => toggleSort("category")}
              role="columnheader"
              aria-sort={sortKey === "category" ? (sortDirAsc ? "ascending" : "descending") : "none"}
            >
              Category <ArrowUpDown size={13} />
            </button>
            <button
              className="sort-header"
              onClick={() => toggleSort("account")}
              role="columnheader"
              aria-sort={sortKey === "account" ? (sortDirAsc ? "ascending" : "descending") : "none"}
            >
              Account <ArrowUpDown size={13} />
            </button>
            <span role="columnheader">Type</span>
            <button
              className="sort-header"
              onClick={() => toggleSort("amount")}
              role="columnheader"
              aria-sort={sortKey === "amount" ? (sortDirAsc ? "ascending" : "descending") : "none"}
            >
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
              <span>
                {t.accountId ? (
                  <span className={`account-kind-badge ${getAccountKindBadge(t.accountId, accounts)}`}>
                    {getAccountKind(t.accountId, accounts)}
                  </span>
                ) : (
                  <span className="account-kind-badge badge-misc" style={{ opacity: 0.4 }}>—</span>
                )}
              </span>
              <em className={t.amount < 0 ? "negative" : "positive"}>{currency.format(t.amount)}</em>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
