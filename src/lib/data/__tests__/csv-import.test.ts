import { describe, it, expect } from "vitest";
import { parseAmount, parseDate, parseDebitCredit, detectLikelyDuplicates, detectTransfer, buildImportPreview, parseCsv, duplicateKey } from "../csv-import";
import type { Account, Transaction } from "../types";

// ─── International Date Parsing ─────────────────────────────────────────────

describe("parseDate", () => {
  it("parses YYYY-MM-DD", () => {
    expect(parseDate("2024-03-15")).toBe("2024-03-15");
  });

  it("parses DD/MM/YYYY", () => {
    expect(parseDate("15/03/2024")).toBe("2024-03-15");
  });

  it("parses MM/DD/YYYY", () => {
    expect(parseDate("03/15/2024")).toBe("2024-03-15");
  });

  it("parses DD-MM-YYYY", () => {
    expect(parseDate("15-03-2024")).toBe("2024-03-15");
  });

  it("parses DD.MM.YYYY", () => {
    expect(parseDate("15.03.2024")).toBe("2024-03-15");
  });

  it("parses YYYY/MM/DD", () => {
    expect(parseDate("2024/03/15")).toBe("2024-03-15");
  });

  it("parses YYYYMMDD compact", () => {
    expect(parseDate("20240315")).toBe("2024-03-15");
  });

  it("parses DD Month YYYY (English)", () => {
    expect(parseDate("15 March 2024")).toBe("2024-03-15");
    expect(parseDate("1 Jan 2024")).toBe("2024-01-01");
    expect(parseDate("31 December 2024")).toBe("2024-12-31");
  });

  it("parses Month DD, YYYY (English)", () => {
    expect(parseDate("March 15, 2024")).toBe("2024-03-15");
    expect(parseDate("Jan 1, 2024")).toBe("2024-01-01");
  });

  it("parses French month names", () => {
    expect(parseDate("15 janv 2024")).toBe("2024-01-15");
    expect(parseDate("15 mars 2024")).toBe("2024-03-15");
    expect(parseDate("15 déc 2024")).toBe("2024-12-15");
  });

  it("parses German month names", () => {
    expect(parseDate("1 jan 2024")).toBe("2024-01-01");
    expect(parseDate("15 mär 2024")).toBe("2024-03-15");
    expect(parseDate("1 dez 2024")).toBe("2024-12-01");
  });

  it("parses Spanish month names", () => {
    expect(parseDate("15 enero 2024")).toBe("2024-01-15");
    expect(parseDate("1 feb 2024")).toBe("2024-02-01");
    expect(parseDate("15 dic 2024")).toBe("2024-12-15");
  });

  it("parses Italian month names", () => {
    expect(parseDate("15 gen 2024")).toBe("2024-01-15");
    expect(parseDate("15 dic 2024")).toBe("2024-12-15");
  });

  it("parses Dutch month names", () => {
    expect(parseDate("15 jan 2024")).toBe("2024-01-15");
    expect(parseDate("15 mrt 2024")).toBe("2024-03-15");
  });

  it("returns null for invalid dates", () => {
    expect(parseDate("")).toBeNull();
    expect(parseDate("not-a-date")).toBeNull();
    expect(parseDate("99/99/9999")).toBeNull(); // Invalid day/month
  });

  it("respects preferred format order", () => {
    // When preferred format is DD/MM/YYYY, 03/04/2024 should be April 3, not March 4
    const result = parseDate("03/04/2024", ["DD/MM/YYYY", "MM/DD/YYYY"]);
    expect(result).toBe("2024-04-03"); // DD/MM/YYYY has priority
  });

  it("uses alternative format when preferred fails", () => {
    const result = parseDate("15/03/2024", ["MM/DD/YYYY", "DD/MM/YYYY"]);
    expect(result).toBe("2024-03-15"); // DD/MM/YYYY works as fallback
  });
});

// ─── International Amount Parsing ───────────────────────────────────────────

