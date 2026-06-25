import { autoCategorize } from "./categories";
import type { Account, ImportMetadata, LearnedCategory, Transaction } from "./types";

export type CsvField = "date" | "description" | "merchant" | "amount" | "account" | "category" | "type";
export type CsvMapping = Partial<Record<CsvField, string>>;

export type ParsedCsv = {
  headers: string[];
  rows: Array<Record<string, string>>;
};

export type ImportWarning = {
  level: "warning" | "error";
  message: string;
};

const MAX_CSV_ROWS = 10_000;
const MAX_CSV_CELL_LENGTH = 10_000;
const BOM_REGEX = /^﻿/;

export type ImportPreviewRow = {
  rowNumber: number;
  raw: Record<string, string>;
  transaction: Transaction | null;
  warnings: ImportWarning[];
  duplicate: boolean;
};

const headerAliases: Record<CsvField, string[]> = {
  date: ["date", "posted date", "posting date", "transaction date", "trans date", "effective date"],
  description: ["description", "details", "memo", "transaction", "transaction description", "name", "payee"],
  merchant: ["merchant", "merchant name", "payee", "vendor", "name"],
  amount: ["amount", "transaction amount", "cad", "value"],
  account: ["account", "account name", "account number", "card", "card number"],
  category: ["category", "personal category", "classification"],
  type: ["type", "transaction type", "debit/credit", "debit credit", "dr/cr"],
};

const categoryKeywords: Array<[string, string[]]> = [
  ["Groceries", ["grocery", "supermarket", "market", "loblaws", "sobeys", "metro", "costco"]],
  ["Rent", ["rent", "landlord", "property management"]],
  ["Food delivery", ["uber eats", "doordash", "skip", "delivery", "takeout"]],
  ["Transport", ["transit", "presto", "uber", "lyft", "taxi", "parking", "fuel", "gas"]],
  ["Subscriptions", ["netflix", "spotify", "apple.com/bill", "google", "subscription", "patreon", "adobe"]],
  ["Income", ["salary", "payroll", "deposit", "paycheque", "direct dep", "etransfer received"]],
  ["Debt", ["loan", "student loan", "credit card payment", "minimum payment"]],
  ["Utilities", ["hydro", "internet", "utility", "mobile", "phone", "insurance"]],
  ["Shopping", ["amazon", "walmart", "store", "shop", "ikea"]],
  ["Health", ["pharmacy", "clinic", "doctor", "dental", "drug mart"]],
];

export function parseCsv(text: string): ParsedCsv {
  // Strip BOM character if present
  const clean = text.replace(BOM_REGEX, "");

  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    const next = clean[index + 1];

    // Enforce max cell length to prevent DoS
    if (cell.length > MAX_CSV_CELL_LENGTH) {
      cell = cell.slice(0, MAX_CSV_CELL_LENGTH);
    }

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) {
        rows.push(row);
        if (rows.length > MAX_CSV_ROWS) break;
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  // Handle trailing cell — only if quotes were closed
  if (!quoted) {
    row.push(cell.trim());
    if (row.some(Boolean) && rows.length <= MAX_CSV_ROWS) rows.push(row);
  }

  const headers = dedupeHeaders(rows[0] ?? []);
  return {
    headers,
    rows: rows.slice(1, MAX_CSV_ROWS + 1).map((values) =>
      headers.reduce<Record<string, string>>((record, header, index) => {
        record[header] = values[index] ?? "";
        return record;
      }, {}),
    ),
  };
}

export function guessMapping(headers: string[]): CsvMapping {
  return (Object.keys(headerAliases) as CsvField[]).reduce<CsvMapping>((mapping, field) => {
    const match = headers.find((header) => headerAliases[field].includes(normalizeHeader(header)));
    if (match) mapping[field] = match;
    return mapping;
  }, {});
}

