import { autoCategorize } from "./categories";
import { detectBankFormat, detectCurrencyFromHeaders, type BankFormat } from "./bank-formats";
import type {
  Account,
  ImportMetadata,
  ImportPreviewRow,
  ImportSession,
  ImportWarning,
  LearnedCategory,
  Transaction,
} from "./types";

// ─── Types ─────────────────────────────────────────────────────────────────

export type CsvField =
  | "date"
  | "description"
  | "merchant"
  | "amount"
  | "debit"
  | "credit"
  | "balance"
  | "currency"
  | "account"
  | "category"
  | "type"
  | "reference"
  | "memo"
  | "fees"
  | "tax";

export type CsvMapping = Partial<Record<CsvField, string>>;

export type ParsedCsv = {
  headers: string[];
  rows: Array<Record<string, string>>;
  detectedFormat?: BankFormat;
  detectedCurrency?: string;
};

const MAX_CSV_ROWS = 10_000;
const MAX_CSV_CELL_LENGTH = 10_000;
const BOM_REGEX = /^﻿/;

// ─── Enhanced CSV Parser ────────────────────────────────────────────────────

export function parseCsv(text: string): ParsedCsv {
  const clean = text.replace(BOM_REGEX, "");

  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    const next = clean[index + 1];

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

  if (!quoted) {
    row.push(cell.trim());
    if (row.some(Boolean) && rows.length <= MAX_CSV_ROWS) rows.push(row);
  }

  const headers = dedupeHeaders(rows[0] ?? []);

  // Detect format from headers
  const detectedFormat = detectBankFormat(headers);

  // Detect currency from headers
  const detectedCurrency = detectCurrencyFromHeaders(headers);

  return {
    headers,
    detectedFormat,
    detectedCurrency: detectedCurrency ?? undefined,
    rows: rows.slice(1, MAX_CSV_ROWS + 1).map((values) =>
      headers.reduce<Record<string, string>>((record, header, index) => {
        record[header] = values[index] ?? "";
        return record;
      }, {}),
    ),
  };
}

// ─── Enhanced Mapping Detection ─────────────────────────────────────────────

/**
 * Guess CSV column mapping using the bank format registry and generic aliases.
 * Merges format-specific aliases with generic fallback aliases.
 */
export function guessMapping(headers: string[], format?: BankFormat): CsvMapping {
  const normalizedHeaders = headers.map((h) => normalizeHeader(h));
  const mapping: CsvMapping = {};

  // Collect all aliases from the detected format AND generic fallback
  const allFieldAliases = getMergedAliases(format);

  for (const [field, aliases] of Object.entries(allFieldAliases)) {
    const match = headers.find((header) =>
      aliases.includes(normalizeHeader(header)),
    );
    if (match) {
      mapping[field as CsvField] = match;
    }
  }

  return mapping;
}

function getMergedAliases(format?: BankFormat): Record<CsvField, string[]> {
  // Generic fallback aliases (same as before but enhanced)
  const generic: Record<CsvField, string[]> = {
    date: ["date", "posted date", "posting date", "transaction date", "trans date", "effective date", "trade date"],
    description: ["description", "details", "memo", "transaction", "transaction description", "name", "payee", "narrative"],
    merchant: ["merchant", "merchant name", "vendor", "name"],
    amount: ["amount", "transaction amount", "cad", "usd", "value", "sum", "total"],
    debit: ["debit", "debit amount", "withdrawal", "withdrawals", "dr"],
    credit: ["credit", "credit amount", "deposit", "deposits", "cr"],
    balance: ["balance", "running balance", "available balance", "ledger balance"],
    currency: ["currency", "ccy", "cur"],
    account: ["account", "account name", "account number", "card", "card number"],
    category: ["category", "personal category", "classification"],
    type: ["type", "transaction type", "txn type", "debit/credit", "dr/cr"],
    reference: ["reference", "ref", "check number", "cheque number", "chq/ref no", "ref number"],
    memo: ["memo", "memo/description", "notes"],
    fees: ["fees", "charges", "commission"],
    tax: ["tax", "gst", "hst", "vat", "iva"],
  };

  if (!format) return generic;

  // Merge format-specific aliases over generic
  const merged: Record<CsvField, string[]> = { ...generic };
  for (const [field, formatAliases] of Object.entries(format.aliases)) {
    if (field in merged) {
      // Format aliases take priority (first), then generic
      merged[field as CsvField] = [
        ...formatAliases,
        ...merged[field as CsvField],
      ];
    }
  }

  return merged;
}

