import { ledgerData } from "./seed";
import type {
  CurrencySettings,
  ImportSession,
  LearnedCategory,
  PersistedLedgerState,
} from "./types";

import { DEFAULT_BASE_CURRENCY } from "@/lib/finance/currency";

export const LEDGER_STORAGE_KEY = "openledger.localLedger.v2";
export const LEDGER_SCHEMA_VERSION = 2;

export const CURRENCY_SETTINGS_KEY = "openledger.currencySettings";
export const IMPORT_SESSIONS_KEY = "openledger.importSessions";

export type LoadLedgerResult =
  | { ok: true; state: PersistedLedgerState; source: "saved" | "demo"; warning?: string }
  | { ok: false; state: PersistedLedgerState; source: "demo"; warning: string };

// ─── Demo State ────────────────────────────────────────────────────────────

export function createDemoLedgerState(): PersistedLedgerState {
  return {
    schemaVersion: LEDGER_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    accounts: ledgerData.accounts,
    transactions: ledgerData.transactions,
    monthlySnapshots: ledgerData.monthlySnapshots,
    memories: ledgerData.memories,
    forecastItems: ledgerData.forecastItems,
    importMetadata: ledgerData.importMetadata ?? [],
    importSessions: [],
    budgets: ledgerData.budgets ?? [],
    goals: ledgerData.goals ?? [],
    recurringEntries: ledgerData.recurringEntries ?? [],
  };
}

// ─── Load / Save ───────────────────────────────────────────────────────────

export function loadLedgerState(storage: Storage): LoadLedgerResult {
  // Try v2 key first
  const raw = storage.getItem(LEDGER_STORAGE_KEY);
  if (raw) {
    try {
      return normalizeLedgerBackup(JSON.parse(raw), "saved");
    } catch {
      return {
        ok: false,
        state: createDemoLedgerState(),
        source: "demo",
        warning: "Saved local ledger could not be read. Demo data was loaded instead.",
      };
    }
  }

  // Try v1 migration
  const v1Raw = storage.getItem("openledger.localLedger.v1");
  if (v1Raw) {
    try {
      const v1Parsed = JSON.parse(v1Raw);
      const migrated = migrateV1ToV2(v1Parsed);
      // Save migrated state under v2 key
      storage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(migrated));
      // Optionally remove old key
      storage.removeItem("openledger.localLedger.v1");
      return { ok: true, state: migrated, source: "saved", warning: "Upgraded to v2 schema with multi-currency support." };
    } catch {
      // Migration failed — start fresh
    }
  }

  return { ok: true, state: createDemoLedgerState(), source: "demo" };
}

export function saveLedgerState(storage: Storage, state: Omit<PersistedLedgerState, "schemaVersion" | "savedAt">) {
  const nextState: PersistedLedgerState = {
    schemaVersion: LEDGER_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    ...state,
    accounts: state.accounts,
    transactions: state.transactions,
    monthlySnapshots: state.monthlySnapshots,
    memories: state.memories,
    forecastItems: state.forecastItems,
    importMetadata: state.importMetadata ?? [],
    importSessions: state.importSessions ?? [],
    budgets: state.budgets ?? [],
    goals: state.goals ?? [],
    recurringEntries: state.recurringEntries ?? [],
  };
  storage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(nextState));
  return nextState;
}

export function clearLedgerState(storage: Storage) {
  storage.removeItem(LEDGER_STORAGE_KEY);
  storage.removeItem("openledger.localLedger.v1");
  storage.removeItem(CURRENCY_SETTINGS_KEY);
  storage.removeItem(IMPORT_SESSIONS_KEY);
}

// ─── v1 → v2 Migration ─────────────────────────────────────────────────────

