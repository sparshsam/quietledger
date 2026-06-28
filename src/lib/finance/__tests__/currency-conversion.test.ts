import { describe, it, expect, beforeEach } from "vitest";
import type { Account, Transaction, CurrencySettings } from "@/lib/data/types";
import { DEFAULT_CURRENCY_SETTINGS } from "@/lib/data/types";
import {
  getDisplayCurrency,
  getAccountCurrency,
  convertTransactionAmount,
  computeIncomeInCurrency,
  computeExpensesInCurrency,
  computeNetWorthInCurrency,
  computeCategoryTotalsInCurrency,
  getTransactionDisplayAmount,
  convertAccountBalance,
} from "../currency-conversion";
import { setCachedRate } from "../exchange-rates";

// Mock localStorage for exchange rate cache
function setupLocalStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    },
    writable: true,
  });
  return store;
}

const settings: CurrencySettings = {
  baseCurrency: "USDC",
  importCurrency: "USDC",
  locale: "en-US",
};

describe("getDisplayCurrency", () => {
  it("returns base currency when no entity provided", () => {
    expect(getDisplayCurrency(settings)).toBe("USDC");
  });

  it("returns entity currency when available", () => {
    expect(getDisplayCurrency(settings, { currency: "EUR" })).toBe("EUR");
  });
});

describe("getAccountCurrency", () => {
  it("returns account currency", () => {
    const account: Account = {
      id: "1", name: "Test", kind: "chequing", subtitle: "", balance: 0, currency: "EUR",
    };
    expect(getAccountCurrency(account, settings)).toBe("EUR");
  });

  it("falls back to base currency", () => {
    const account: Account = {
      id: "1", name: "Test", kind: "chequing", subtitle: "", balance: 0, currency: "EUR",
    };
    expect(getAccountCurrency(account, settings)).toBe("EUR");
  });
});

describe("convertTransactionAmount", () => {
  beforeEach(() => {
    setupLocalStorage();
    setCachedRate("EUR", "USDC", 1.0805, "test");
  });

  it("converts transaction with original currency", () => {
    const tx: Transaction = {
      id: "1", date: "2024-01-15", description: "Test", amount: -42.5,
      originalAmount: -42.5, originalCurrency: "EUR",
      accountId: "a1", category: "Misc",
    };
    const result = convertTransactionAmount(tx, "USDC");
    expect(result).toBeCloseTo(-45.92, 1);
  });

  it("passes through when currencies match", () => {
    const tx: Transaction = {
      id: "1", date: "2024-01-15", description: "Test", amount: -42.5,
      originalAmount: -42.5, originalCurrency: "USDC",
      accountId: "a1", category: "Misc",
    };
    const result = convertTransactionAmount(tx, "USDC");
    expect(result).toBe(-42.5);
  });

  it("returns amount when no original currency", () => {
    const tx: Transaction = {
      id: "1", date: "2024-01-15", description: "Test", amount: -42.5,
      accountId: "a1", category: "Misc",
    };
    const result = convertTransactionAmount(tx, "USDC");
    expect(result).toBe(-42.5);
  });
});

describe("computeIncomeInCurrency", () => {
  beforeEach(() => {
    setupLocalStorage();
    setCachedRate("EUR", "USDC", 1.08, "test");
  });

  it("converts income from different currencies", () => {
    const txns: Transaction[] = [
      { id: "1", date: "2024-01-15", description: "Salary", amount: 100, accountId: "a1", category: "Income", originalAmount: 100, originalCurrency: "EUR" },
    ];
    const result = computeIncomeInCurrency(txns, "USDC");
    expect(result).toBeCloseTo(108, 0);
  });
});