// ─── Enhanced Amount Parsing ────────────────────────────────────────────────

export type AmountParseResult = {
  value: number | null;
  currency?: string;
};

/**
 * Parse an amount value with international format support.
 * Handles:
 * - 1,234.56 (period decimal)
 * - 1.234,56 (comma decimal)
 * - 1234,56 (comma decimal, no thousands)
 * - (100.00) parentheses = negative
 * - EUR 100 or $100 or 100€ currency prefixes/suffixes
 */
export function parseAmount(
  value: string,
  typeValue?: string,
  decimalSeparator?: string,
  thousandsSeparator?: string,
): AmountParseResult {
  if (!value) return { value: null };

  const trimmed = value.trim();

  // Detect and strip currency symbols/prefixes
  const currencySymbols = [
    { sym: "$", code: "USD" },
    { sym: "€", code: "EUR" },
    { sym: "£", code: "GBP" },
    { sym: "¥", code: "JPY" },
    { sym: "₹", code: "INR" },
    { sym: "₩", code: "KRW" },
    { sym: "₽", code: "RUB" },
    { sym: "₺", code: "TRY" },
    { sym: "₱", code: "PHP" },
    { sym: "₦", code: "NGN" },
    { sym: "₪", code: "ILS" },
    { sym: "R$", code: "BRL" },
    { sym: "R", code: "ZAR" },
    { sym: "zł", code: "PLN" },
    { sym: "₫", code: "VND" },
    { sym: "₴", code: "UAH" },
    { sym: "₸", code: "KZT" },
    { sym: "₼", code: "AZN" },
    { sym: "₾", code: "GEL" },
    { sym: "₿", code: "BTC" },
    { sym: "Ξ", code: "ETH" },
    { sym: "₮", code: "MNT" },
    { sym: "₲", code: "PYG" },
  ];

  let detectedCurrency: string | undefined;
  let amountStr = trimmed;

  // Check for currency codes like "EUR 100" or "100 EUR"
  const currencyCodeMatch = amountStr.match(/^(?:\s*([A-Za-z]{3})\s*)?([\d,.()\-\s]+)\s*([A-Za-z]{3})?$/);
  if (currencyCodeMatch) {
    if (currencyCodeMatch[1]) detectedCurrency = currencyCodeMatch[1].toUpperCase();
    if (currencyCodeMatch[3]) detectedCurrency = currencyCodeMatch[3].toUpperCase();
    amountStr = currencyCodeMatch[2].trim();
  }

  // Check for currency symbols
  for (const { sym, code } of currencySymbols) {
    if (amountStr.includes(sym)) {
      detectedCurrency = code;
      amountStr = amountStr.replace(sym, "").trim();
      break;
    }
  }

  // Handle parentheses for negative amounts: (100.00) → -100.00
  const parentheses = amountStr.includes("(") && amountStr.includes(")");
  if (parentheses) {
    amountStr = amountStr.replace(/[()]/g, "");
  }

  // Determine decimal and thousands separators
  let decimalSep = decimalSeparator || ".";
  let thousandsSep = thousandsSeparator || ",";

  // Auto-detect if not specified
  if (!decimalSeparator && !thousandsSeparator) {
    const dots = (amountStr.match(/\./g) || []).length;
    const commas = (amountStr.match(/,/g) || []).length;

    if (dots === 1 && commas === 0) {
      // 1234.56 — period is decimal
      decimalSep = ".";
      thousandsSep = "";
    } else if (dots === 0 && commas === 1) {
      // 1234,56 — comma is decimal
      decimalSep = ",";
      thousandsSep = "";
    } else if (dots >= 2 && commas >= 1) {
      // 1,234.56 — period is decimal, comma is thousands
      decimalSep = ".";
      thousandsSep = ",";
    } else if (dots === 1 && commas === 1) {
      // Ambiguous: 1.234,56 or 1,234.56
      // Check which comes last — the last separator is usually the decimal
      const lastDot = amountStr.lastIndexOf(".");
      const lastComma = amountStr.lastIndexOf(",");
      if (lastComma > lastDot) {
        // 1.234,56 — comma is decimal
        decimalSep = ",";
        thousandsSep = ".";
      } else {
        // 1,234.56 — period is decimal
        decimalSep = ".";
        thousandsSep = ",";
      }
    } else if (dots === 1 && commas >= 2) {
      // One dot, multiple commas: "1,234,567.89" — dot is decimal (US style)
      // Or "1.234.567,89" is handled below (European style)
      // Check which appears last — the last separator position determines decimal
      const lastDot = amountStr.lastIndexOf(".");
      const lastComma = amountStr.lastIndexOf(",");
      if (lastDot > lastComma) {
        // Last separator is a dot: 1,234,567.89 — dot is decimal
        decimalSep = ".";
        thousandsSep = ",";
      } else {
        // Last separator is a comma: 1.234.567,89 — comma is decimal
        decimalSep = ",";
        thousandsSep = ".";
      }
    } else if (dots >= 2 && commas === 1) {
      // Multiple dots, one comma: "1.234.567,89" — comma is decimal
      decimalSep = ",";
      thousandsSep = ".";
    } else if (dots >= 2 && commas === 0) {
      // 1.234 — could be thousands, but treat as decimal
      // Example: 1.234.56 → likely thousands separator is period
      // Actually with dots=2 and commas=0, this is ambiguous.
      // If every dot is followed by exactly 3 digits, it's thousands.
      // Otherwise it's likely a decimal with no thousands.
      const r = amountStr.match(/\d{1,3}(\.\d{3})+(\.\d+)?/);
      if (r && r[0] === amountStr.replace(/,/g, "")) {
        thousandsSep = ".";
        decimalSep = "";
      } else {
        // Check if last segment has > 2 digits
        const segments = amountStr.split(".");
        const lastLen = segments[segments.length - 1].length;
        decimalSep = lastLen > 2 ? "" : ".";
        thousandsSep = lastLen > 2 ? "." : "";
      }
    } else if (dots === 0 && commas >= 2) {
      // 1,234,567 — commas are thousands, no decimal
      thousandsSep = ",";
      decimalSep = "";
    }
  }

  // Remove thousands separators
  if (thousandsSep) {
    amountStr = amountStr.split(thousandsSep).join("");
  }

  // Replace decimal comma with period if needed
  if (decimalSep === ",") {
    amountStr = amountStr.replace(",", ".");
  } else if (decimalSep && decimalSep !== ".") {
    amountStr = amountStr.replace(decimalSep, ".");
  }

  // Strip any remaining non-numeric characters (except . and -)
  amountStr = amountStr.replace(/[^\d.\-]/g, "");

  const numeric = Number(amountStr);
  if (!Number.isFinite(numeric)) return { value: null };

  // Apply direction based on type column
  let finalValue: number;
  if (typeValue) {
    const type = typeValue.toLowerCase().trim();
    const abs = Math.abs(numeric);
    if (
      type.includes("debit") ||
      type === "dr" ||
      type.includes("withdrawal") ||
      type.includes("outflow") ||
      type.includes("send")
    ) {
      finalValue = -abs;
    } else if (
      type.includes("credit") ||
      type === "cr" ||
      type.includes("deposit") ||
      type.includes("inflow") ||
      type.includes("receive")
    ) {
      finalValue = abs;
    } else {
      finalValue = parentheses ? -abs : numeric;
    }
  } else {
    finalValue = parentheses ? -Math.abs(numeric) : numeric;
  }

  return { value: finalValue, currency: detectedCurrency };
}