function migrateV1ToV2(v1: Record<string, unknown>): PersistedLedgerState {
  const demo = createDemoLedgerState();

  // Migrate accounts: add currency field if missing
  const rawAccounts = (Array.isArray(v1.accounts) ? v1.accounts : demo.accounts) as Record<string, unknown>[];
  const accounts = rawAccounts
    .filter((a) => typeof a.id === "string" && typeof a.name === "string" && typeof a.balance === "number")
    .map((a) => ({
      ...a,
      currency: typeof a.currency === "string" ? a.currency : DEFAULT_BASE_CURRENCY,
    })) as PersistedLedgerState["accounts"];

  // Migrate transactions: add currency fields if missing (currency from account, or USDC)
  const rawTxns = (Array.isArray(v1.transactions) ? v1.transactions : demo.transactions) as Record<string, unknown>[];
  const transactions = rawTxns
    .filter(
      (t) =>
        typeof t.id === "string" &&
        typeof t.date === "string" &&
        typeof t.description === "string" &&
        typeof t.amount === "number" &&
        typeof t.accountId === "string",
    )
    .map((t) => ({
      ...t,
      originalAmount: typeof t.originalAmount === "number" ? t.originalAmount : undefined,
      originalCurrency: typeof t.originalCurrency === "string" ? t.originalCurrency : undefined,
      convertedAmount: typeof t.convertedAmount === "number" ? t.convertedAmount : undefined,
      exchangeRate: typeof t.exchangeRate === "number" ? t.exchangeRate : undefined,
      exchangeRateDate: typeof t.exchangeRateDate === "string" ? t.exchangeRateDate : undefined,
      isTransfer: typeof t.isTransfer === "boolean" ? t.isTransfer : undefined,
      pairedTransactionId: typeof t.pairedTransactionId === "string" ? t.pairedTransactionId : undefined,
    })) as PersistedLedgerState["transactions"];

  return {
    schemaVersion: LEDGER_SCHEMA_VERSION,
    savedAt: typeof v1.savedAt === "string" ? v1.savedAt : new Date().toISOString(),
    accounts: accounts.length > 0 ? accounts : demo.accounts,
    transactions: transactions.length > 0 ? transactions : demo.transactions,
    monthlySnapshots: migrateArray(v1.monthlySnapshots, (s: Record<string, unknown>) => typeof s.month === "string" && Array.isArray(s.metrics)) as PersistedLedgerState["monthlySnapshots"],
    memories: migrateArray(v1.memories, (m: Record<string, unknown>) => typeof m.month === "string" && typeof m.summary === "string") as PersistedLedgerState["memories"],
    forecastItems: migrateArray(v1.forecastItems, (f: Record<string, unknown>) => typeof f.date === "string" && typeof f.label === "string" && typeof f.amount === "number") as PersistedLedgerState["forecastItems"],
    importMetadata: migrateArray(v1.importMetadata, (m: Record<string, unknown>) => typeof m.id === "string" && typeof m.fileName === "string") as PersistedLedgerState["importMetadata"],
    importSessions: [],
    budgets: migrateArray(v1.budgets, (b: Record<string, unknown>) => typeof b.id === "string" && typeof b.category === "string" && typeof b.month === "string" && typeof b.amount === "number") as PersistedLedgerState["budgets"],
    goals: migrateArray(v1.goals, (g: Record<string, unknown>) => typeof g.id === "string" && typeof g.name === "string" && typeof g.targetAmount === "number" && typeof g.currentAmount === "number") as PersistedLedgerState["goals"],
    recurringEntries: migrateArray(v1.recurringEntries, (r: Record<string, unknown>) => typeof r.id === "string" && typeof r.description === "string" && typeof r.amount === "number" && typeof r.category === "string" && typeof r.accountId === "string" && typeof r.frequency === "string" && typeof r.nextDate === "string" && typeof r.status === "string" && typeof r.createdAt === "string") as PersistedLedgerState["recurringEntries"],
  };
}

function migrateArray(raw: unknown, validator: (item: Record<string, unknown>) => boolean): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item) => isRecord(item) && validator(item));
}

// ─── Backup / Restore Normalization ────────────────────────────────────────

