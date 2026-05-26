import { ledgerData } from "./seed";
import type { PersistedLedgerState } from "./types";

export const LEDGER_STORAGE_KEY = "quietledger.localLedger.v1";
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
  const state: PersistedLedgerState = {
    schemaVersion: LEDGER_SCHEMA_VERSION,
    savedAt: typeof value.savedAt === "string" ? value.savedAt : new Date().toISOString(),
    accounts: Array.isArray(value.accounts) ? value.accounts : demo.accounts,
    transactions: Array.isArray(value.transactions) ? value.transactions : demo.transactions,
    monthlySnapshots: Array.isArray(value.monthlySnapshots) ? value.monthlySnapshots : demo.monthlySnapshots,
    memories: Array.isArray(value.memories) ? value.memories : demo.memories,
    forecastItems: Array.isArray(value.forecastItems) ? value.forecastItems : demo.forecastItems,
    importMetadata: Array.isArray(value.importMetadata) ? value.importMetadata : [],
  };

  return {
    ok: true,
    state,
    source: source === "saved" ? "saved" : "saved",
    warning: schemaVersion < LEDGER_SCHEMA_VERSION ? "Older backup was upgraded safely for this session." : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