/**
 * Parse debit/credit columns (e.g. "100.00" in debit column = -100.00)
 */
export function parseDebitCredit(
  debitValue: string | undefined,
  creditValue: string | undefined,
  decimalSeparator?: string,
  thousandsSeparator?: string,
): number | null {
  if (debitValue) {
    const parsed = parseAmount(debitValue, undefined, decimalSeparator, thousandsSeparator);
    if (parsed.value !== null) {
      return -Math.abs(parsed.value);
    }
  }

  if (creditValue) {
    const parsed = parseAmount(creditValue, undefined, decimalSeparator, thousandsSeparator);
    if (parsed.value !== null) {
      return Math.abs(parsed.value);
    }
  }

  return null;
}

// ─── Enhanced Date Parsing ──────────────────────────────────────────────────

const MONTH_NAMES_SHORT = {
  en: ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"],
  fr: ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"],
  de: ["jan", "feb", "mär", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "dez"],
  es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
  it: ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"],
  pt: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
  nl: ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"],
  sv: ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"],
  nb: ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"],
  da: ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"],
  fi: ["tammi", "helmi", "maalis", "huhti", "touko", "kesä", "heinä", "elo", "syys", "loka", "marras", "joulu"],
};

function getMonthNumber(text: string): number | null {
  const lower = text.toLowerCase().trim();
  for (const [, months] of Object.entries(MONTH_NAMES_SHORT)) {
    const idx = months.findIndex(
      (m) => m === lower || lower.startsWith(m) || m.startsWith(lower),
    );
    if (idx >= 0) return idx + 1;
  }
  return null;
}