export function normalizeLedgerBackup(value: unknown, source: "saved" | "backup" = "backup"): LoadLedgerResult {
  if (!isRecord(value)) {
    return { ok: false, state: createDemoLedgerState(), source: "demo", warning: "Backup was not a readable ledger object." };
  }

  const schemaVersion = Number(value.schemaVersion ?? 0);
  if (schemaVersion > LEDGER_SCHEMA_VERSION) {
    return {
      ok: false,
      state: createDemoLedgerState(),
      source: "demo",
      warning: `Backup schema v${schemaVersion} is newer than this app supports.`,
    };
  }

  // Migrate older backups
  if (schemaVersion < 2) {
    const migrated = migrateV1ToV2(value as Record<string, unknown>);
    return {
      ok: true,
      state: migrated,
      source: "saved",
      warning: "Older backup was upgraded to multi-currency schema.",
    };
  }

  const demo = createDemoLedgerState();
  const rawAccounts = Array.isArray(value.accounts) ? value.accounts : demo.accounts;
  const rawTransactions = Array.isArray(value.transactions) ? value.transactions : demo.transactions;
  const rawSnapshots = Array.isArray(value.monthlySnapshots) ? value.monthlySnapshots : demo.monthlySnapshots;
  const rawMemories = Array.isArray(value.memories) ? value.memories : demo.memories;
  const rawForecast = Array.isArray(value.forecastItems) ? value.forecastItems : demo.forecastItems;
  const rawMetadata = Array.isArray(value.importMetadata) ? value.importMetadata : [];
  const rawSessions = Array.isArray(value.importSessions) ? value.importSessions : [];
  const rawBudgets = Array.isArray(value.budgets) ? value.budgets : [];
  const rawGoals = Array.isArray(value.goals) ? value.goals : [];
  const rawRecurring = Array.isArray(value.recurringEntries) ? value.recurringEntries : [];

  const validAccounts = rawAccounts
    .filter(isRecord)
    .filter((a) => typeof a.id === "string" && typeof a.name === "string" && typeof a.balance === "number")
    .map((a) => ({
      ...a,
      currency: typeof a.currency === "string" ? a.currency : DEFAULT_BASE_CURRENCY,
    })) as PersistedLedgerState["accounts"];

  const validTransactions = rawTransactions
    .filter(isRecord)
    .filter(
      (t) =>
        typeof t.id === "string" &&
        typeof t.date === "string" &&
        typeof t.description === "string" &&
        typeof t.amount === "number" &&
        typeof t.accountId === "string",
    ) as PersistedLedgerState["transactions"];

  const validSnapshots = rawSnapshots
    .filter(isRecord)
    .filter((s) => typeof s.month === "string" && Array.isArray(s.metrics)) as PersistedLedgerState["monthlySnapshots"];

  const validMemories = rawMemories
    .filter(isRecord)
    .filter((m) => typeof m.month === "string" && typeof m.summary === "string") as PersistedLedgerState["memories"];

  const validForecast = rawForecast
    .filter(isRecord)
    .filter((f) => typeof f.date === "string" && typeof f.label === "string" && typeof f.amount === "number") as PersistedLedgerState["forecastItems"];

  const validMetadata = rawMetadata
    .filter(isRecord)
    .filter((m) => typeof m.id === "string" && typeof m.fileName === "string") as PersistedLedgerState["importMetadata"];

  const validSessions: ImportSession[] = rawSessions
    .filter(isRecord)
    .filter(
      (s) =>
        typeof s.id === "string" &&
        typeof s.fileName === "string" &&
        typeof s.importedAt === "string" &&
        Array.isArray(s.transactionIds),
    ) as ImportSession[];

  const validBudgets = rawBudgets
    .filter(isRecord)
    .filter((b) => typeof b.id === "string" && typeof b.category === "string" && typeof b.month === "string" && typeof b.amount === "number") as PersistedLedgerState["budgets"];

  const validGoals = rawGoals
    .filter(isRecord)
    .filter((g) => typeof g.id === "string" && typeof g.name === "string" && typeof g.targetAmount === "number" && typeof g.currentAmount === "number") as PersistedLedgerState["goals"];

  const validRecurring = rawRecurring
    .filter(isRecord)
    .filter(
      (r) =>
        typeof r.id === "string" &&
        typeof r.description === "string" &&
        typeof r.amount === "number" &&
        typeof r.category === "string" &&
        typeof r.accountId === "string" &&
        typeof r.frequency === "string" &&
        typeof r.nextDate === "string" &&
        typeof r.status === "string" &&
        typeof r.createdAt === "string",
    ) as PersistedLedgerState["recurringEntries"];

  const state: PersistedLedgerState = {
    schemaVersion: LEDGER_SCHEMA_VERSION,
    savedAt: typeof value.savedAt === "string" ? value.savedAt : new Date().toISOString(),
    accounts: validAccounts.length > 0 ? validAccounts : demo.accounts,
    transactions: validTransactions.length > 0 ? validTransactions : demo.transactions,
    monthlySnapshots: validSnapshots.length > 0 ? validSnapshots : demo.monthlySnapshots,
    memories: validMemories.length > 0 ? validMemories : demo.memories,
    forecastItems: validForecast.length > 0 ? validForecast : demo.forecastItems,
    importMetadata: validMetadata.length > 0 ? validMetadata : [],
    importSessions: validSessions.length > 0 ? validSessions : [],
    budgets: validBudgets.length > 0 ? validBudgets : [],
    goals: validGoals.length > 0 ? validGoals : [],
    recurringEntries: validRecurring.length > 0 ? validRecurring : [],
  };

  const filteredCount =
    rawAccounts.length +
    rawTransactions.length +
    rawSnapshots.length +
    rawMemories.length +
    rawForecast.length +
    rawMetadata.length +
    rawSessions.length +
    rawBudgets.length +
    rawGoals.length +
    rawRecurring.length -
    (validAccounts.length +
      validTransactions.length +
      validSnapshots.length +
      validMemories.length +
      validForecast.length +
      validMetadata.length +
      validSessions.length +
      validBudgets.length +
      validGoals.length +
      validRecurring.length);

  const warning =
    filteredCount > 0
      ? `${filteredCount} invalid entr${filteredCount === 1 ? "y" : "ies"} filtered from backup.`
      : undefined;

  return {
    ok: true,
    state,
    source: "saved",
    warning,
  };
}