describe("parseAmount", () => {
  it("parses standard period decimal", () => {
    const r = parseAmount("1234.56");
    expect(r.value).toBe(1234.56);
  });

  it("parses comma decimal (European)", () => {
    const r = parseAmount("1234,56");
    expect(r.value).toBe(1234.56);
  });

  it("parses thousands separator with period decimal (1,234.56)", () => {
    const r = parseAmount("1,234.56");
    expect(r.value).toBe(1234.56);
  });

  it("parses thousands separator with comma decimal (1.234,56)", () => {
    const r = parseAmount("1.234,56");
    expect(r.value).toBe(1234.56);
  });

  it("parses amount with no separators", () => {
    const r = parseAmount("1234");
    expect(r.value).toBe(1234);
  });

  it("parses parentheses as negative", () => {
    const r = parseAmount("(100.00)");
    expect(r.value).toBe(-100);
  });

  it("parses signed amounts", () => {
    const r = parseAmount("-50.00");
    expect(r.value).toBe(-50);
    const r2 = parseAmount("+25.00");
    expect(r2.value).toBe(25);
  });

  it("parses debit type as negative", () => {
    const r = parseAmount("100.00", "debit");
    expect(r.value).toBe(-100);
  });

  it("parses credit type as positive", () => {
    const r = parseAmount("100.00", "credit");
    expect(r.value).toBe(100);
  });

  it("detects currency from symbol ($)", () => {
    const r = parseAmount("$100.00");
    expect(r.value).toBe(100);
    expect(r.currency).toBe("USD");
  });

  it("detects currency from symbol (€)", () => {
    const r = parseAmount("€42,50");
    expect(r.value).toBe(42.5);
    expect(r.currency).toBe("EUR");
  });

  it("detects currency from symbol (£)", () => {
    const r = parseAmount("£99.99");
    expect(r.value).toBe(99.99);
    expect(r.currency).toBe("GBP");
  });

  it("detects currency from code prefix", () => {
    const r = parseAmount("EUR 100.00");
    expect(r.value).toBe(100);
    expect(r.currency).toBe("EUR");
  });

  it("detects currency from code suffix", () => {
    const r = parseAmount("100.00 EUR");
    expect(r.value).toBe(100);
    expect(r.currency).toBe("EUR");
  });

  it("handles empty input", () => {
    const r = parseAmount("");
    expect(r.value).toBeNull();
  });

  it("handles whitespace", () => {
    const r = parseAmount("  $1,234.56  ");
    expect(r.value).toBe(1234.56);
  });

  it("parses large numbers with multiple thousands separators", () => {
    const r = parseAmount("1,234,567.89");
    expect(r.value).toBe(1234567.89);
  });

  it("handles explicit decimal separator (comma)", () => {
    const r = parseAmount("1.234,56", undefined, ",", ".");
    expect(r.value).toBe(1234.56);
  });
});

// ─── Debit/Credit Split Columns ─────────────────────────────────────────────

describe("parseDebitCredit", () => {
  it("parses debit column as negative", () => {
    const result = parseDebitCredit("100.00", "");
    expect(result).toBe(-100);
  });

  it("parses credit column as positive", () => {
    const result = parseDebitCredit("", "200.00");
    expect(result).toBe(200);
  });

  it("prefers debit over credit when both present", () => {
    const result = parseDebitCredit("50.00", "0.00");
    expect(result).toBe(-50);
  });

  it("handles European comma-decimal in debit", () => {
    const result = parseDebitCredit("99,99", "", ",", ".");
    expect(result).toBe(-99.99);
  });

  it("returns null when both empty", () => {
    const result = parseDebitCredit("", "");
    expect(result).toBeNull();
  });
});

// ─── CSV Parsing ────────────────────────────────────────────────────────────

