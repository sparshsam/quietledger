export type AccountKind = "cash" | "chequing" | "savings" | "credit-card" | "loan" | "investment" | "other" | "crypto" | "credit";

export type Account = {
  id: string;
  name: string;
  kind: AccountKind;
  subtitle: string;
  balance: number;
  currency: "CAD";
  archivedAt?: string;
};

export type Transaction = {
  id: string;
  date: string;
  description: string;
  merchant?: string;
  category: string;       // parent category, e.g. "Food"
  subcategory?: string;   // child category, e.g. "Coffee"
  accountId: string;
  amount: number;
  note?: string;
  source?: "demo" | "csv" | "manual";
  importId?: string;
};

export type ImportMetadata = {
  id: string;
  fileName: string;
  importedAt: string;
  rowCount: number;
  acceptedCount: number;
  duplicateCount: number;
  warningCount: number;
};

export type LearnedCategory = {
  pattern: string;       // normalized merchant name, e.g. "starbucks"
  parent: string;        // e.g. "Food"
  child: string;         // e.g. "Coffee"
};

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
  intervalDays?: number; // for custom frequency
  nextDate: string; // ISO date string
  endDate?: string; // optional end date
  status: "active" | "paused" | "completed";
  note?: string;
  createdAt: string;
};

export type LedgerData = {
  accounts: Account[];
  transactions: Transaction[];
  importMetadata?: ImportMetadata[];
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
  schemaVersion: 1;
  savedAt: string;
  accounts: Account[];
  transactions: Transaction[];
  monthlySnapshots: MonthlySnapshot[];
  memories: FinancialMemory[];
  forecastItems: ForecastItem[];
  importMetadata: ImportMetadata[];
  budgets: Budget[];
  goals: Goal[];
  recurringEntries: RecurringEntry[];
};