// ─── Category Learnings ────────────────────────────────────────────────────

const LEARNINGS_KEY = "openledger_category_learnings";

export function loadCategoryLearnings(storage: Storage): LearnedCategory[] {
  try {
    const raw = storage.getItem(LEARNINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCategoryLearnings(storage: Storage, learnings: LearnedCategory[]): void {
  storage.setItem(LEARNINGS_KEY, JSON.stringify(learnings));
}

export function recordCategoryLearning(
  storage: Storage,
  current: LearnedCategory[],
  pattern: string,
  parent: string,
  child: string,
): LearnedCategory[] {
  const normalized = pattern.toLowerCase().trim();
  const updated = current.filter((l) => l.pattern !== normalized);
  updated.push({ pattern: normalized, parent, child });
  saveCategoryLearnings(storage, updated);
  return updated;
}

// ─── Currency Settings Persistence ─────────────────────────────────────────

export function loadCurrencySettings(storage: Storage): CurrencySettings | null {
  try {
    const raw = storage.getItem(CURRENCY_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCurrencySettings(storage: Storage, settings: CurrencySettings): void {
  storage.setItem(CURRENCY_SETTINGS_KEY, JSON.stringify(settings));
}

// ─── Import Sessions Persistence ───────────────────────────────────────────

export function saveImportSessions(
  storage: Storage,
  sessions: ImportSession[],
): void {
  storage.setItem(IMPORT_SESSIONS_KEY, JSON.stringify(sessions));
}

export function loadImportSessions(storage: Storage): ImportSession[] {
  try {
    const raw = storage.getItem(IMPORT_SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addImportSession(
  storage: Storage,
  session: ImportSession,
): ImportSession[] {
  const current = loadImportSessions(storage);
  const updated = [session, ...current];
  saveImportSessions(storage, updated);
  return updated;
}

export function removeImportSession(
  storage: Storage,
  sessionId: string,
): ImportSession[] {
  const current = loadImportSessions(storage);
  const updated = current.filter((s) => s.id !== sessionId);
  saveImportSessions(storage, updated);
  return updated;
}

// ─── Utility ────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