describe("parseCsv", () => {
  it("parses basic CSV", () => {
    const csv = "date,description,amount\n2024-01-15,Test transaction,100.00\n";
    const result = parseCsv(csv);
    expect(result.headers).toEqual(["date", "description", "amount"]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].date).toBe("2024-01-15");
    expect(result.rows[0].amount).toBe("100.00");
  });

  it("detects format from headers", () => {
    const csv = "Date,Narration,Chq/Ref No,Withdrawal,Deposit,Balance\n2024-01-15,Test,,100.00,,\n";
    const result = parseCsv(csv);
    expect(result.detectedFormat?.id).toBe("in-standard");
  });

  it("detects currency from headers", () => {
    const csv = "date,description,EUR\n2024-01-15,Test,100.00\n";
    const result = parseCsv(csv);
    expect(result.detectedCurrency).toBe("EUR");
  });

  it("handles BOM character", () => {
    const csv = "﻿date,amount\n2024-01-01,100\n";
    const result = parseCsv(csv);
    expect(result.headers[0]).toBe("date");
  });

  it("handles quoted fields with commas", () => {
    const csv = 'date,description,amount\n2024-01-15,"Coffee, Cafe",4.50\n';
    const result = parseCsv(csv);
    expect(result.rows[0].description).toBe("Coffee, Cafe");
  });

  it("handles quoted fields with newlines", () => {
    const csv = 'date,description,amount\n2024-01-15,"Multi\nline",100\n';
    const result = parseCsv(csv);
    expect(result.rows[0].description).toBe("Multi\nline");
  });
});

// ─── Duplicate Detection ────────────────────────────────────────────────────

describe("duplicateKey", () => {
  it("generates consistent keys", () => {
    const t1: Transaction = { id: "1", date: "2024-01-15", description: "Coffee", amount: -4.5, accountId: "a1", category: "Food" };
    const t2: Transaction = { id: "2", date: "2024-01-15", description: "Coffee", amount: -4.5, accountId: "a1", category: "Food" };
    expect(duplicateKey(t1)).toBe(duplicateKey(t2));
  });

  it("differentiates different amounts", () => {
    const t1: Transaction = { id: "1", date: "2024-01-15", description: "Coffee", amount: -4.5, accountId: "a1", category: "Food" };
    const t2: Transaction = { id: "2", date: "2024-01-15", description: "Coffee", amount: -5.0, accountId: "a1", category: "Food" };
    expect(duplicateKey(t1)).not.toBe(duplicateKey(t2));
  });
});

describe("detectLikelyDuplicates", () => {
  it("finds exact match", () => {
    const existing: Transaction[] = [
      { id: "1", date: "2024-01-15", description: "Starbucks Coffee", amount: -4.5, accountId: "a1", category: "Food" },
    ];
    const candidate: Transaction = { id: "2", date: "2024-01-15", description: "Starbucks Coffee", amount: -4.5, accountId: "a1", category: "Food" };
    const matches = detectLikelyDuplicates(existing, candidate);
    expect(matches).toHaveLength(1);
  });

  it("finds similar description with word overlap", () => {
    const existing: Transaction[] = [
      { id: "1", date: "2024-01-15", description: "Starbucks Coffee Downtown", amount: -4.5, accountId: "a1", category: "Food" },
    ];
    const candidate: Transaction = { id: "2", date: "2024-01-15", description: "Starbucks Coffee Uptown", amount: -4.5, accountId: "a1", category: "Food" };
    const matches = detectLikelyDuplicates(existing, candidate);
    expect(matches).toHaveLength(1);
  });

  it("ignores different dates", () => {
    const existing: Transaction[] = [
      { id: "1", date: "2024-01-14", description: "Coffee", amount: -4.5, accountId: "a1", category: "Food" },
    ];
    const candidate: Transaction = { id: "2", date: "2024-01-15", description: "Coffee", amount: -4.5, accountId: "a1", category: "Food" };
    const matches = detectLikelyDuplicates(existing, candidate);
    expect(matches).toHaveLength(0);
  });

  it("considers currency in matching", () => {
    const existing: Transaction[] = [
      { id: "1", date: "2024-01-15", description: "Payment", amount: -100, accountId: "a1", category: "Transfer", originalCurrency: "USD" },
    ];
    const candidate: Transaction = { id: "2", date: "2024-01-15", description: "Payment", amount: -100, accountId: "a1", category: "Transfer", originalCurrency: "EUR" };
    const matches = detectLikelyDuplicates(existing, candidate);
    expect(matches).toHaveLength(0); // Different currencies
  });
});

// ─── Transfer Detection ─────────────────────────────────────────────────────

