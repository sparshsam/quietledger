# Dashboard & Financial Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build OpenLedger v0.4.0 — dashboard with financial summaries, SVG charts, improved transaction filtering, and local-first insights.

**Architecture:** All computations derive from existing in-memory state (accounts + transactions). No new persistence schema. No auto-sync. Chart components are pure SVG React components with no external chart library. Empty states handle all missing-data scenarios.

**Tech Stack:** Next.js 16 (App Router), TypeScript 5, Tailwind CSS 4, Vitest (testing), standard `Intl` APIs (no date library).

## Global Constraints

- Guest mode remains default. No auth wall.
- localStorage remains source of truth. Do not rename storage keys or alter `PersistedLedgerState`.
- No automatic sync, no background jobs, no changes to cloud backup/manual restore.
- Financial computations derive from in-memory state only.
- Reuse existing `Account`, `Transaction`, `AccountKind`, `LedgerData` types from `src/lib/data/types.ts`.
- Month calculations use local calendar months (`new Date(year, month, 1)`).
- SVG charts must include `aria-label` attributes and empty-state fallbacks when no data.
- Recurring detection label: "Possible recurring transactions".
- Backup payload format unchanged.
- All new `.ts` files get unit tests in `src/lib/finance/__tests__/`.

## File Structure

### New Files
```
src/lib/finance/
  totals.ts            — computeIncome, computeExpenses, computeNetCashflow, computeNetWorth
  grouping.ts          — groupByCategory, groupByMonth, groupByAccount
  insights.ts          — largestExpense, topCategory, monthOverMonthChange, findRecurringTransactions, lowBalanceAlerts
  trends.ts            — monthlyTrend over time
  index.ts             — barrel export
  __tests__/
    totals.test.ts
    grouping.test.ts
    insights.test.ts
    trends.test.ts

src/components/charts/
  spending-by-category.tsx   — horizontal bar chart (SVG)
  income-vs-expenses.tsx     — grouped bar chart (SVG)
  account-balances.tsx       — horizontal distribution bars (SVG)
  monthly-trend.tsx          — line/area chart (SVG)
  index.ts                   — barrel export

src/components/
  dashboard-summary.tsx      — metric cards (income, expenses, net flow, net worth)
  insights-panel.tsx         — insight cards (top expense, top category, MoM, recurring, low balance)
  transactions-view.tsx      — search, filters, sort, table
  empty-states.tsx           — shared empty state components
```

### Modified Files
- `src/app/page.tsx` — integrate dashboard, charts, transactions view, insights, empty states
- `src/app/globals.css` — chart, filter bar, empty state, metric card styles
- `README.md` — update v0.4.0
- `CHANGELOG.md` — add v0.4.0 entry
- `docs/architecture.md` — add finance engine section

## Tasks

### Task 1: Branch and setup

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add test scripts)

- [ ] **Step 1: Create branch and install test dependencies**

```bash
cd /home/spars/repos/openledger
git checkout main
git pull origin main
git checkout -b feat/v0.4.0-dashboard-insights
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Configure vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

Update `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Verify**

```bash
npx vitest run
```
Expected: passes with 0 tests (no test files to run yet, but config is valid)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest and test infrastructure"
```

### Task 2: Finance engine — totals

**Files:**
- Create: `src/lib/finance/totals.ts`
- Create: `src/lib/finance/__tests__/totals.test.ts`

- [ ] **Step 1: Write test**

```ts
// src/lib/finance/__tests__/totals.test.ts
import { describe, it, expect } from "vitest";
import { computeIncome, computeExpenses, computeNetCashflow, computeNetWorth } from "../totals";
import type { Account, Transaction } from "@/lib/data/types";

describe("computeIncome", () => {
  it("sums positive amounts across transactions", () => {
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Salary", category: "Income", accountId: "a", amount: 5000 },
      { id: "2", date: "2026-05-15", description: "Freelance", category: "Income", accountId: "a", amount: 800 },
      { id: "3", date: "2026-05-10", description: "Rent", category: "Rent", accountId: "a", amount: -1500 },
    ];
    expect(computeIncome(txns)).toBe(5800);
  });

  it("returns 0 for no transactions", () => {
    expect(computeIncome([])).toBe(0);
  });

  it("returns 0 when all amounts are negative", () => {
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Rent", category: "Rent", accountId: "a", amount: -1500 },
    ];
    expect(computeIncome(txns)).toBe(0);
  });
});

describe("computeExpenses", () => {
  it("sums absolute values of negative amounts", () => {
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Rent", category: "Rent", accountId: "a", amount: -1500 },
      { id: "2", date: "2026-05-10", description: "Groceries", category: "Groceries", accountId: "a", amount: -200 },
      { id: "3", date: "2026-05-15", description: "Salary", category: "Income", accountId: "a", amount: 5000 },
    ];
    expect(computeExpenses(txns)).toBe(1700);
  });

  it("returns 0 for no transactions", () => {
    expect(computeExpenses([])).toBe(0);
  });
});

describe("computeNetCashflow", () => {
  it("returns income minus expenses", () => {
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Salary", category: "Income", accountId: "a", amount: 5000 },
      { id: "2", date: "2026-05-10", description: "Rent", category: "Rent", accountId: "a", amount: -1500 },
      { id: "3", date: "2026-05-15", description: "Groceries", category: "Groceries", accountId: "a", amount: -200 },
    ];
    expect(computeNetCashflow(txns)).toBe(3300);
  });

  it("returns 0 for empty transactions", () => {
    expect(computeNetCashflow([])).toBe(0);
  });
});