export function buildImportPreview({
  parsed,
  mapping,
  accounts,
  existingTransactions,
  defaultAccountId,
  importId,
  learnings,
}: {
  parsed: ParsedCsv;
  mapping: CsvMapping;
  accounts: Account[];
  existingTransactions: Transaction[];
  defaultAccountId: string;
  importId: string;
  learnings?: LearnedCategory[];
}): ImportPreviewRow[] {
  const seen = new Set<string>();

  return parsed.rows.map((raw, index) => {
    const warnings: ImportWarning[] = [];
    const rowNumber = index + 2;
    const parsedDate = parseDate(read(raw, mapping.date));
    const amount = parseAmount(read(raw, mapping.amount), read(raw, mapping.type));
    const description = read(raw, mapping.description) || read(raw, mapping.merchant);
    const merchant = read(raw, mapping.merchant);
    const accountId = resolveAccountId(read(raw, mapping.account), accounts, defaultAccountId);
    const category = read(raw, mapping.category) || inferCategory(`${merchant} ${description}`, amount);

    // Auto-categorize from learned patterns if still uncategorized
    let finalCategory = category;
    let finalSubcategory: string | undefined;
    if (category === "Misc") {
      const result = autoCategorize(`${merchant || ""} ${description || ""}`, learnings ?? []);
      if (result) {
        finalCategory = result.parent;
        finalSubcategory = result.child;
      }
    }

    if (!parsedDate) warnings.push({ level: "error", message: "Invalid or missing date" });
    if (amount === null) warnings.push({ level: "error", message: "Missing amount" });
    if (!description) warnings.push({ level: "warning", message: "Missing description" });

    const transaction =
      parsedDate && amount !== null
        ? {
            id: `csv-${importId}-${index}`,
            date: parsedDate,
            description: description || merchant || "Imported transaction",
            merchant: merchant || undefined,
            category: finalCategory,
            subcategory: finalSubcategory,
            accountId,
            amount,
            source: "csv" as const,
            importId,
          }
        : null;

    const key = transaction ? duplicateKey(transaction) : `invalid-${rowNumber}`;
    const duplicate = transaction
      ? existingTransactions.some((existing) => duplicateKey(existing) === key) || seen.has(key)
      : false;

    if (duplicate) warnings.push({ level: "warning", message: "Possible duplicate" });
    seen.add(key);

    return { rowNumber, raw, transaction, warnings, duplicate };
  });
}

export function summarizeImport(fileName: string, importId: string, rows: ImportPreviewRow[]): ImportMetadata {
  return {
    id: importId,
    fileName,
    importedAt: new Date().toISOString(),
    rowCount: rows.length,
    acceptedCount: rows.filter((row) => row.transaction && !hasError(row)).length,
    duplicateCount: rows.filter((row) => row.duplicate).length,
    warningCount: rows.reduce((total, row) => total + row.warnings.length, 0),
  };
}

export function hasError(row: ImportPreviewRow) {
  return row.warnings.some((warning) => warning.level === "error");
}

function dedupeHeaders(headers: string[]) {
  const counts = new Map<string, number>();

  return headers.map((header, index) => {
    const base = header || `Column ${index + 1}`;
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    return count === 0 ? base : `${base} ${count + 1}`;
  });
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function read(row: Record<string, string>, header?: string) {
  return header ? row[header]?.trim() ?? "" : "";
}

function parseDate(value: string) {
  if (!value) return null;
  const normalized = value.trim();
  const isoMatch = normalized.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  const slashMatch = normalized.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);

  if (isoMatch) return formatIsoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));

  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = normalizeYear(Number(slashMatch[3]));
    const month = first > 12 ? second : first;
    const day = first > 12 ? first : second;
    return formatIsoDate(year, month, day);
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function parseAmount(value: string, typeValue: string) {
  if (!value) return null;
  const parentheses = value.includes("(") && value.includes(")");
  const cleaned = value.replace(/[,$"()\s]/g, "");
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric)) return null;

  const type = typeValue.toLowerCase();
  const abs = Math.abs(numeric);
  if (parentheses || type.includes("debit") || type === "dr" || type.includes("withdrawal")) return -abs;
  if (type.includes("credit") || type === "cr" || type.includes("deposit")) return abs;
  return numeric;
}

function normalizeYear(year: number) {
  return year < 100 ? 2000 + year : year;
}

function formatIsoDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function resolveAccountId(value: string, accounts: Account[], defaultAccountId: string) {
  const normalized = value.toLowerCase();
  return accounts.find((account) => normalized && normalized.includes(account.name.toLowerCase()))?.id ?? defaultAccountId;
}

function inferCategory(text: string, amount: number | null) {
  const normalized = text.toLowerCase();
  const match = categoryKeywords.find(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)));
  if (match) return match[0];
  if ((amount ?? 0) > 0) return "Income";
  return "Misc";
}

function duplicateKey(transaction: Transaction) {
  return [
    transaction.date,
    transaction.accountId,
    transaction.amount.toFixed(2),
    transaction.description.trim().toLowerCase(),
    transaction.merchant?.trim().toLowerCase() ?? "",
  ].join("|");
}