export function parseDate(
  value: string,
  preferredFormats?: string[],
): string | null {
  if (!value) return null;

  const normalized = value.trim();

  // Try preferred formats first
  const formatsToTry = preferredFormats ?? [
    "YYYY-MM-DD",
    "DD/MM/YYYY",
    "MM/DD/YYYY",
    "DD-MM-YYYY",
    "DD.MM.YYYY",
    "YYYY/MM/DD",
    "YYYYMMDD",
    "DD Month YYYY",
    "Month DD, YYYY",
  ];

  for (const fmt of formatsToTry) {
    const result = tryParseFormat(normalized, fmt);
    if (result) return result;
  }

  // Last resort: try native Date parsing
  const date = new Date(normalized);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }

  return null;
}

function tryParseFormat(value: string, format: string): string | null {
  switch (format) {
    case "YYYY-MM-DD": {
      const m = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
      if (m) return formatIsoDate(Number(m[1]), Number(m[2]), Number(m[3]));
      break;
    }

    case "YYYY/MM/DD": {
      const m = value.match(/^(\d{4})[/](\d{1,2})[/](\d{1,2})$/);
      if (m) return formatIsoDate(Number(m[1]), Number(m[2]), Number(m[3]));
      break;
    }

    case "YYYYMMDD": {
      const m = value.match(/^(\d{4})(\d{2})(\d{2})$/);
      if (m) return formatIsoDate(Number(m[1]), Number(m[2]), Number(m[3]));
      break;
    }

    case "DD/MM/YYYY": {
      const m = value.match(/^(\d{1,2})[/](\d{1,2})[/](\d{4})$/);
      if (m) {
        const day = Number(m[1]);
        const month = Number(m[2]);
        const year = Number(m[3]);
        if (day <= 31 && month <= 12) return formatIsoDate(year, month, day);
      }
      break;
    }

    case "MM/DD/YYYY": {
      const m = value.match(/^(\d{1,2})[/](\d{1,2})[/](\d{4})$/);
      if (m) {
        const month = Number(m[1]);
        const day = Number(m[2]);
        const year = Number(m[3]);
        if (month <= 12 && day <= 31) return formatIsoDate(year, month, day);
      }
      break;
    }

    case "DD-MM-YYYY": {
      const m = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
      if (m) {
        const day = Number(m[1]);
        const month = Number(m[2]);
        const year = Number(m[3]);
        if (day <= 31 && month <= 12) return formatIsoDate(year, month, day);
      }
      break;
    }

    case "DD.MM.YYYY": {
      const m = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (m) {
        const day = Number(m[1]);
        const month = Number(m[2]);
        const year = Number(m[3]);
        if (day <= 31 && month <= 12) return formatIsoDate(year, month, day);
      }
      break;
    }

    case "DD Month YYYY": {
      const m = value.match(/^(\d{1,2})\s+([\p{L}]+)\s+(\d{4})$/u);
      if (m) {
        const day = Number(m[1]);
        const month = getMonthNumber(m[2]);
        const year = Number(m[3]);
        if (month && day <= 31) return formatIsoDate(year, month, day);
      }
      break;
    }

    case "Month DD, YYYY": {
      const m = value.match(/^([\p{L}]+)\s+(\d{1,2}),?\s*(\d{4})$/u);
      if (m) {
        const month = getMonthNumber(m[1]);
        const day = Number(m[2]);
        const year = Number(m[3]);
        if (month && day <= 31) return formatIsoDate(year, month, day);
      }
      break;
    }
  }

  return null;
}