describe("computeNetWorth", () => {
  it("sums all account balances", () => {
    const accounts: Account[] = [
      { id: "a", name: "Chequing", kind: "chequing", subtitle: "", balance: 5000, currency: "CAD" },
      { id: "b", name: "Credit Card", kind: "credit-card", subtitle: "", balance: -1000, currency: "CAD" },
      { id: "c", name: "Savings", kind: "savings", subtitle: "", balance: 10000, currency: "CAD" },
    ];
    expect(computeNetWorth(accounts)).toBe(14000);
  });

  it("returns 0 for empty accounts", () => {
    expect(computeNetWorth([])).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/lib/finance/__tests__/totals.test.ts
```
Expected: fails — module not found

- [ ] **Step 3: Write implementation**

```ts
// src/lib/finance/totals.ts
import type { Account, Transaction } from "@/lib/data/types";

export function computeIncome(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
}

export function computeExpenses(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

export function computeNetCashflow(transactions: Transaction[]): number {
  return computeIncome(transactions) - computeExpenses(transactions);
}

export function computeNetWorth(accounts: Account[]): number {
  return accounts.reduce((sum, a) => sum + a.balance, 0);
}

export function accountEffectiveBalance(
  account: Account,
  transactions: Transaction[],
): number {
  return (
    account.balance +
    transactions
      .filter((t) => t.accountId === account.id && (t.source === "csv" || t.source === "manual"))
      .reduce((sum, t) => sum + t.amount, 0)
  );
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run src/lib/finance/__tests__/totals.test.ts
```
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/finance/
git commit -m "feat: add finance engine totals helpers"
```

### Task 3: Finance engine — grouping

**Files:**
- Create: `src/lib/finance/grouping.ts`
- Create: `src/lib/finance/__tests__/grouping.test.ts`

- [ ] **Step 1: Write test**

```ts
// src/lib/finance/__tests__/grouping.test.ts
import { describe, it, expect } from "vitest";
import {
  groupByCategory,
  groupByAccount,
  categoryTotals,
  monthlyTotals,
} from "../grouping";
import type { Transaction } from "@/lib/data/types";

const txns: Transaction[] = [
  { id: "1", date: "2026-05-01", description: "Salary", category: "Income", accountId: "a", amount: 5000 },
  { id: "2", date: "2026-05-10", description: "Rent", category: "Rent", accountId: "a", amount: -1500 },
  { id: "3", date: "2026-05-15", description: "Groceries", category: "Groceries", accountId: "b", amount: -200 },
  { id: "4", date: "2026-04-01", description: "Salary", category: "Income", accountId: "a", amount: 5000 },
];

describe("groupByCategory", () => {
  it("groups transactions by category key", () => {
    const grouped = groupByCategory(txns);
    expect(Object.keys(grouped).sort()).toEqual(["Groceries", "Income", "Rent"]);
    expect(grouped["Income"]).toHaveLength(2);
    expect(grouped["Rent"]).toHaveLength(1);
  });
  it("returns empty object for empty input", () => {
    expect(groupByCategory([])).toEqual({});
  });
});

describe("groupByAccount", () => {
  it("groups transactions by accountId", () => {
    const grouped = groupByAccount(txns);
    expect(Object.keys(grouped)).toEqual(["a", "b"]);
    expect(grouped["a"]).toHaveLength(3);
  });
});

describe("categoryTotals", () => {
  it("returns sorted category totals (expenses negative, income positive)", () => {
    const totals = categoryTotals(txns);
    const income = totals.find((t) => t.category === "Income");
    expect(income?.total).toBe(10000);
    const rent = totals.find((t) => t.category === "Rent");
    expect(rent?.total).toBe(-1500);
  });
  it("returns empty array for empty input", () => {
    expect(categoryTotals([])).toEqual([]);
  });
});

describe("monthlyTotals", () => {
  it("returns monthly income and expense totals", () => {
    const result = monthlyTotals(txns);
    const may = result.find((r) => r.month === "2026-05");
    expect(may?.income).toBe(5000);
    expect(may?.expense).toBe(1700);
    const apr = result.find((r) => r.month === "2026-04");
    expect(apr?.income).toBe(5000);
    expect(apr?.expense).toBe(0);
  });
  it("returns empty array for empty input", () => {
    expect(monthlyTotals([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/lib/finance/__tests__/grouping.test.ts
```

- [ ] **Step 3: Write implementation**

```ts
// src/lib/finance/grouping.ts
import type { Transaction } from "@/lib/data/types";

export function groupByCategory(transactions: Transaction[]): Record<string, Transaction[]> {
  const groups: Record<string, Transaction[]> = {};
  for (const t of transactions) {
    if (!groups[t.category]) groups[t.category] = [];
    groups[t.category].push(t);
  }
  return groups;
}

export function groupByAccount(transactions: Transaction[]): Record<string, Transaction[]> {
  const groups: Record<string, Transaction[]> = {};
  for (const t of transactions) {
    if (!groups[t.accountId]) groups[t.accountId] = [];
    groups[t.accountId].push(t);
  }
  return groups;
}

export function groupByMonth(transactions: Transaction[]): Record<string, Transaction[]> {
  const groups: Record<string, Transaction[]> = {};
  for (const t of transactions) {
    const month = t.date.slice(0, 7);
    if (!groups[month]) groups[month] = [];
    groups[month].push(t);
  }
  return groups;
}

export function categoryTotals(
  transactions: Transaction[],
): Array<{ category: string; total: number }> {
  const grouped = groupByCategory(transactions);
  return Object.entries(grouped)
    .map(([category, txns]) => ({
      category,
      total: txns.reduce((sum, t) => sum + t.amount, 0),
    }))
    .sort((a, b) => a.total - b.total);
}

export function monthlyTotals(
  transactions: Transaction[],
): Array<{ month: string; income: number; expense: number }> {
  const grouped = groupByMonth(transactions);
  return Object.entries(grouped)
    .map(([month, txns]) => ({
      month,
      income: txns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
      expense: txns.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run src/lib/finance/__tests__/grouping.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/finance/
git commit -m "feat: add finance engine grouping helpers"
```

### Task 4: Finance engine — insights

**Files:**
- Create: `src/lib/finance/insights.ts`
- Create: `src/lib/finance/__tests__/insights.test.ts`

- [ ] **Step 1: Write test**

```ts
// src/lib/finance/__tests__/insights.test.ts
import { describe, it, expect } from "vitest";
import {
  largestExpenseThisMonth,
  topSpendingCategory,
  monthOverMonthChange,
  findRecurringTransactions,
  lowBalanceAlerts,
} from "../insights";
import type { Account, Transaction } from "@/lib/data/types";

const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

describe("largestExpenseThisMonth", () => {
  it("returns the single largest expense for the current month", () => {
    const txns: Transaction[] = [
      { id: "1", date: `${currentMonth}-01`, description: "Rent", category: "Rent", accountId: "a", amount: -1500 },
      { id: "2", date: `${currentMonth}-10`, description: "Groceries", category: "Groceries", accountId: "a", amount: -300 },
      { id: "3", date: `${currentMonth}-15`, description: "Salary", category: "Income", accountId: "a", amount: 5000 },
    ];
    expect(largestExpenseThisMonth(txns)).toEqual({ description: "Rent", amount: -1500 });
  });

  it("returns null when no expenses this month", () => {
    expect(largestExpenseThisMonth([])).toBeNull();
  });
});

describe("topSpendingCategory", () => {
  it("returns category with highest absolute expense total", () => {
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Rent", category: "Rent", accountId: "a", amount: -1500 },
      { id: "2", date: "2026-05-10", description: "Groceries", category: "Groceries", accountId: "a", amount: -200 },
      { id: "3", date: "2026-05-15", description: "More Groceries", category: "Groceries", accountId: "a", amount: -100 },
    ];
    expect(topSpendingCategory(txns)).toEqual({ category: "Rent", total: -1500 });
  });

  it("returns null for empty input", () => {
    expect(topSpendingCategory([])).toBeNull();
  });
});

describe("monthOverMonthChange", () => {
  it("calculates percentage change in total expenses between last two months", () => {
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Rent", category: "Rent", accountId: "a", amount: -1500 },
      { id: "2", date: "2026-05-10", description: "Groceries", category: "Groceries", accountId: "a", amount: -200 },
      { id: "3", date: "2026-04-01", description: "Rent", category: "Rent", accountId: "a", amount: -1500 },
    ];
    const change = monthOverMonthChange(txns);
    expect(change).not.toBeNull();
    expect(change).toBeCloseTo(13.33, 1);
  });

  it("returns null when fewer than 2 months of data", () => {
    expect(monthOverMonthChange([])).toBeNull();
  });
});

describe("findRecurringTransactions", () => {
  it("finds transactions with same description and amount appearing 2+ times", () => {
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Netflix", category: "Subscriptions", accountId: "a", amount: -15.99 },
      { id: "2", date: "2026-04-01", description: "Netflix", category: "Subscriptions", accountId: "a", amount: -15.99 },
      { id: "3", date: "2026-05-10", description: "Coffee", category: "Food & Drink", accountId: "a", amount: -4.5 },
    ];
    const recurring = findRecurringTransactions(txns);
    expect(recurring).toHaveLength(1);
    expect(recurring[0].description).toBe("Netflix");
    expect(recurring[0].count).toBe(2);
  });

  it("returns empty array when no recurring transactions", () => {
    expect(findRecurringTransactions([])).toEqual([]);
  });
});

describe("lowBalanceAlerts", () => {
  it("flags accounts with balance below 100", () => {
    const accounts: Account[] = [
      { id: "a", name: "Chequing", kind: "chequing", subtitle: "", balance: 50, currency: "CAD" },
      { id: "b", name: "Savings", kind: "savings", subtitle: "", balance: 5000, currency: "CAD" },
    ];
    const alerts = lowBalanceAlerts(accounts, []);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].accountName).toBe("Chequing");
  });

  it("returns empty array when all balances are healthy", () => {
    const accounts: Account[] = [
      { id: "a", name: "Chequing", kind: "chequing", subtitle: "", balance: 500, currency: "CAD" },
    ];
    expect(lowBalanceAlerts(accounts, [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/lib/finance/__tests__/insights.test.ts
```

- [ ] **Step 3: Write implementation**

```ts
// src/lib/finance/insights.ts
import type { Account, Transaction } from "@/lib/data/types";
import { categoryTotals, monthlyTotals } from "./grouping";
import { accountEffectiveBalance } from "./totals";

const LOW_BALANCE_THRESHOLD = 100;

export function largestExpenseThisMonth(
  transactions: Transaction[],
): { description: string; amount: number } | null {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthTxns = transactions.filter((t) => t.date.startsWith(currentMonth) && t.amount < 0);
  if (monthTxns.length === 0) return null;
  const largest = monthTxns.reduce((a, b) => (a.amount < b.amount ? a : b));
  return { description: largest.description, amount: largest.amount };
}

export function topSpendingCategory(
  transactions: Transaction[],
): { category: string; total: number } | null {
  const totals = categoryTotals(transactions).filter((t) => t.total < 0);
  if (totals.length === 0) return null;
  return totals.reduce((a, b) => (a.total < b.total ? a : b));
}

export function monthOverMonthChange(
  transactions: Transaction[],
): number | null {
  const months = monthlyTotals(transactions).filter((m) => m.expense > 0);
  if (months.length < 2) return null;
  const last = months[months.length - 1];
  const prev = months[months.length - 2];
  if (prev.expense === 0) return null;
  return Math.round(((last.expense - prev.expense) / prev.expense) * 100 * 100) / 100;
}

export function findRecurringTransactions(
  transactions: Transaction[],
): Array<{ description: string; amount: number; count: number }> {
  const seen = new Map<string, { description: string; amount: number; count: number }>();
  for (const t of transactions) {
    const key = `${t.description}|${t.amount}`;
    if (seen.has(key)) {
      seen.get(key)!.count++;
    } else {
      seen.set(key, { description: t.description, amount: t.amount, count: 1 });
    }
  }
  return Array.from(seen.values()).filter((r) => r.count >= 2);
}

export function lowBalanceAlerts(
  accounts: Account[],
  transactions: Transaction[],
): Array<{ accountName: string; balance: number }> {
  return accounts
    .filter((a) => !a.archivedAt)
    .map((a) => ({
      accountName: a.name,
      balance: accountEffectiveBalance(a, transactions),
    }))
    .filter((a) => a.balance >= 0 && a.balance < LOW_BALANCE_THRESHOLD);
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run src/lib/finance/__tests__/insights.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/finance/
git commit -m "feat: add finance engine insights helpers"
```

### Task 5: Finance engine — trends

**Files:**
- Create: `src/lib/finance/trends.ts`
- Create: `src/lib/finance/__tests__/trends.test.ts`
- Create: `src/lib/finance/index.ts`

- [ ] **Step 1: Write test**

```ts
// src/lib/finance/__tests__/trends.test.ts
import { describe, it, expect } from "vitest";
import { monthlyTrend } from "../trends";
import type { Transaction } from "@/lib/data/types";

describe("monthlyTrend", () => {
  it("returns monthly income, expense, net sorted chronologically", () => {
    const txns: Transaction[] = [
      { id: "1", date: "2026-05-01", description: "Salary", category: "Income", accountId: "a", amount: 5000 },
      { id: "2", date: "2026-05-10", description: "Rent", category: "Rent", accountId: "a", amount: -1500 },
      { id: "3", date: "2026-04-01", description: "Salary", category: "Income", accountId: "a", amount: 4800 },
      { id: "4", date: "2026-04-10", description: "Rent", category: "Rent", accountId: "a", amount: -1400 },
    ];
    const trend = monthlyTrend(txns);
    expect(trend).toHaveLength(2);
    expect(trend[0].month).toBe("2026-04");
    expect(trend[0].income).toBe(4800);
    expect(trend[0].expense).toBe(1400);
    expect(trend[0].net).toBe(3400);
    expect(trend[1].month).toBe("2026-05");
    expect(trend[1].net).toBe(3500);
  });

  it("returns empty array for empty input", () => {
    expect(monthlyTrend([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/lib/finance/__tests__/trends.test.ts
```

- [ ] **Step 3: Write implementation**

```ts
// src/lib/finance/trends.ts
import type { Transaction } from "@/lib/data/types";
import { monthlyTotals } from "./grouping";

export function monthlyTrend(
  transactions: Transaction[],
): Array<{ month: string; income: number; expense: number; net: number }> {
  return monthlyTotals(transactions).map((m) => ({
    month: m.month,
    income: m.income,
    expense: m.expense,
    net: m.income - m.expense,
  }));
}
```

- [ ] **Step 4: Add barrel export**

```ts
// src/lib/finance/index.ts
export * from "./totals";
export * from "./grouping";
export * from "./insights";
export * from "./trends";
```

- [ ] **Step 5: Run tests and commit**

```bash
npx vitest run src/lib/finance/__tests__/trends.test.ts
git add src/lib/finance/
git commit -m "feat: add finance engine trends and barrel export"
```

### Task 6: SVG chart components

**Files:**
- Create: `src/components/charts/spending-by-category.tsx`
- Create: `src/components/charts/income-vs-expenses.tsx`
- Create: `src/components/charts/account-balances.tsx`
- Create: `src/components/charts/monthly-trend.tsx`
- Create: `src/components/charts/index.ts`

- [ ] **Step 1: Create `spending-by-category.tsx`**

Write file `src/components/charts/spending-by-category.tsx`:
```tsx
"use client";

type SpendingData = { category: string; total: number };

const currencyFormat = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  notation: "compact",
});

export function SpendingByCategoryChart({ data }: { data: SpendingData[] }) {
  const expenses = data.filter((d) => d.total < 0);
  if (expenses.length === 0) {
    return (
      <div className="chart-empty" aria-label="No spending data available">
        <p>No spending by category yet.</p>
      </div>
    );
  }

  const maxAbs = Math.max(...expenses.map((d) => Math.abs(d.total)), 1);

  return (
    <div className="chart" role="img" aria-label="Spending by category chart">
      {expenses.map((d) => {
        const pct = (Math.abs(d.total) / maxAbs) * 100;
        return (
          <div className="chart-bar-row" key={d.category}>
            <span className="chart-label">{d.category}</span>
            <div className="chart-bar-track">
              <div
                className="chart-bar-fill chart-bar-expense"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="chart-value">{currencyFormat.format(d.total)}</span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create `income-vs-expenses.tsx`**

Write file `src/components/charts/income-vs-expenses.tsx`:
```tsx
"use client";

type PeriodData = { label: string; income: number; expense: number };

const currencyFormat = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  notation: "compact",
});

export function IncomeVsExpensesChart({ data }: { data: PeriodData[] }) {
  if (data.length === 0) {
    return (
      <div className="chart-empty" aria-label="No income or expense data">
        <p>No income or expense data yet.</p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1);

  return (
    <div className="chart" role="img" aria-label="Income vs expenses chart">
      {data.map((d) => {
        const incomePct = (d.income / maxVal) * 100;
        const expensePct = (d.expense / maxVal) * 100;
        return (
          <div className="chart-bar-row" key={d.label}>
            <span className="chart-label">{d.label}</span>
            <div className="chart-group">
              <div className="chart-bar-track chart-bar-track-sm">
                <div
                  className="chart-bar-fill chart-bar-income"
                  style={{ width: `${incomePct}%` }}
                  title={`Income: ${currencyFormat.format(d.income)}`}
                />
              </div>
              <div className="chart-bar-track chart-bar-track-sm">
                <div
                  className="chart-bar-fill chart-bar-expense"
                  style={{ width: `${expensePct}%` }}
                  title={`Expenses: ${currencyFormat.format(d.expense)}`}
                />
              </div>
            </div>
            <span className="chart-value">
              {currencyFormat.format(d.income - d.expense)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create `account-balances.tsx`**

Write file `src/components/charts/account-balances.tsx`:
```tsx
"use client";

import type { Account } from "@/lib/data/types";

const currencyFormat = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  notation: "compact",
});

export function AccountBalancesChart({ accounts }: { accounts: Account[] }) {
  const active = accounts.filter((a) => !a.archivedAt);
  if (active.length === 0) {
    return (
      <div className="chart-empty" aria-label="No account balance data">
        <p>No accounts yet.</p>
      </div>
    );
  }

  const maxAbs = Math.max(...active.map((a) => Math.abs(a.balance)), 1);

  return (
    <div className="chart" role="img" aria-label="Account balance distribution">
      {active.map((a) => {
        const pct = (Math.abs(a.balance) / maxAbs) * 100;
        return (
          <div className="chart-bar-row" key={a.id}>
            <span className="chart-label">{a.name}</span>
            <div className="chart-bar-track">
              <div
                className={`chart-bar-fill ${a.balance >= 0 ? "chart-bar-income" : "chart-bar-expense"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`chart-value ${a.balance < 0 ? "negative" : "positive"}`}>
              {currencyFormat.format(a.balance)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Create `monthly-trend.tsx`**

Write file `src/components/charts/monthly-trend.tsx`:
```tsx
"use client";

type TrendData = { month: string; income: number; expense: number; net: number };

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-CA", { month: "short" }).format(
    new Date(`${month}-01T12:00:00`),
  );
}

export function MonthlyTrendChart({ data }: { data: TrendData[] }) {
  if (data.length < 2) {
    return (
      <div className="chart-empty" aria-label="Monthly trend data">
        <p>Need at least 2 months of data for a trend.</p>
      </div>
    );
  }

  const maxVal = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)));
  const svgWidth = 280;
  const svgHeight = 120;
  const pad = { top: 8, right: 8, bottom: 20, left: 8 };
  const chartW = svgWidth - pad.left - pad.right;
  const chartH = svgHeight - pad.top - pad.bottom;
  const stepX = chartW / (data.length - 1 || 1);

  const incomePath = data
    .map((d, i) =>
      `${i === 0 ? "M" : "L"} ${pad.left + i * stepX} ${pad.top + chartH - (d.income / maxVal) * chartH}`
    )
    .join(" ");

  const expensePath = data
    .map((d, i) =>
      `${i === 0 ? "M" : "L"} ${pad.left + i * stepX} ${pad.top + chartH - (d.expense / maxVal) * chartH}`
    )
    .join(" ");

  return (
    <div role="img" aria-label="Monthly trend chart showing income and expenses over time">
      <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        <path d={incomePath} fill="none" stroke="var(--sage-dark)" strokeWidth={2} />
        <path d={expensePath} fill="none" stroke="var(--amber-dark)" strokeWidth={2} />
        {data.map((d, i) => (
          <text
            key={d.month}
            x={pad.left + i * stepX}
            y={svgHeight - 4}
            textAnchor="middle"
            fontSize={9}
            fill="var(--muted-dark)"
          >
            {monthLabel(d.month)}
          </text>
        ))}
      </svg>
      <div className="chart-legend">
        <span><i className="legend-income" /> Income</span>
        <span><i className="legend-expense" /> Expenses</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create barrel export**

Write file `src/components/charts/index.ts`:
```ts
export { SpendingByCategoryChart } from "./spending-by-category";
export { IncomeVsExpensesChart } from "./income-vs-expenses";
export { AccountBalancesChart } from "./account-balances";
export { MonthlyTrendChart } from "./monthly-trend";
```

- [ ] **Step 6: Typecheck and commit**

```bash
npm run typecheck
git add src/components/charts/
git commit -m "feat: add SVG chart components for dashboard"
```

### Task 7: Empty states, dashboard summary, insights panel, transactions view components

**Files:**
- Create: `src/components/empty-states.tsx`
- Create: `src/components/dashboard-summary.tsx`
- Create: `src/components/insights-panel.tsx`
- Create: `src/components/transactions-view.tsx`

- [ ] **Step 1: Create `empty-states.tsx`**

Write file `src/components/empty-states.tsx`:
```tsx
"use client";

import { WalletCards, ReceiptText, BarChart3, LogIn, Cloud } from "lucide-react";

export function NoAccounts() {
  return (
    <div className="empty-state" role="status">
      <WalletCards size={32} aria-hidden />
      <strong>No accounts yet</strong>
      <p>Create an account to start tracking your finances.</p>
    </div>
  );
}

export function NoTransactions() {
  return (
    <div className="empty-state" role="status">
      <ReceiptText size={32} aria-hidden />
      <strong>No transactions found</strong>
      <p>Add a transaction or import a CSV to get started.</p>
    </div>
  );
}

export function NoChartData({ message }: { message?: string }) {
  return (
    <div className="chart-empty" role="status">
      <BarChart3 size={28} aria-hidden />
      <p>{message ?? "Not enough data for this chart yet."}</p>
    </div>
  );
}

export function GuestModeGuidance() {
  return (
    <div className="empty-state guidance-banner" role="status">
      <LogIn size={20} aria-hidden />
      <div>
        <strong>Guest mode</strong>
        <p>You're using OpenLedger without an account. Your data stays on this device.</p>
      </div>
    </div>
  );
}

export function CloudBackupGuidance() {
  return (
    <div className="empty-state guidance-banner" role="status">
      <Cloud size={20} aria-hidden />
      <div>
        <strong>Cloud backup available</strong>
        <p>Your data is saved locally. Use the Cloud Backup panel to manually back up or restore from the cloud.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `dashboard-summary.tsx`**

Write file `src/components/dashboard-summary.tsx`:
```tsx
"use client";

import type { Account, Transaction } from "@/lib/data/types";
import { computeIncome, computeExpenses, computeNetCashflow, computeNetWorth } from "@/lib/finance/totals";

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

export function DashboardSummary({
  accounts,
  transactions,
}: {
  accounts: Account[];
  transactions: Transaction[];
}) {
  const cards = [
    { label: "Income", amount: computeIncome(transactions), tone: computeIncome(transactions) > 0 ? "positive" : "neutral" as const },
    { label: "Expenses", amount: computeExpenses(transactions), tone: "negative" as const },
    { label: "Net cash flow", amount: computeNetCashflow(transactions), tone: (computeNetCashflow(transactions) >= 0 ? "positive" : "negative") as const },
    { label: "Net worth", amount: computeNetWorth(accounts), tone: (computeNetWorth(accounts) >= 0 ? "positive" : "negative") as const },
  ];

  return (
    <div className="summary-grid" role="region" aria-label="Financial summary">
      {cards.map((card) => (
        <div className="summary-card" key={card.label}>
          <span className="summary-label">{card.label}</span>
          <strong className={card.tone}>{currency.format(card.amount)}</strong>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `insights-panel.tsx`**

Write file `src/components/insights-panel.tsx`:
```tsx
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

  if (!largestExpense && !topCategory && momChange === null && recurring.length === 0 && alerts.length === 0) {
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
            <p>{largestExpense.description} — {currency.format(Math.abs(largestExpense.amount))}</p>
          </div>
        </div>
      ) : null}

      {topCategory ? (
        <div className="insight-card">
          <ArrowDown size={18} className="insight-icon-expense" />
          <div>
            <strong>Top spending category</strong>
            <p>{topCategory.category} — {currency.format(Math.abs(topCategory.total))}</p>
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
```

- [ ] **Step 4: Create `transactions-view.tsx`**

Write file `src/components/transactions-view.tsx`:
```tsx
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
type SortDir = "asc" | "desc";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short", day: "numeric", year: "numeric",
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
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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
      return sortDir === "desc" ? -cmp : cmp;
    });
    return result;
  }, [transactions, search, dateFrom, dateTo, accountFilter, categoryFilter, typeFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;

  return (
    <div className="transactions-view">
      <div className="filter-bar">
        <div className="filter-search">
          <Search size={15} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions…" aria-label="Search transactions" />
        </div>
        <div className="filter-controls">
          <label><span className="sr-only">From date</span><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
          <label><span className="sr-only">To date</span><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
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
            setSearch(""); setDateFrom(""); setDateTo("");
            setAccountFilter("all"); setCategoryFilter("all"); setTypeFilter("all");
          }}>Clear filters</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <NoTransactions />
      ) : (
        <div className="transaction-table-improved">
          <div className="table-head">
            <button className="sort-header" onClick={() => toggleSort("date")}>Date <ArrowUpDown size={13} /></button>
            <span>Description</span>
            <button className="sort-header" onClick={() => toggleSort("category")}>Category <ArrowUpDown size={13} /></button>
            <button className="sort-header" onClick={() => toggleSort("account")}>Account <ArrowUpDown size={13} /></button>
            <button className="sort-header" onClick={() => toggleSort("amount")}>Amount <ArrowUpDown size={13} /></button>
          </div>
          {filtered.map((t) => (
            <div className="table-row" key={t.id}>
              <span>{formatDate(t.date)}</span>
              <strong>{t.description}{t.merchant ? <small> — {t.merchant}</small> : null}</strong>
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
```

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/components/
git commit -m "feat: add empty states, dashboard summary, insights panel, transactions view"
```

### Task 8: Integrate into dashboard (modify page.tsx)

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Edit page.tsx — add imports and nav item**

Open `src/app/page.tsx`. Add the following imports after the existing imports:
```ts
import { SpendingByCategoryChart, IncomeVsExpensesChart, AccountBalancesChart, MonthlyTrendChart } from "@/components/charts";
import { DashboardSummary } from "@/components/dashboard-summary";
import { InsightsPanel } from "@/components/insights-panel";
import { TransactionsView } from "@/components/transactions-view";
import { GuestModeGuidance, CloudBackupGuidance } from "@/components/empty-states";
import { categoryTotals } from "@/lib/finance/grouping";
import { monthlyTrend } from "@/lib/finance/trends";
import { accountEffectiveBalance } from "@/lib/finance/totals";
```

Add "Dashboard" to the `navItems` array (first position):
```ts
const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Overview", icon: Archive },
  { label: "Accounts", icon: WalletCards },
  { label: "Transactions", icon: ReceiptText },
  { label: "Memory", icon: Archive },
  { label: "Forecast", icon: Cloud },
  { label: "Settings", icon: Settings },
];
```

- [ ] **Step 2: Add computed data for dashboard**

After the `importedTransactions` line and before `currentLedgerData`, add:
```ts
const trendData = useMemo(() => monthlyTrend(transactions), [transactions]);
const categoryData = useMemo(() => categoryTotals(transactions), [transactions]);

const incomeVsExpenseData = useMemo(
  () => trendData.map((d) => ({
    label: new Intl.DateTimeFormat("en-CA", { month: "short", year: "2-digit" }).format(new Date(`${d.month}-01T12:00:00`)),
    income: d.income,
    expense: d.expense,
  })),
  [trendData],
);

const effectiveBalances = useMemo(
  () => accounts.map((a) => ({
    ...a,
    balance: accountEffectiveBalance(a, transactions),
  })),
  [accounts, transactions],
);
```

- [ ] **Step 3: Add Dashboard section to the render**

Inside the `return` of `Home()`, after the `dashboard-grid` div's opening tag (or before the first existing panel), add a conditional section:

```tsx
{activeNav === "Dashboard" ? (
  <div className="dashboard-page">
    <section className="dashboard-section">
      <h2 className="section-title">Financial Summary</h2>
      <DashboardSummary accounts={accounts} transactions={transactions} />
    </section>

    <section className="dashboard-section chart-section">
      <h2 className="section-title">Spending by Category</h2>
      {transactions.length > 0
        ? <SpendingByCategoryChart data={categoryData} />
        : <NoChartData message="No transaction data for category breakdown yet." />}
    </section>

    <section className="dashboard-section chart-section">
      <h2 className="section-title">Income vs Expenses</h2>
      {trendData.length > 0
        ? <IncomeVsExpensesChart data={incomeVsExpenseData} />
        : <NoChartData message="No transaction data for income vs expenses yet." />}
    </section>

    <section className="dashboard-section chart-section">
      <h2 className="section-title">Account Balances</h2>
      {accounts.filter((a) => !a.archivedAt).length > 0
        ? <AccountBalancesChart accounts={effectiveBalances} />
        : <NoChartData message="No accounts yet." />}
    </section>

    <section className="dashboard-section chart-section">
      <h2 className="section-title">Monthly Trend</h2>
      {trendData.length > 1
        ? <MonthlyTrendChart data={trendData} />
        : <NoChartData message="Need at least 2 months of data for a trend." />}
    </section>

    <section className="dashboard-section insights-section">
      <h2 className="section-title">Insights</h2>
      <InsightsPanel accounts={accounts} transactions={transactions} />
    </section>

    <section className="dashboard-section transactions-section-wide">
      <h2 className="section-title">Transactions</h2>
      <TransactionsView transactions={transactions} accounts={accounts} />
    </section>
  </div>
) : (
  <>
    {/* Move the existing dashboard-grid content here, inside the else block */}
  </>
)}
```

For the existing sections, wrap them inside the else block. The final structure will be:
```tsx
<div className="dashboard-grid">
  {activeNav === "Dashboard" ? (
    <div className="dashboard-page">
      ...dashboard sections...
    </div>
  ) : (
    <>
      ...existing panels from the current dashboard-grid...
    </>
  )}
</div>
```

- [ ] **Step 4: Add NoChartData import**

Add to the import line for empty-states:
```ts
import { GuestModeGuidance, CloudBackupGuidance, NoChartData } from "@/components/empty-states";
```

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/app/page.tsx
git commit -m "feat: integrate dashboard, charts, insights, and transactions view into page"
```

### Task 9: CSS styles

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add dashboard-page and section-title styles**

Append to the end of `globals.css`:
```css
/* ── Dashboard page ── */
.dashboard-page {
  grid-column: 1 / -1;
  display: grid;
  gap: 18px;
}

.dashboard-section {
  grid-column: 1 / -1;
}

.dashboard-section .section-title {
  margin: 0 0 10px;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 18px;
  font-weight: 500;
}

.chart-section,
.insights-section {
  grid-column: span 2;
}

.transactions-section-wide {
  grid-column: 1 / -1;
}

/* ── Summary cards ── */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid var(--line-dark);
  border-radius: 6px;
  background: var(--graphite-2);
  padding: 16px;
}

.summary-label {
  color: var(--muted);
  font-size: 13px;
}

.summary-card strong {
  font-size: 22px;
  font-variant-numeric: tabular-nums;
}

.summary-card .positive { color: var(--sage); }
.summary-card .negative { color: var(--amber); }
.summary-card .neutral  { color: var(--ink); }

/* ── Charts ── */
.chart {
  display: grid;
  gap: 8px;
}

.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  gap: 8px;
  color: var(--muted-dark);
  text-align: center;
  font-size: 13px;
}

.chart-bar-row {
  display: grid;
  grid-template-columns: 90px 1fr 72px;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.chart-label {
  color: var(--muted-dark);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chart-bar-track {
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--line-dark);
}

.chart-bar-track-sm {
  height: 8px;
}

.chart-bar-fill {
  height: 100%;
  border-radius: inherit;
  transition: width 300ms ease;
}

.chart-bar-income {
  background: var(--sage);
}

.chart-bar-expense {
  background: var(--amber);
}

.chart-value {
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  text-align: right;
}

.chart-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.chart-legend {
  display: flex;
  gap: 16px;
  margin-top: 6px;
  font-size: 11px;
  color: var(--muted);
}

.chart-legend i {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  margin-right: 4px;
  vertical-align: middle;
}

.legend-income { background: var(--sage); }
.legend-expense { background: var(--amber); }

/* ── Insights panel ── */
.insights-panel-body {
  display: grid;
  gap: 10px;
}

.insights-empty {
  color: var(--muted-dark);
  font-size: 13px;
  text-align: center;
  padding: 20px 0;
}

.insight-card {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  border: 1px solid var(--line-dark);
  border-radius: 6px;
  background: var(--graphite-2);
  padding: 12px;
}

.insight-card strong {
  display: block;
  font-size: 14px;
  font-weight: 560;
  margin-bottom: 2px;
}

.insight-card p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.insight-icon-expense { color: var(--amber); flex-shrink: 0; margin-top: 2px; }
.insight-icon-warn { color: var(--danger-soft); flex-shrink: 0; margin-top: 2px; }
.insight-icon-save { color: var(--sage); flex-shrink: 0; margin-top: 2px; }
.insight-icon-recur { color: var(--sage); flex-shrink: 0; margin-top: 2px; }

/* ── Transactions view ── */
.transactions-view {
  display: grid;
  gap: 10px;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.filter-search {
  display: flex;
  flex: 1;
  min-width: 200px;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--line-dark);
  border-radius: 6px;
  background: var(--graphite-2);
  padding: 8px 12px;
  color: var(--muted);
}

.filter-search input {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--ink);
  outline: none;
}

.filter-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-controls select,
.filter-controls input[type="date"] {
  border: 1px solid var(--line-dark);
  border-radius: 6px;
  background: var(--graphite-2);
  color: var(--ink);
  padding: 6px 10px;
  font-size: 13px;
}

.filter-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--muted);
  font-size: 13px;
}

.clear-filters {
  border: 0;
  background: transparent;
  color: var(--sage);
  font-size: 12px;
  text-decoration: underline;
  cursor: pointer;
}

.transaction-table-improved {
  display: grid;
  gap: 0;
}

.transaction-table-improved .table-head {
  display: grid;
  grid-template-columns: 100px 1fr 90px 100px 100px;
  gap: 10px;
  border-bottom: 1px solid var(--line-dark);
  padding: 8px 0;
  color: var(--muted);
  font-size: 12px;
  font-weight: 560;
}

.sort-header {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: 12px;
  font-weight: 560;
  padding: 0;
  text-align: left;
}

.sort-header:hover {
  color: var(--ink);
}

.transaction-table-improved .table-row {
  display: grid;
  grid-template-columns: 100px 1fr 90px 100px 100px;
  gap: 10px;
  align-items: center;
  border-bottom: 1px solid var(--line-dark);
  padding: 10px 0;
  font-size: 14px;
}

.transaction-table-improved .table-row strong {
  font-weight: 560;
}

.transaction-table-improved .table-row small {
  display: block;
  color: var(--muted-dark);
  font-size: 11px;
  margin-top: 1px;
}

/* ── Empty states ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  gap: 8px;
  color: var(--muted-dark);
  text-align: center;
  padding: 24px 16px;
}

.empty-state strong {
  font-size: 15px;
  color: var(--muted);
}

.empty-state p {
  margin: 0;
  font-size: 13px;
  max-width: 300px;
}

.guidance-banner {
  flex-direction: row;
  text-align: left;
  justify-content: flex-start;
  gap: 14px;
  border: 1px solid var(--line-dark);
  border-radius: 6px;
  background: var(--rail);
  min-height: auto;
}

.guidance-banner strong {
  color: var(--ink);
}

.guidance-banner a {
  color: var(--sage);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "style: add dashboard, chart, filter, and empty state styles"
```

### Task 10: Documentation updates

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/architecture.md`

- [ ] **Step 1: Update README.md**

Update status section header from "v0.3.0" to "v0.4.0":
```
**Maturity:** Maintained. v0.4.0 — dashboard with financial insights and improved transaction view; guest mode remains default.
```

Add to "What exists now":
```
- Redesigned dashboard with financial summary cards (income, expenses, net cash flow, net worth).
- SVG charts: spending by category, income vs expenses, account balance distribution, monthly trend.
- Improved transactions view with search, date range filter, account/category/type filters, and sortable columns.
- Insights panel: largest expense this month, top spending category, month-over-month change, possible recurring transactions, low balance warnings.
- Empty states for accounts, transactions, charts, guest mode guidance, and cloud backup guidance.
- Finance engine helpers (totals, grouping, insights, trends) with unit tests.
```

- [ ] **Step 2: Update CHANGELOG.md**

Add after the `## 0.3.0` entry:
```markdown
## 0.4.0 — 2026-06-19

- Redesigned dashboard with financial summary cards (income, expenses, net cash flow, net worth).
- Added SVG charts: spending by category, income vs expenses, account balance distribution, monthly trend.
- Improved transactions view with search, date range filter, account/category/type filters, and sortable columns.
- Added insights panel: largest expense this month, top spending category, month-over-month change, possible recurring transactions, low balance warnings.
- Added empty states for accounts, transactions, charts, guest mode guidance, and cloud backup guidance.
- Built finance engine helpers (totals, grouping, insights, trends) with unit tests.
- All computations are local derivations from in-memory state. No changes to persistence, backup, auth, or storage keys.
```

- [ ] **Step 3: Update docs/architecture.md**

Add the "Finance Engine (v0.4.0)" section before the "Supabase Foundation" section.

- [ ] **Step 4: Commit**

```bash
git add README.md CHANGELOG.md docs/architecture.md
git commit -m "docs: update README, changelog, and architecture for v0.4.0"
```

### Task 11: Validation

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Run tests**

```bash
npm run test
```

- [ ] **Step 4: Run build**

```bash
npm run build
```

- [ ] **Step 5: Commit fixes**

```bash
git add -A
git commit -m "chore: fix lint, typecheck, and build issues"
```

### Task 12: Create PR

- [ ] **Step 1: Push branch**

```bash
git push origin feat/v0.4.0-dashboard-insights
```

- [ ] **Step 2: Create PR via GitHub MCP**

```bash
gh pr create \
  --base main \
  --head feat/v0.4.0-dashboard-insights \
  --title "feat: add OpenLedger dashboard and financial insights" \
  --body "## v0.4.0 — Dashboard & Financial Insights

### Features
- Redesigned dashboard with financial summary cards (income, expenses, net cash flow, net worth)
- SVG charts: spending by category, income vs expenses, account balance distribution, monthly trend
- Improved transactions view with search, date range filter, account/category/type filters, and sortable columns
- Insights panel: largest expense this month, top spending category, month-over-month change, possible recurring transactions, low balance warnings
- Empty states for accounts, transactions, charts, guest mode guidance, and cloud backup guidance

### Technical
- Finance engine helpers in \`src/lib/finance/\` (totals, grouping, insights, trends) with unit tests
- Pure SVG chart components with accessibility labels and empty-state fallbacks
- All computations are local derivations from in-memory state
- No changes to persistence, backup, auth, or storage keys

### Acceptance criteria
- [x] Existing local data still loads
- [x] Guest mode works without login
- [x] Dashboard shows accurate totals
- [x] Charts handle empty data safely
- [x] Filters and search work together
- [x] Cloud backup still works unchanged

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 3: Final summary**

Provide a summary of everything built:
- Finance engine: 4 modules (totals, grouping, insights, trends) with 4 test files, all passing
- Chart components: 4 SVG chart components with accessibility
- UI components: dashboard summary, insights panel, transactions view, empty states
- Integrated into page.tsx as a new "Dashboard" nav section
- All styles added to globals.css
- Docs updated
- Branch: `feat/v0.4.0-dashboard-insights`
