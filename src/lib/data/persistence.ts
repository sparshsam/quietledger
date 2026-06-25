import { ledgerData } from "./seed";
import type { LearnedCategory, PersistedLedgerState } from "./types";

export const LEDGER_STORAGE_KEY = "openledger.localLedger.v1";
export const LEDGER_SCHEMA_VERSION = 1;

export type LoadLedgerResult =
  | { ok: true; state: PersistedLedgerState; source: "saved" | "demo"; warning?: string }
  | { ok: false; state: PersistedLedgerState; source: "demo"; warning: string };

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
    budgets: ledgerData.budgets ?? [],
    goals: ledgerData.goals ?? [],
    recurringEntries: ledgerData.recurringEntries ?? [],
  };
}

export function loadLedgerState(storage: Storage): LoadLedgerResult {
  const raw = storage.getItem(LEDGER_STORAGE_KEY);
  if (!raw) return { ok: true, state: createDemoLedgerState(), source: "demo" };

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

export function saveLedgerState(storage: Storage, state: Omit<PersistedLedgerState, "schemaVersion" | "savedAt">) {
  const nextState: PersistedLedgerState = {
    schemaVersion: LEDGER_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    ...state,
  };
  storage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(nextState));
  return nextState;
}

export function clearLedgerState(storage: Storage) {
  storage.removeItem(LEDGER_STORAGE_KEY);
}

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

  const demo = createDemoLedgerState();
  const rawAccounts = Array.isArray(value.accounts) ? value.accounts : demo.accounts;
  const rawTransactions = Array.isArray(value.transactions) ? value.transactions : demo.transactions;
  const rawSnapshots = Array.isArray(value.monthlySnapshots) ? value.monthlySnapshots : demo.monthlySnapshots;
  const rawMemories = Array.isArray(value.memories) ? value.memories : demo.memories;
  const rawForecast = Array.isArray(value.forecastItems) ? value.forecastItems : demo.forecastItems;
  const rawMetadata = Array.isArray(value.importMetadata) ? value.importMetadata : [];
  const rawBudgets = Array.isArray(value.budgets) ? value.budgets : [];
  const rawGoals = Array.isArray(value.goals) ? value.goals : [];
  const rawRecurring = Array.isArray(value.recurringEntries) ? value.recurringEntries : [];

  const validAccounts = rawAccounts
    .filter(isRecord)
    .filter((a) => typeof a.id === "string" && typeof a.name === "string" && typeof a.balance === "number");
  const validTransactions = rawTransactions
    .filter(isRecord)
    .filter(
      (t) =>
        typeof t.id === "string" &&
        typeof t.date === "string" &&
        typeof t.description === "string" &&
        typeof t.amount === "number" &&
        typeof t.accountId === "string",
    );
  const validSnapshots = rawSnapshots
    .filter(isRecord)
    .filter((s) => typeof s.month === "string" && Array.isArray(s.metrics));
  const validMemories = rawMemories
    .filter(isRecord)
    .filter((m) => typeof m.month === "string" && typeof m.summary === "string");
  const validForecast = rawForecast
    .filter(isRecord)
    .filter((f) => typeof f.date === "string" && typeof f.label === "string" && typeof f.amount === "number");
  const validMetadata = rawMetadata
    .filter(isRecord)
    .filter((m) => typeof m.id === "string" && typeof m.fileName === "string");
  const validBudgets = rawBudgets
    .filter(isRecord)
    .filter((b) => typeof b.id === "string" && typeof b.category === "string" && typeof b.month === "string" && typeof b.amount === "number");
  const validGoals = rawGoals
    .filter(isRecord)
    .filter((g) => typeof g.id === "string" && typeof g.name === "string" && typeof g.targetAmount === "number" && typeof g.currentAmount === "number");
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
    );

  const state: PersistedLedgerState = {
    schemaVersion: LEDGER_SCHEMA_VERSION,
    savedAt: typeof value.savedAt === "string" ? value.savedAt : new Date().toISOString(),
    accounts: validAccounts.length > 0 ? (validAccounts as PersistedLedgerState["accounts"]) : demo.accounts,
    transactions:
      validTransactions.length > 0 ? (validTransactions as PersistedLedgerState["transactions"]) : demo.transactions,
    monthlySnapshots:
      validSnapshots.length > 0 ? (validSnapshots as PersistedLedgerState["monthlySnapshots"]) : demo.monthlySnapshots,
    memories: validMemories.length > 0 ? (validMemories as PersistedLedgerState["memories"]) : demo.memories,
    forecastItems: validForecast.length > 0 ? (validForecast as PersistedLedgerState["forecastItems"]) : demo.forecastItems,
    importMetadata: validMetadata.length > 0 ? (validMetadata as PersistedLedgerState["importMetadata"]) : [],
    budgets: validBudgets.length > 0 ? (validBudgets as PersistedLedgerState["budgets"]) : [],
    goals: validGoals.length > 0 ? (validGoals as PersistedLedgerState["goals"]) : [],
    recurringEntries: validRecurring.length > 0 ? (validRecurring as PersistedLedgerState["recurringEntries"]) : [],
  };

  const filteredCount =
    rawAccounts.length +
    rawTransactions.length +
    rawSnapshots.length +
    rawMemories.length +
    rawForecast.length +
    rawMetadata.length +
    rawBudgets.length +
    rawGoals.length +
    rawRecurring.length -
    (validAccounts.length +
      validTransactions.length +
      validSnapshots.length +
      validMemories.length +
      validForecast.length +
      validMetadata.length +
      validBudgets.length +
      validGoals.length +
      validRecurring.length);

  const warning =
    filteredCount > 0
      ? `${filteredCount} invalid entr${filteredCount === 1 ? "y" : "ies"} filtered from backup.`
      : schemaVersion < LEDGER_SCHEMA_VERSION
        ? "Older backup was upgraded safely for this session."
        : undefined;

  return {
    ok: true,
    state,
    source: "saved",
    warning,
  };
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
