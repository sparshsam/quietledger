// ─── Core Data Types ────────────────────────────────────────────────────────

export type AccountKind =
  | "cash"
  | "chequing"
  | "savings"
  | "credit-card"
  | "loan"
  | "investment"
  | "other"
  | "crypto"
  | "credit";

export type Account = {
  id: string;
  name: string;
  kind: AccountKind;
  subtitle: string;
  balance: number;
  currency: string; // was hardcoded "CAD" — now any ISO or crypto code, e.g. "USDC", "EUR", "BTC"
  archivedAt?: string;
};

export type Transaction = {
  id: string;
  date: string;
  description: string;
  merchant?: string;
  category: string;
  subcategory?: string;
  accountId: string;
  amount: number; // amount in the account's currency (convenience)

  // Multi-currency fields (v0.10.3)
  originalAmount?: number; // amount as imported (before conversion)
  originalCurrency?: string; // currency of the original import, e.g. "EUR"
  convertedAmount?: number; // amount converted to account currency
  exchangeRate?: number; // rate used: originalCurrency → account currency
  exchangeRateDate?: string; // when the rate was fetched

  note?: string;
  source?: "demo" | "csv" | "manual";
  importId?: string;

  // Transfer detection (v0.10.3)
  isTransfer?: boolean;
  pairedTransactionId?: string;
};

// ─── Import Types ───────────────────────────────────────────────────────────

export type ImportMetadata = {
  id: string;
  fileName: string;
  importedAt: string;
  rowCount: number;
  acceptedCount: number;
  duplicateCount: number;
  warningCount: number;
};

export type ImportSession = {
  id: string;
  fileName: string;
  accountId: string;
  currency: string;
  importedAt: string;
  transactionIds: string[];
  rowCount: number;
  acceptedCount: number;
  duplicateCount: number;
  warningCount: number;
  mappingUsed?: Record<string, string>;
};

export type ImportPreviewRow = {
  rowNumber: number;
  raw: Record<string, string>;
  transaction: Transaction | null;
  warnings: ImportWarning[];
  duplicate: boolean;
  // Multi-currency preview fields (v0.10.3)
  detectedCurrency?: string;
  originalAmount?: number;
  convertedAmount?: number;
  conversionNote?: string;
  isLikelyTransfer?: boolean;
};

export type ImportWarning = {
  level: "warning" | "error";
  message: string;
};

// ─── Currency Settings ──────────────────────────────────────────────────────

export type CurrencySettings = {
  baseCurrency: string; // USDC by default — display/conversion anchor
  importCurrency: string; // default currency for imports with no currency column
  locale: string; // number formatting locale, e.g. "en-US"
};

export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  baseCurrency: "USDC",
  importCurrency: "USDC",
  locale: "en-US",
};

// ─── Reconciliation Types (v0.10.6) ────────────────────────────────────────

export type ReconciliationStatus = "open" | "in_progress" | "reconciled";

export type BalanceAdjustment = {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  reason: string;
  type: "correction" | "fee" | "interest" | "rounding" | "opening" | "closing";
};

export type Reconciliation = {
  id: string;
  accountId: string;
  status: ReconciliationStatus;
  openedAt: string;
  completedAt?: string;
  openingBalance: number;
  closingBalance: number;
  calculatedBalance: number;
  difference: number;
  transactionIds: string[];
  statementBalance?: number;
  statementDate?: string;
  adjustments: BalanceAdjustment[];
};

// ─── Saved Search Types (v0.10.7) ──────────────────────────────────────────

export type SavedSearch = {
  id: string;
  name: string;
  query?: string;
  category?: string;
  accountId?: string;
  merchant?: string;
  currency?: string;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "date" | "amount" | "category" | "merchant";
  sortDir?: "asc" | "desc";
};

// ─── Learned Categories ─────────────────────────────────────────────────────

export type LearnedCategory = {
  pattern: string;
  parent: string;
  child: string;
};

// ─── Patterns, Snapshots, and Insights ──────────────────────────────────────

export type CategoryPattern = {
  id: string;
  title: string;
  detail: string;
  delta: string;
  tone: "sage" | "amber" | "paper";
  category: string;
};

export type MonthlySnapshot = {
  month: string;
  label: string;
  daysLeft: number;
  metrics: Array<{
    id: string;
    label: string;
    amount: number;
    ratio: number;
    tone: "sage" | "amber" | "quiet";
  }>;
};

export type FinancialMemory = {
  id: string;
  month: string;
  summary: string;
  entries: Array<{
    label: string;
    detail: string;
    amount?: number;
  }>;
};

export type ForecastItem = {
  id: string;
  date: string;
  label: string;
  amount: number;
  kind: "bill" | "pressure";
};

export type LifeCostEvent = {
  id: string;
  month: string;
  label: string;
  date: string;
  kind: "income" | "large-expense" | "recurring";
};

// ─── Budgets, Goals, Recurring ──────────────────────────────────────────────

export type Budget = {
  id: string;
  category: string;
  month: string;
  amount: number;
};

export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  createdAt: string;
};

export type RecurringFrequency = "weekly" | "monthly" | "custom";

export type RecurringEntry = {
  id: string;
  description: string;
  amount: number;
  category: string;
  accountId: string;
  frequency: RecurringFrequency;
  intervalDays?: number;
  nextDate: string;
  endDate?: string;
  status: "active" | "paused" | "completed";
  note?: string;
  createdAt: string;
};

// ─── Ledger State ───────────────────────────────────────────────────────────

export type LedgerData = {
  accounts: Account[];
  transactions: Transaction[];
  importMetadata?: ImportMetadata[];
  importSessions: ImportSession[]; // v0.10.3 — import history for rollback
  patterns: CategoryPattern[];
  monthlySnapshots: MonthlySnapshot[];
  memories: FinancialMemory[];
  forecastItems: ForecastItem[];
  lifeCostEvents: LifeCostEvent[];
  budgets: Budget[];
  goals: Goal[];
  recurringEntries?: RecurringEntry[];
};

export type PersistedLedgerState = {
  schemaVersion: 2; // bumped from 1 for currency support
  savedAt: string;
  accounts: Account[];
  transactions: Transaction[];
  monthlySnapshots: MonthlySnapshot[];
  memories: FinancialMemory[];
  forecastItems: ForecastItem[];
  importMetadata: ImportMetadata[];
  importSessions: ImportSession[];
  budgets: Budget[];
  goals: Goal[];
  recurringEntries: RecurringEntry[];
};