function normalizeYear(year: number): number {
  return year < 100 ? 2000 + year : year;
}

function formatIsoDate(year: number, month: number, day: number): string | null {
  const normalizedYear = normalizeYear(year);
  const date = new Date(Date.UTC(normalizedYear, month - 1, day));
  if (
    date.getUTCFullYear() !== normalizedYear ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return `${normalizedYear.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

// ─── Enhanced Import Preview ────────────────────────────────────────────────

export function buildImportPreview({
  parsed,
  mapping,
  accounts,
  existingTransactions,
  defaultAccountId,
  importId,
  learnings,
  baseCurrency = "USDC",
}: {
  parsed: ParsedCsv;
  mapping: CsvMapping;
  accounts: Account[];
  existingTransactions: Transaction[];
  defaultAccountId: string;
  importId: string;
  learnings?: LearnedCategory[];
  baseCurrency?: string;
}): ImportPreviewRow[] {
  const format = parsed.detectedFormat;
  const decimalSep = format?.decimalSeparator;
  const thousandsSep = format?.thousandsSeparator;
  const dateFormats = format?.datePriority;
  const seen = new Set<string>();

  return parsed.rows.map((raw, index) => {
    const warnings: ImportWarning[] = [];
    const rowNumber = index + 2;

    // Parse date with format-aware detection
    const parsedDate = parseDate(read(raw, mapping.date), dateFormats);

    // Parse amount with international format support
    const typeRaw = read(raw, mapping.type);

    // Try debit/credit split columns first
    let amount: number | null = null;
    let detectedCurrency: string | undefined;

    if (mapping.debit || mapping.credit) {
      const dcAmount = parseDebitCredit(
        mapping.debit ? read(raw, mapping.debit) : undefined,
        mapping.credit ? read(raw, mapping.credit) : undefined,
        decimalSep,
        thousandsSep,
      );
      amount = dcAmount;
      warnings.push({ level: "warning", message: "Amount from debit/credit split columns" });
    } else if (mapping.amount) {
      const parsed = parseAmount(
        read(raw, mapping.amount),
        typeRaw,
        decimalSep,
        thousandsSep,
      );
      amount = parsed.value;
      detectedCurrency = parsed.currency;
    }

    // Detect currency from column if present
    let rowCurrency: string | undefined;
    if (mapping.currency) {
      const rawCurrency = read(raw, mapping.currency);
      if (rawCurrency) {
        const upper = rawCurrency.toUpperCase().trim();
        // Check if it's a known currency
        if (/^[A-Z]{3,5}$/.test(upper)) {
          rowCurrency = upper;
        } else {
          // Try to match currency names
          const currencyNames: Record<string, string> = {
            "us dollars": "USD",
            "us dollar": "USD",
            "euros": "EUR",
            "euro": "EUR",
            "british pounds": "GBP",
            "pounds": "GBP",
            "pound sterling": "GBP",
            "canadian dollars": "CAD",
            "japanese yen": "JPY",
            "yen": "JPY",
            "indian rupees": "INR",
            "rupees": "INR",
          };
          rowCurrency = currencyNames[upper] ?? upper;
        }
      }
    }

    // Fall back to detected currency from CSV header or parsed amount
    const finalCurrency = rowCurrency || detectedCurrency || parsed.detectedCurrency;

    const description = read(raw, mapping.description) || read(raw, mapping.merchant) || read(raw, mapping.memo);
    const merchant = read(raw, mapping.merchant) || read(raw, mapping.memo);
    const accountId = resolveAccountId(read(raw, mapping.account), accounts, defaultAccountId);
    const category = read(raw, mapping.category) || inferCategory(`${merchant} ${description}`, amount);

    // Auto-categorize from learned patterns
    let finalCategory = category;
    let finalSubcategory: string | undefined;
    if (finalCategory === "Misc" && learnings && learnings.length > 0) {
      const result = autoCategorize(`${merchant || ""} ${description || ""}`, learnings);
      if (result) {
        finalCategory = result.parent;
        finalSubcategory = result.child;
      }
    }

    // Parse balance
    const balance = mapping.balance ? parseAmount(read(raw, mapping.balance), undefined, decimalSep, thousandsSep) : undefined;

    if (!parsedDate) warnings.push({ level: "error", message: "Invalid or missing date" });
    if (amount === null) warnings.push({ level: "error", message: "Missing amount" });
    if (!description) warnings.push({ level: "warning", message: "Missing description" });

    const transaction: Transaction | null =
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
            originalAmount: amount,
            originalCurrency: finalCurrency,
            source: "csv" as const,
            importId,
          }
        : null;

    const key = transaction ? duplicateKey(transaction) : `invalid-${rowNumber}`;
    const isDuplicate = transaction
      ? existingTransactions.some((existing) => duplicateKey(existing) === key) || seen.has(key)
      : false;

    if (isDuplicate) warnings.push({ level: "warning", message: "Possible duplicate" });
    seen.add(key);

    return {
      rowNumber,
      raw,
      transaction,
      warnings,
      duplicate: isDuplicate,
      detectedCurrency: finalCurrency,
      originalAmount: amount ?? undefined,
    };
  });
}

// ─── Duplicate Detection ────────────────────────────────────────────────────

/**
 * Enhanced duplicate key that includes currency and merchant
 */
export function duplicateKey(transaction: Transaction): string {
  return [
    transaction.date,
    transaction.accountId,
    (transaction.originalAmount ?? transaction.amount).toFixed(2),
    transaction.originalCurrency ?? "",
    transaction.description.trim().toLowerCase(),
    transaction.merchant?.trim().toLowerCase() ?? "",
  ].join("|");
}

/**
 * Detect likely duplicates with fuzzy matching
 */
export function detectLikelyDuplicates(
  existing: Transaction[],
  candidate: Transaction,
): Transaction[] {
  const candAmount = Math.abs(candidate.originalAmount ?? candidate.amount);
  const candDate = candidate.date;
  const candDesc = candidate.description.toLowerCase().trim();
  const candCurrency = candidate.originalCurrency ?? "";

  return existing.filter((t) => {
    // Same date
    if (t.date !== candDate) return false;

    // Same or similar amount (within 0.5%)
    const tAmount = Math.abs(t.originalAmount ?? t.amount);
    const diff = Math.abs(tAmount - candAmount);
    if (diff > 0.01 && diff / Math.max(tAmount, candAmount) > 0.005)
      return false;

    // Same currency if both have it
    if (candCurrency && t.originalCurrency && t.originalCurrency !== candCurrency)
      return false;

    // Similar description (word overlap)
    const tDesc = t.description.toLowerCase().trim();
    const words = candDesc.split(/\s+/).filter((w) => w.length > 3);
    const matchCount = words.filter((w) => tDesc.includes(w)).length;
    return matchCount >= Math.max(1, Math.floor(words.length * 0.5));
  });
}

/**
 * Detect transfers between accounts
 */
export function detectTransfer(
  transactions: Transaction[],
  accounts: Account[],
): Transaction[] {
  const updated: Transaction[] = [];

  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    if (t.isTransfer || t.pairedTransactionId) {
      updated.push(t);
      continue;
    }

    const tAbs = Math.abs(t.amount);

    // Look for matching opposite transaction in another account
    const match = transactions.find((other) => {
      if (other.id === t.id) return false;
      if (other.accountId === t.accountId) return false;
      if (other.isTransfer || other.pairedTransactionId) return false;
      if (other.date !== t.date) return false;

      const otherAbs = Math.abs(other.amount);
      const diff = Math.abs(tAbs - otherAbs);
      if (diff > 0.01 && diff / Math.max(tAbs, otherAbs) > 0.01) return false;

      // Check currency match
      const tCurr = t.originalCurrency || "";
      const oCurr = other.originalCurrency || "";
      if (tCurr && oCurr && tCurr !== oCurr) return false;

      return true;
    });

    if (match) {
      updated.push({
        ...t,
        isTransfer: true,
        pairedTransactionId: match.id,
      });
    } else {
      updated.push(t);
    }
  }

  return updated;
}

// ─── Import Summary ─────────────────────────────────────────────────────────

export function summarizeImport(
  fileName: string,
  importId: string,
  rows: ImportPreviewRow[],
): ImportMetadata {
  const accepted = rows.filter((r) => r.transaction && !hasError(r));
  return {
    id: importId,
    fileName,
    importedAt: new Date().toISOString(),
    rowCount: rows.length,
    acceptedCount: accepted.length,
    duplicateCount: rows.filter((r) => r.duplicate).length,
    warningCount: rows.reduce((total, r) => total + r.warnings.length, 0),
  };
}

export function buildImportSession(
  fileName: string,
  accountId: string,
  currency: string,
  importId: string,
  rows: ImportPreviewRow[],
  mapping: CsvMapping,
): ImportSession {
  return {
    id: importId,
    fileName,
    accountId,
    currency,
    importedAt: new Date().toISOString(),
    transactionIds: rows
      .filter((r) => r.transaction && !hasError(r))
      .map((r) => r.transaction!.id),
    rowCount: rows.length,
    acceptedCount: rows.filter((r) => r.transaction && !hasError(r)).length,
    duplicateCount: rows.filter((r) => r.duplicate).length,
    warningCount: rows.reduce((total, r) => total + r.warnings.length, 0),
    mappingUsed: mapping,
  };
}

export function hasError(row: ImportPreviewRow): boolean {
  return row.warnings.some((w) => w.level === "error");
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

function dedupeHeaders(headers: string[]) {
  const counts = new Map<string, number>();
  return headers.map((header, index) => {
    const base = header || `Column ${index + 1}`;
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    return count === 0 ? base : `${base} ${count + 1}`;
  });
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function read(row: Record<string, string>, header?: string): string {
  return header ? row[header]?.trim() ?? "" : "";
}

function resolveAccountId(
  value: string,
  accounts: Account[],
  defaultAccountId: string,
): string {
  const normalized = value.toLowerCase();
  return (
    accounts.find(
      (account) =>
        normalized && normalized.includes(account.name.toLowerCase()),
    )?.id ?? defaultAccountId
  );
}

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

function inferCategory(text: string, amount: number | null): string {
  const normalized = text.toLowerCase();
  const match = categoryKeywords.find(([, keywords]) =>
    keywords.some((keyword) => normalized.includes(keyword)),
  );
  if (match) return match[0];
  if ((amount ?? 0) > 0) return "Income";
  return "Misc";
}
