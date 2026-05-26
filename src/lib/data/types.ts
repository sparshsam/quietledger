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
  category: string;
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

export type LedgerData = {
  accounts: Account[];
  transactions: Transaction[];
  importMetadata?: ImportMetadata[];
  patterns: CategoryPattern[];
  monthlySnapshots: MonthlySnapshot[];
  memories: FinancialMemory[];
  forecastItems: ForecastItem[];
  lifeCostEvents: LifeCostEvent[];
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
};