describe("computeExpensesInCurrency", () => {
  beforeEach(() => {
    setupLocalStorage();
    setCachedRate("GBP", "USDC", 1.27, "test");
  });

  it("converts expenses from different currencies", () => {
    const txns: Transaction[] = [
      { id: "1", date: "2024-01-15", description: "Shopping", amount: -50, accountId: "a1", category: "Shopping", originalAmount: -50, originalCurrency: "GBP" },
    ];
    const result = computeExpensesInCurrency(txns, "USDC");
    expect(result).toBeCloseTo(63.5, 0);
  });
});

describe("computeNetWorthInCurrency", () => {
  beforeEach(() => {
    setupLocalStorage();
    setCachedRate("EUR", "USDC", 1.08, "test");
  });

  it("converts account balances to target currency", () => {
    const accounts: Account[] = [
      { id: "a1", name: "EUR Account", kind: "chequing", subtitle: "", balance: 1000, currency: "EUR" },
      { id: "a2", name: "USDC Account", kind: "savings", subtitle: "", balance: 5000, currency: "USDC" },
    ];
    const result = computeNetWorthInCurrency(accounts, "USDC");
    // 1000 EUR * 1.08 + 5000 USDC = 6080
    expect(result).toBeCloseTo(6080, 0);
  });
});

describe("computeCategoryTotalsInCurrency", () => {
  beforeEach(() => {
    setupLocalStorage();
    setCachedRate("EUR", "USDC", 1.08, "test");
  });

  it("aggregates and converts category totals", () => {
    const txns: Transaction[] = [
      { id: "1", date: "2024-01-15", description: "Coffee", amount: -4.5, accountId: "a1", category: "Food", originalAmount: -4.5, originalCurrency: "EUR" },
      { id: "2", date: "2024-01-15", description: "Groceries", amount: -50, accountId: "a1", category: "Food", originalAmount: -50, originalCurrency: "EUR" },
    ];
    const totals = computeCategoryTotalsInCurrency(txns, "USDC");
    expect(totals).toHaveLength(1);
    expect(totals[0].category).toBe("Food");
    // (4.5 + 50) * 1.08 ≈ 58.86
    expect(totals[0].total).toBeCloseTo(58.86, 1);
  });
});

describe("convertAccountBalance", () => {
  beforeEach(() => {
    setupLocalStorage();
    setCachedRate("EUR", "USDC", 1.08, "test");
  });

  it("returns same balance for matching currencies", () => {
    const account: Account = {
      id: "1", name: "Test", kind: "chequing", subtitle: "", balance: 1000, currency: "USDC",
    };
    const result = convertAccountBalance(account, "USDC");
    expect(result.convertedBalance).toBe(1000);
    expect(result.rate).toBe(1);
  });

  it("converts balance for different currencies", () => {
    const account: Account = {
      id: "1", name: "Test", kind: "chequing", subtitle: "", balance: 1000, currency: "EUR",
    };
    const result = convertAccountBalance(account, "USDC");
    expect(result.convertedBalance).toBeCloseTo(1080, 0);
  });
});

describe("getTransactionDisplayAmount", () => {
  beforeEach(() => {
    setupLocalStorage();
    setCachedRate("EUR", "USDC", 1.08, "test");
  });

  it("shows conversion for different currencies", () => {
    const tx: Transaction = {
      id: "1", date: "2024-01-15", description: "Test", amount: -42.5,
      originalAmount: -42.5, originalCurrency: "EUR",
      accountId: "a1", category: "Misc",
    };
    const result = getTransactionDisplayAmount(tx, "USDC");
    expect(result.showConversion).toBe(true);
    expect(result.secondaryLine).toContain("→");
    expect(result.secondaryLine).toContain("USDC");
  });

  it("does not show conversion for matching currencies", () => {
    const tx: Transaction = {
      id: "1", date: "2024-01-15", description: "Test", amount: -42.5,
      originalAmount: -42.5, originalCurrency: "USDC",
      accountId: "a1", category: "Misc",
    };
    const result = getTransactionDisplayAmount(tx, "USDC");
    expect(result.showConversion).toBe(false);
  });
});
