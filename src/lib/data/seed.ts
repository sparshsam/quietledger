import type { LedgerData } from "./types";

/**
 * Default empty ledger state.
 * A single placeholder account is provided so the UI has a default
 * account to reference, but no demo transactions or financial entries.
 * Screenshot demo data is available via ?screenshots=true.
 */
export const ledgerData: LedgerData = {
  accounts: [
    { id: "default", name: "My Account", kind: "chequing", subtitle: "Your ledger", balance: 0, currency: "USDC" },
  ],
  transactions: [],
  patterns: [],
  monthlySnapshots: [],
  memories: [],
  forecastItems: [],
  lifeCostEvents: [],
  budgets: [],
  goals: [],
  recurringEntries: [],
  importMetadata: [],
  importSessions: [],
};