describe("detectTransfer", () => {
  it("marks matching opposite transactions as transfers", () => {
    const transactions: Transaction[] = [
      { id: "1", date: "2024-01-15", description: "Transfer to Savings", amount: -500, accountId: "chequing", category: "Transfer" },
      { id: "2", date: "2024-01-15", description: "Transfer from Chequing", amount: 500, accountId: "savings", category: "Transfer" },
    ];
    const accounts: Account[] = [
      { id: "chequing", name: "Chequing", kind: "chequing", subtitle: "", balance: 1000, currency: "USDC" },
      { id: "savings", name: "Savings", kind: "savings", subtitle: "", balance: 2000, currency: "USDC" },
    ];
    const result = detectTransfer(transactions, accounts);
    expect(result[0].isTransfer).toBe(true);
    expect(result[0].pairedTransactionId).toBe("2");
    expect(result[1].isTransfer).toBe(true);
    expect(result[1].pairedTransactionId).toBe("1");
  });

  it("does not mark non-matching transactions", () => {
    const transactions: Transaction[] = [
      { id: "1", date: "2024-01-15", description: "Coffee", amount: -4.5, accountId: "chequing", category: "Food" },
      { id: "2", date: "2024-01-15", description: "Salary", amount: 3000, accountId: "chequing", category: "Income" },
    ];
    const accounts: Account[] = [
      { id: "chequing", name: "Chequing", kind: "chequing", subtitle: "", balance: 1000, currency: "USDC" },
    ];
    const result = detectTransfer(transactions, accounts);
    expect(result[0].isTransfer).toBeFalsy();
    expect(result[1].isTransfer).toBeFalsy();
  });

  it("detects transfers even with slight amount differences", () => {
    const transactions: Transaction[] = [
      { id: "1", date: "2024-01-15", description: "Transfer", amount: -500, accountId: "a1", category: "Transfer" },
      { id: "2", date: "2024-01-15", description: "Transfer received", amount: 500.01, accountId: "a2", category: "Transfer" },
    ];
    const accounts: Account[] = [
      { id: "a1", name: "Account 1", kind: "chequing", subtitle: "", balance: 1000, currency: "USDC" },
      { id: "a2", name: "Account 2", kind: "savings", subtitle: "", balance: 2000, currency: "USDC" },
    ];
    const result = detectTransfer(transactions, accounts);
    expect(result[0].isTransfer).toBe(true);
  });
});

// ─── Full Import Preview ────────────────────────────────────────────────────

describe("buildImportPreview", () => {
  const accounts: Account[] = [
    { id: "default", name: "Main Account", kind: "chequing", subtitle: "", balance: 0, currency: "USDC" },
  ];

  it("processes transactions correctly", () => {
    const parsed = {
      headers: ["date", "description", "amount"],
      rows: [{ date: "2024-01-15", description: "Coffee", amount: "-4.50" }],
    };

    const preview = buildImportPreview({
      parsed,
      mapping: { date: "date", description: "description", amount: "amount" },
      accounts,
      existingTransactions: [],
      defaultAccountId: "default",
      importId: "test-1",
    });

    expect(preview).toHaveLength(1);
    expect(preview[0].transaction?.date).toBe("2024-01-15");
    expect(preview[0].transaction?.amount).toBe(-4.5);
  });

  it("detects currency from parsed amount", () => {
    const parsed = {
      headers: ["date", "description", "amount"],
      rows: [{ date: "2024-01-15", description: "Coffee", amount: "€4.50" }],
    };

    const preview = buildImportPreview({
      parsed,
      mapping: { date: "date", description: "description", amount: "amount" },
      accounts,
      existingTransactions: [],
      defaultAccountId: "default",
      importId: "test-2",
    });

    expect(preview[0].detectedCurrency).toBe("EUR");
  });

  it("marks duplicates", () => {
    const existingTx: Transaction = {
      id: "existing-1",
      date: "2024-01-15",
      description: "Coffee",
      amount: -4.5,
      accountId: "default",
      category: "Food",
    };

    const parsed = {
      headers: ["date", "description", "amount"],
      rows: [{ date: "2024-01-15", description: "Coffee", amount: "-4.50" }],
    };

    const preview = buildImportPreview({
      parsed,
      mapping: { date: "date", description: "description", amount: "amount" },
      accounts,
      existingTransactions: [existingTx],
      defaultAccountId: "default",
      importId: "test-3",
    });

    expect(preview[0].duplicate).toBe(true);
  });
});
