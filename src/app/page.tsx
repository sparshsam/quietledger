"use client";

import {
  Archive,
  ArrowRight,
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Columns3,
  Copy,
  CreditCard,
  Download,
  Eye,
  FileText,
  Landmark,
  Moon,
  Pencil,
  PiggyBank,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  WalletCards,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth, getAuthMode } from "@/lib/supabase/auth-hook";
import { AuthPanel } from "@/components/auth-panel";
import { CloudBackupPanel } from "@/components/cloud-backup-panel";
import {
  buildImportPreview,
  guessMapping,
  hasError,
  parseCsv,
  summarizeImport,
  type CsvField,
  type CsvMapping,
  type ImportPreviewRow,
  type ParsedCsv,
} from "@/lib/data/csv-import";
import { downloadLedgerExport } from "@/lib/data/export";
import {
  clearLedgerState,
  createDemoLedgerState,
  loadLedgerState,
  normalizeLedgerBackup,
  saveLedgerState,
} from "@/lib/data/persistence";
import { ledgerData } from "@/lib/data/seed";
import { createScreenshotLedgerData } from "@/lib/data/screenshot-seed";
import type { Account, AccountKind, Budget, CategoryPattern, Goal, ImportMetadata, LifeCostEvent, MonthlySnapshot, Transaction } from "@/lib/data/types";
import { PwaRegister } from "@/components/pwa-register";
import { DashboardSummary } from "@/components/dashboard-summary";
import { TransactionsView } from "@/components/transactions-view";
import { GuestModeGuidance, CloudBackupGuidance } from "@/components/empty-states";
import { BudgetsPanel } from "@/components/budgets-panel";
import { GoalsPanel } from "@/components/goals-panel";
import { DataManagementPanel } from "@/components/data-management-panel";
import { categoryTotals } from "@/lib/finance/grouping";
import { monthlyTrend } from "@/lib/finance/trends";
import { accountEffectiveBalance } from "@/lib/finance/totals";
import { budgetUtilization, remainingBudget, isOverBudget } from "@/lib/finance/budgets";
import { goalProgress } from "@/lib/finance/goals";

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

const TABS = ["Home", "Transactions", "Budgets", "Goals", "Settings"] as const;
type Tab = (typeof TABS)[number];

const tabIcons: Record<string, typeof FileText> = {
  Home: FileText, Transactions: ReceiptText, Budgets: PiggyBank, Goals: Sparkles, Settings,
};

const accountIcons: Record<AccountKind, typeof Banknote> = {
  chequing: WalletCards,
  savings: PiggyBank,
  cash: Banknote,
  crypto: CircleDollarSign,
  credit: CreditCard,
  "credit-card": CreditCard,
  loan: Landmark,
  investment: CircleDollarSign,
  other: WalletCards,
};

const accountKindOptions: Array<{ value: AccountKind; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "chequing", label: "Chequing" },
  { value: "savings", label: "Savings" },
  { value: "credit-card", label: "Credit card" },
  { value: "loan", label: "Loan" },
  { value: "investment", label: "Investment" },
  { value: "other", label: "Other" },
];

const categoryOptions = [
  "Groceries",
  "Rent",
  "Food delivery",
  "Transport",
  "Subscriptions",
  "Income",
  "Debt",
  "Utilities",
  "Shopping",
  "Health",
  "Misc",
];

type TransactionFormValues = {
  id?: string;
  date: string;
  description: string;
  merchant: string;
  amount: string;
  direction: "expense" | "income";
  accountId: string;
  category: string;
  note: string;
};

type AccountFormValues = {
  id?: string;
  name: string;
  kind: AccountKind;
  subtitle: string;
  balance: string;
};

const today = new Date().toISOString().slice(0, 10);

const csvFields: Array<{ field: CsvField; label: string; required?: boolean }> = [
  { field: "date", label: "Date", required: true },
  { field: "description", label: "Description", required: true },
  { field: "merchant", label: "Merchant" },
  { field: "amount", label: "Amount", required: true },
  { field: "account", label: "Account" },
  { field: "category", label: "Category" },
  { field: "type", label: "Type / debit / credit" },
];

export default function Home() {
  const { user, profile, loading: authLoading } = useAuth();
  const authMode = getAuthMode(user);
  const [activeTab, setActiveTab] = useState<Tab>("Home");
  const [selectedAccountId, setSelectedAccountId] = useState("chequing");
  const [selectedPatternId, setSelectedPatternId] = useState("delivery");
  const [selectedMemoryId, setSelectedMemoryId] = useState("feb-2026");
  const [selectedMonth, setSelectedMonth] = useState("2026-05");
  const [localOnly, setLocalOnly] = useState(true);
  const [patternFilter, setPatternFilter] = useState("");
  const [accounts, setAccounts] = useState(ledgerData.accounts);
  const [transactions, setTransactions] = useState(ledgerData.transactions);
  const [monthlySnapshots, setMonthlySnapshots] = useState(ledgerData.monthlySnapshots);
  const [memories, setMemories] = useState(ledgerData.memories);
  const [forecastItems, setForecastItems] = useState(ledgerData.forecastItems);
  const [importMetadata, setImportMetadata] = useState<ImportMetadata[]>([]);
  const [budgets, setBudgets] = useState(ledgerData.budgets);
  const [goals, setGoals] = useState(ledgerData.goals);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [storageNotice, setStorageNotice] = useState("Loading local ledger...");
  const [hydrated, setHydrated] = useState(false);
  const screenshotModeRef = useRef(false);
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvMapping, setCsvMapping] = useState<CsvMapping>({});
  const [defaultImportAccountId, setDefaultImportAccountId] = useState("chequing");
  const [currentImportId, setCurrentImportId] = useState("");
  const [importNotice, setImportNotice] = useState("No CSV loaded yet.");
  const [transactionForm, setTransactionForm] = useState<TransactionFormValues>({
    date: today,
    description: "",
    merchant: "",
    amount: "",
    direction: "expense",
    accountId: "chequing",
    category: "Misc",
    note: "",
  });
  const [transactionError, setTransactionError] = useState("");
  const [accountForm, setAccountForm] = useState<AccountFormValues>({
    name: "",
    kind: "chequing",
    subtitle: "",
    balance: "",
  });
  const [accountError, setAccountError] = useState("");
  const jsonImportRef = useRef<HTMLInputElement | null>(null);
  const skipNextSaveCountRef = useRef(0);
  const nextSaveNoticeRef = useRef<string | null>(null);

  const importedTransactions = transactions.filter((transaction) => transaction.source === "csv");
  const trendData = useMemo(() => monthlyTrend(transactions), [transactions]);
  const categoryData = useMemo(() => categoryTotals(transactions), [transactions]);
  const incomeVsExpenseData = useMemo(
    () => trendData.map((d) => ({
      label: new Intl.DateTimeFormat("en-CA", { month: "short", year: "2-digit" }).format(new Date(`${d.month}-01T12:00:00`)),
      income: d.income,
      expense: d.expense,
    })),
    [trendData],
  );
  const effectiveBalances = useMemo(
    () => accounts.map((a) => ({ ...a, balance: accountEffectiveBalance(a, transactions) })),
    [accounts, transactions],
  );
  const currentLedgerData = { ...ledgerData, accounts, transactions, monthlySnapshots, memories, forecastItems, importMetadata, budgets, goals };
  const activeAccounts = accounts.filter((account) => !account.archivedAt);
  const accountsWithBalances = useMemo(
    () =>
      accounts.map((account) => ({
        ...account,
        balance:
          account.balance +
          transactions
            .filter((transaction) => transaction.source === "csv" || transaction.source === "manual")
            .filter((transaction) => transaction.accountId === account.id)
            .reduce((total, transaction) => total + transaction.amount, 0),
      })),
    [accounts, transactions],
  );
  const visibleAccountsWithBalances = accountsWithBalances.filter((account) => !account.archivedAt);
  const monthOptions = useMemo(() => buildMonthOptions(transactions, monthlySnapshots), [monthlySnapshots, transactions]);

  const fallbackSnapshot =
    monthlySnapshots.find((item) => item.month === selectedMonth) ?? monthlySnapshots[0] ?? ledgerData.monthlySnapshots[0];
  const snapshot = buildSnapshot(selectedMonth, transactions, fallbackSnapshot);
  const selectedAccount =
    visibleAccountsWithBalances.find((account) => account.id === selectedAccountId) ??
    visibleAccountsWithBalances[0] ??
    accountsWithBalances[0];
  const selectedMemory = memories.find((memory) => memory.id === selectedMemoryId) ?? memories[0] ?? ledgerData.memories[0];
  const filteredPatterns = ledgerData.patterns.filter((pattern) =>
    `${pattern.title} ${pattern.detail} ${pattern.category}`.toLowerCase().includes(patternFilter.toLowerCase()),
  );
  const visiblePatterns = patternFilter ? filteredPatterns : filteredPatterns.slice(0, 2);
  const selectedPattern =
    ledgerData.patterns.find((pattern) => pattern.id === selectedPatternId) ?? ledgerData.patterns[0];
  const importPreview = useMemo(
    () =>
      parsedCsv
        ? buildImportPreview({
            parsed: parsedCsv,
            mapping: csvMapping,
            accounts: activeAccounts,
            existingTransactions: transactions,
            defaultAccountId: defaultImportAccountId,
            importId: currentImportId,
          })
        : [],
    [activeAccounts, csvMapping, currentImportId, defaultImportAccountId, parsedCsv, transactions],
  );
  const validImportRows = importPreview.filter((row) => row.transaction && !hasError(row) && !row.duplicate);
  const duplicateImportRows = importPreview.filter((row) => row.duplicate);
  const errorImportRows = importPreview.filter(hasError);

  const transactionsForAccount = useMemo(
    () => transactions.filter((transaction) => transaction.accountId === selectedAccount.id),
    [selectedAccount.id, transactions],
  );

  const monthsCurrent = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const netWorth = useMemo(() => {
    return accountsWithBalances.reduce((sum, a) => sum + a.balance, 0);
  }, [accountsWithBalances]);

  const monthlyIncome = useMemo(() => {
    return transactions
      .filter((t) => t.amount > 0 && t.date.startsWith(monthsCurrent))
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions, monthsCurrent]);

  const monthlyExpense = useMemo(() => {
    return Math.abs(
      transactions
        .filter((t) => t.amount < 0 && t.date.startsWith(monthsCurrent))
        .reduce((s, t) => s + t.amount, 0),
    );
  }, [transactions, monthsCurrent]);

  const currentMonthBudgets = useMemo(
    () => budgets.filter((b) => b.month === monthsCurrent),
    [budgets, monthsCurrent],
  );

  const recentTransactions = useMemo(
    () => transactions.slice(0, 10),
    [transactions],
  );

  useEffect(() => {
    // Screenshot demo mode — loads rich sample data, skips persistence
    const params = new URLSearchParams(window.location.search);
    if (params.has("screenshots")) {
      screenshotModeRef.current = true;
      const demo = createScreenshotLedgerData();
      applyLedgerState({
        schemaVersion: 1,
        savedAt: new Date().toISOString(),
        accounts: demo.accounts,
        transactions: demo.transactions,
        monthlySnapshots: demo.monthlySnapshots,
        memories: demo.memories,
        forecastItems: demo.forecastItems,
        importMetadata: demo.importMetadata ?? [],
        budgets: demo.budgets,
        goals: demo.goals,
      });
      setSelectedMonth("2026-06");
      setStorageNotice("Screenshot demo mode active. Data is not saved.");
      setHydrated(true);
      return;
    }

    const result = loadLedgerState(window.localStorage);
    applyLedgerState(result.state);
    setLastSavedAt(result.state.savedAt);
    setStorageNotice(
      result.warning ??
        (result.source === "saved" ? "Local ledger restored from this browser." : "Demo ledger loaded. Changes will save locally."),
    );
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (screenshotModeRef.current) return;
    if (skipNextSaveCountRef.current > 0) {
      skipNextSaveCountRef.current -= 1;
      return;
    }
    const saved = saveLedgerState(window.localStorage, {
      accounts,
      transactions,
      monthlySnapshots,
      memories,
      forecastItems,
      importMetadata,
      budgets,
      goals,
    });
    setLastSavedAt(saved.savedAt);
    setStorageNotice(nextSaveNoticeRef.current ?? "Local ledger saved.");
    nextSaveNoticeRef.current = null;
  }, [accounts, budgets, forecastItems, goals, hydrated, importMetadata, memories, monthlySnapshots, transactions]);

  function applyLedgerState(state: ReturnType<typeof createDemoLedgerState>) {
    setAccounts(state.accounts);
    setTransactions(state.transactions);
    setMonthlySnapshots(state.monthlySnapshots);
    setMemories(state.memories);
    setForecastItems(state.forecastItems);
    setImportMetadata(state.importMetadata);
    setBudgets(state.budgets);
    setGoals(state.goals);
    setSelectedAccountId(state.accounts[0]?.id ?? "chequing");
    setSelectedMonth(state.monthlySnapshots[0]?.month ?? "2026-05");
    setSelectedMemoryId(state.memories[0]?.id ?? "feb-2026");
  }

  const MAX_CSV_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
  const MAX_CSV_ROWS = 10_000;

  async function handleCsvFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_CSV_FILE_SIZE) {
      setImportNotice(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 50 MB.`);
      return;
    }

    const text = await file.text();
    const parsed = parseCsv(text);
    const nextImportId = `import-${crypto.randomUUID()}`;
    setParsedCsv(parsed);
    setCsvFileName(file.name);
    setCsvMapping(guessMapping(parsed.headers));
    setCurrentImportId(nextImportId);
    setImportNotice(`${parsed.rows.length} rows parsed locally.${parsed.rows.length >= MAX_CSV_ROWS ? " Row limit reached." : ""} Review the mapping before saving.`);
  }

  function saveImportedTransactions() {
    if (!parsedCsv || validImportRows.length === 0) {
      setImportNotice("No valid new transactions to save yet.");
      return;
    }

    const nextTransactions = validImportRows.flatMap((row) => (row.transaction ? [row.transaction] : []));
    const metadata = summarizeImport(csvFileName || "Imported CSV", currentImportId, importPreview);
    nextSaveNoticeRef.current = `${nextTransactions.length} transactions imported and saved locally.`;
    setTransactions((current) => [...nextTransactions, ...current]);
    setImportMetadata((current) => [metadata, ...current]);
    setImportNotice(
      `${nextTransactions.length} transactions imported locally. ${duplicateImportRows.length} duplicates skipped.`,
    );
    setParsedCsv(null);
    setCsvFileName("");
    setCsvMapping({});
    setActiveTab("Transactions");
  }

  async function handleJsonBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const result = normalizeLedgerBackup(parsed, "backup");
      if (!result.ok) {
        setStorageNotice(result.warning);
        return;
      }
      nextSaveNoticeRef.current = result.warning ?? `Restored backup from ${file.name}.`;
      applyLedgerState(result.state);
      setActiveTab("Home");
    } catch {
      setStorageNotice("Backup could not be read. No local data was changed.");
    } finally {
      event.target.value = "";
    }
  }

  function resetToDemoData() {
    if (!window.confirm("Reset OpenLedger to the demo ledger? Your local imported transactions will be replaced.")) return;
    skipNextSaveCountRef.current = 2;
    nextSaveNoticeRef.current = "Demo ledger restored and saved locally.";
    applyLedgerState(createDemoLedgerState());
  }

  function clearLocalData() {
    if (!window.confirm("Clear saved local OpenLedger data from this browser? Export a backup first if you need it.")) return;
    clearLedgerState(window.localStorage);
    skipNextSaveCountRef.current = 2;
    applyLedgerState(createDemoLedgerState());
    setLastSavedAt(null);
    setStorageNotice("Local browser data cleared. Demo fallback is showing.");
  }

  function handleRestoreFromCloud(payload: { accounts: unknown[]; transactions: unknown[]; budgets?: unknown[]; goals?: unknown[] }) {
    if (!window.confirm("Replace local ledger with cloud backup? Current local changes will be lost.")) return;
    if (payload.accounts.length > 0) setAccounts(payload.accounts as typeof ledgerData.accounts);
    if (payload.transactions.length > 0) setTransactions(payload.transactions as typeof ledgerData.transactions);
    if (payload.budgets && payload.budgets.length > 0) setBudgets(payload.budgets as typeof ledgerData.budgets);
    if (payload.goals && payload.goals.length > 0) setGoals(payload.goals as typeof ledgerData.goals);
    skipNextSaveCountRef.current = 1;
    nextSaveNoticeRef.current = "Local data restored from cloud backup.";
  }

  function saveManualTransaction() {
    const amountValue = Number(transactionForm.amount);
    if (!transactionForm.date || !transactionForm.description.trim() || !Number.isFinite(amountValue) || amountValue <= 0) {
      setTransactionError("Add a date, description, and positive amount before saving.");
      return;
    }

    const signedAmount = transactionForm.direction === "expense" ? -Math.abs(amountValue) : Math.abs(amountValue);
    const nextTransaction: Transaction = {
      id: transactionForm.id ?? `manual-${crypto.randomUUID()}`,
      date: transactionForm.date,
      description: transactionForm.description.trim(),
      merchant: transactionForm.merchant.trim() || undefined,
      amount: signedAmount,
      accountId: transactionForm.accountId,
      category: transactionForm.category,
      note: transactionForm.note.trim() || undefined,
      source: "manual",
    };

    nextSaveNoticeRef.current = transactionForm.id ? "Manual transaction updated." : "Manual transaction saved locally.";
    setTransactions((current) =>
      transactionForm.id
        ? current.map((transaction) => (transaction.id === transactionForm.id ? nextTransaction : transaction))
        : [nextTransaction, ...current],
    );
    setTransactionForm({
      date: today,
      description: "",
      merchant: "",
      amount: "",
      direction: "expense",
      accountId: activeAccounts[0]?.id ?? "chequing",
      category: "Misc",
      note: "",
    });
    setTransactionError("");
    setActiveTab("Transactions");
  }

  function editTransaction(transaction: Transaction) {
    setTransactionForm({
      id: transaction.id,
      date: transaction.date,
      description: transaction.description,
      merchant: transaction.merchant ?? "",
      amount: Math.abs(transaction.amount).toFixed(2),
      direction: transaction.amount < 0 ? "expense" : "income",
      accountId: transaction.accountId,
      category: transaction.category,
      note: transaction.note ?? "",
    });
    setTransactionError("");
  }

  function duplicateTransaction(transaction: Transaction) {
    const copy: Transaction = {
      ...transaction,
      id: `manual-${crypto.randomUUID()}`,
      description: `${transaction.description} copy`,
      source: "manual",
    };
    nextSaveNoticeRef.current = "Transaction duplicated locally.";
    setTransactions((current) => [copy, ...current]);
  }

  function deleteTransaction(transaction: Transaction) {
    if (!window.confirm(`Delete "${transaction.description}" from the local ledger?`)) return;
    nextSaveNoticeRef.current = "Transaction deleted locally.";
    setTransactions((current) => current.filter((item) => item.id !== transaction.id));
  }

  function saveAccount() {
    const balance = Number(accountForm.balance);
    if (!accountForm.name.trim() || !Number.isFinite(balance)) {
      setAccountError("Add an account name and starting balance before saving.");
      return;
    }

    const nextAccount: Account = {
      id: accountForm.id ?? `account-${crypto.randomUUID()}`,
      name: accountForm.name.trim(),
      kind: accountForm.kind,
      subtitle: accountForm.subtitle.trim() || (accountKindOptions.find((item) => item.value === accountForm.kind)?.label ?? "Account"),
      balance,
      currency: "CAD",
    };

    nextSaveNoticeRef.current = accountForm.id ? "Account updated locally." : "Account created locally.";
    setAccounts((current) =>
      accountForm.id ? current.map((account) => (account.id === accountForm.id ? { ...account, ...nextAccount } : account)) : [nextAccount, ...current],
    );
    setSelectedAccountId(nextAccount.id);
    setDefaultImportAccountId(nextAccount.id);
    setTransactionForm((current) => ({ ...current, accountId: nextAccount.id }));
    setAccountForm({ name: "", kind: "chequing", subtitle: "", balance: "" });
    setAccountError("");
  }

  function editAccount(account: Account) {
    setAccountForm({
      id: account.id,
      name: account.name,
      kind: normalizeAccountKind(account.kind),
      subtitle: account.subtitle,
      balance: account.balance.toFixed(2),
    });
    setAccountError("");
  }

  function archiveAccount(account: Account) {
    if (!window.confirm(`Archive "${account.name}"? Existing transactions will remain in the ledger.`)) return;
    nextSaveNoticeRef.current = "Account archived locally.";
    setAccounts((current) =>
      current.map((item) => (item.id === account.id ? { ...item, archivedAt: new Date().toISOString() } : item)),
    );
    if (selectedAccountId === account.id) setSelectedAccountId(activeAccounts.find((item) => item.id !== account.id)?.id ?? "chequing");
  }

  function saveBudget(budget: Budget) {
    nextSaveNoticeRef.current = "Budget saved locally.";
    setBudgets((current) =>
      budget.id && current.some((b) => b.id === budget.id)
        ? current.map((b) => (b.id === budget.id ? budget : b))
        : [...current, budget],
    );
  }

  function deleteBudget(id: string) {
    if (!window.confirm("Delete this budget?")) return;
    nextSaveNoticeRef.current = "Budget deleted locally.";
    setBudgets((current) => current.filter((b) => b.id !== id));
  }

  function saveGoal(goal: Goal) {
    nextSaveNoticeRef.current = "Goal saved locally.";
    setGoals((current) =>
      goal.id && current.some((g) => g.id === goal.id)
        ? current.map((g) => (g.id === goal.id ? goal : g))
        : [...current, goal],
    );
  }

  function deleteGoal(id: string) {
    if (!window.confirm("Delete this goal?")) return;
    nextSaveNoticeRef.current = "Goal deleted locally.";
    setGoals((current) => current.filter((g) => g.id !== id));
  }

  function contributeToGoal(id: string, amount: number) {
    nextSaveNoticeRef.current = "Goal contribution added.";
    setGoals((current) =>
      current.map((g) => (g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g)),
    );
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <a href="#workspace" className="skip-link">Skip to main content</a>
      <PwaRegister />
      <div className="app-frame">
        <aside className="left-rail">
          <Link href="/" className="left-rail-brand">
            <FileText size={22} aria-hidden />
            <span>OpenLedger</span>
          </Link>
          <nav className="left-rail-nav" aria-label="Primary navigation">
            {TABS.map((tab) => {
              const Icon = tabIcons[tab];
              return (
                <button
                  key={tab}
                  className={activeTab === tab ? "active" : ""}
                  onClick={() => setActiveTab(tab)}
                  aria-current={activeTab === tab ? "page" : undefined}
                >
                  <Icon size={20} aria-hidden />
                  <span>{tab}</span>
                </button>
              );
            })}
          </nav>
          <div className="left-rail-footer">
            <div className="guest-badge">
              <span className={"status-dot " + (authMode === "signed-in" ? "online" : "")} />
              <span>{authMode === "signed-in" ? (profile?.email ?? "Signed in") : "Guest mode"}</span>
            </div>
            {screenshotModeRef.current ? (
              <span className="screenshot-badge" style={{ marginTop: 8, marginLeft: 14 }}>Screenshot demo</span>
            ) : null}
          </div>
        </aside>
        <section className="workspace" id="workspace">
          {activeTab === "Home" ? (
            <div className="home-screen">
              {screenshotModeRef.current ? <span className="screenshot-badge" style={{ marginBottom: 8 }}>Screenshot demo</span> : null}
              <GuestModeGuidance />
              <section aria-label="Financial summary">
                <p className="hero-headline">{monthlyIncome > monthlyExpense ? "You're on track." : "Let's review the numbers."}</p>
                <p className="hero-net-worth">{currency.format(netWorth)}</p>
                <p className="hero-change">
                  {monthlyIncome > monthlyExpense
                    ? "+" + currency.format(monthlyIncome - monthlyExpense) + " this month"
                    : currency.format(monthlyExpense - monthlyIncome) + " overspent this month"}
                </p>
              </section>
              <div className="quick-actions">
                <button className="quick-action primary" onClick={() => setActiveTab("Transactions")}>
                  <Plus size={16} aria-hidden /> Add transaction
                </button>
                <button className="quick-action" onClick={() => downloadLedgerExport(currentLedgerData, importedTransactions, importMetadata)}>
                  <Download size={16} aria-hidden /> Export
                </button>
              </div>
              <section aria-label="Accounts">
                <div className="section-header">
                  <h2 className="section-title">Accounts</h2>
                </div>
                <div className="accounts-strip" role="list" aria-label="Account balances">
                  {visibleAccountsWithBalances.map((a) => (
                    <div key={a.id} className="account-card" role="listitem">
                      <span className="account-card-name">{a.name}</span>
                      <span className={"account-card-balance " + (a.balance < 0 ? "negative" : "positive")}>{currency.format(a.balance)}</span>
                    </div>
                  ))}
                </div>
              </section>
              {currentMonthBudgets.length > 0 ? (
                <section aria-label="Budget progress">
                  <div className="section-header">
                    <h2 className="section-title">Budgets</h2>
                    <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab("Budgets"); }}>Manage</a>
                  </div>
                  <div className="budget-mini-list">
                    {currentMonthBudgets.map((b) => {
                      const util = budgetUtilization(b, transactions);
                      const remaining = remainingBudget(b, transactions);
                      const over = isOverBudget(b, transactions);
                      return (
                        <div key={b.id} className="budget-mini">
                          <div className="budget-mini-header">
                            <strong>{b.category}</strong>
                            <span className={"budget-mini-remaining " + (over ? "negative" : util > 80 ? "warning" : "positive")}>{remaining >= 0 ? "$" + remaining.toFixed(0) + " left" : "$" + Math.abs(remaining).toFixed(0) + " over"}</span>
                          </div>
                          <div className="budget-mini-track">
                            <div className={"budget-mini-fill " + (over ? "over" : util > 80 ? "warn" : "ok")} style={{ width: Math.min(util, 100) + "%" }} />
                          </div>
                          <div className="budget-mini-footer">
                            <span>{currency.format(b.amount)} total</span>
                            <span>{util}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}
              {goals.length > 0 ? (
                <section aria-label="Goal progress">
                  <div className="section-header">
                    <h2 className="section-title">Goals</h2>
                    <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab("Goals"); }}>Manage</a>
                  </div>
                  <div className="goal-mini-list">
                    {goals.slice(0, 3).map((g) => {
                      const progress = goalProgress(g);
                      return (
                        <div key={g.id} className="goal-mini">
                          <div className="goal-mini-header">
                            <strong>{g.name}</strong>
                            <span className="goal-mini-pct">{progress}%</span>
                          </div>
                          <div className="budget-mini-track">
                            <div className="budget-mini-fill ok" style={{ width: Math.min(progress, 100) + "%" }} />
                          </div>
                          <div className="budget-mini-footer">
                            <span>{currency.format(g.currentAmount)} / {currency.format(g.targetAmount)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}
              <section aria-label="Recent transactions">
                <div className="section-header">
                  <h2 className="section-title">Recent</h2>
                  <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab("Transactions"); }}>All transactions</a>
                </div>
                <div className="card">
                  {recentTransactions.length === 0 ? (
                    <div className="tx-empty">
                      <strong>No transactions yet</strong>
                      <p>Import a CSV or add your first transaction to get started.</p>
                    </div>
                  ) : (
                    <div className="recent-list">
                      {recentTransactions.map((t) => (
                        <div key={t.id} className="recent-row">
                          <div className="recent-icon"><Banknote size={18} aria-hidden /></div>
                          <div className="recent-info">
                            <div className="recent-description">{t.description}</div>
                            <div className="recent-meta">{t.category} . {t.date}</div>
                          </div>
                          <span className={"recent-amount " + (t.amount > 0 ? "positive" : "negative")}>{currency.format(t.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : activeTab === "Transactions" ? (
            <div className="tx-view">
              <div className="tx-header"><h1>Transactions</h1></div>
              <div className="card"><TransactionsView transactions={transactions} accounts={accounts} /></div>
              <div className="form-card" style={{ marginTop: 0 }}>
                <h2>Add transaction</h2>
                <ManualTransactionForm
                  values={transactionForm} accounts={activeAccounts} error={transactionError}
                  onChange={setTransactionForm} onSave={saveManualTransaction}
                  onCancel={() => { setTransactionForm({ date: today, description: "", merchant: "", amount: "", direction: "expense", accountId: activeAccounts[0]?.id ?? "chequing", category: "Misc", note: "" }); setTransactionError(""); }}
                />
              </div>
              {transactions.length > 0 ? (
                <div className="card">
                  <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>All transactions</h3>
                  <TransactionTable selectedAccount={selectedAccount} />
                </div>
              ) : null}
            </div>
          ) : activeTab === "Budgets" ? (
            <div className="budgets-view">
              <div className="section-header"><h1>Budgets</h1></div>
              <BudgetsPanel budgets={budgets} transactions={transactions} onSave={saveBudget} onDelete={deleteBudget} />
            </div>
          ) : activeTab === "Goals" ? (
            <div className="goals-view">
              <div className="section-header"><h1>Goals</h1></div>
              <GoalsPanel goals={goals} onSave={saveGoal} onDelete={deleteGoal} onContribute={contributeToGoal} />
            </div>
          ) : (
            <div className="settings-view">
              <div className="section-header"><h1>Settings</h1></div>
              <div className="settings-section">
                <div className="settings-section-header"><ShieldCheck size={16} aria-hidden /> Account</div>
                <div className="settings-row"><span className="settings-row-label">Status</span><AuthPanel user={user} profile={profile} onSignOut={() => {}} /></div>
              </div>
              {authMode === "signed-in" ? (
                <div className="settings-section">
                  <div className="settings-section-header"><Download size={16} aria-hidden /> Cloud Backup</div>
                  <div className="settings-row"><CloudBackupPanel user={user} ledgerData={{ accounts, transactions, budgets, goals }} onRestore={handleRestoreFromCloud} /></div>
                </div>
              ) : null}
              <div className="settings-section">
                <div className="settings-section-header"><Download size={16} aria-hidden /> Data</div>
                <DataManagementPanel user={user} ledgerData={{ accounts, transactions, importMetadata, budgets, goals }} onResetToDemo={resetToDemoData} onClearLocal={clearLocalData} />
              </div>
              <div className="settings-section">
                <div className="settings-section-header"><Upload size={16} aria-hidden /> CSV Import</div>
                <div style={{ padding: "12px 20px" }}>
                  <div className="import-intro">
                    <div><strong>Bring your bank export, not your bank login.</strong><p>CSV parsing happens locally in this browser.</p></div>
                    <label className="file-picker"><Upload size={16} aria-hidden /> Select CSV<input type="file" accept=".csv,text/csv" onChange={handleCsvFile} /></label>
                  </div>
                  <div className="import-status" style={{ marginTop: 12 }}><CheckCircle2 size={15} aria-hidden /><span>{importNotice}</span></div>
                  {parsedCsv ? (
                    <CsvImportPreview
                      headers={parsedCsv.headers} mapping={csvMapping}
                      onMappingChange={(field, header) => setCsvMapping((current) => ({ ...current, [field]: header || undefined }))}
                      defaultAccountId={defaultImportAccountId} onDefaultAccountChange={setDefaultImportAccountId}
                      accounts={activeAccounts} rows={importPreview}
                      validCount={validImportRows.length} duplicateCount={duplicateImportRows.length} errorCount={errorImportRows.length}
                      onSave={saveImportedTransactions}
                    />
                  ) : null}
                </div>
              </div>
              <div className="settings-section">
                <div className="settings-section-header"><WalletCards size={16} aria-hidden /> Manage Accounts ({activeAccounts.length} active)</div>
                <div style={{ padding: "12px 20px" }}>
                  <AccountManagement values={accountForm} accounts={accountsWithBalances} error={accountError}
                    onChange={setAccountForm} onSave={saveAccount}
                    onCancel={() => { setAccountForm({ name: "", kind: "chequing", subtitle: "", balance: "" }); setAccountError(""); }}
                    onEdit={editAccount} onArchive={archiveAccount} />
                </div>
              </div>
              <div className="settings-section">
                <div className="settings-section-header"><Moon size={16} aria-hidden /> Preferences</div>
                <div className="settings-row"><span className="settings-row-label">Local-only mode</span><button onClick={() => setLocalOnly((current) => !current)}>{localOnly ? "On" : "Off"}</button></div>
              </div>
              <div className="settings-section">
                <div className="settings-section-header"><ShieldCheck size={16} aria-hidden /> Legal</div>
                <div className="settings-row"><a href="/privacy" className="settings-row-label" style={{ textDecoration: "none" }}>Privacy Policy</a><ArrowRight size={16} aria-hidden /></div>
                <div className="settings-row"><a href="/terms" className="settings-row-label" style={{ textDecoration: "none" }}>Terms of Service</a><ArrowRight size={16} aria-hidden /></div>
                <div className="settings-row"><a href="/support" className="settings-row-label" style={{ textDecoration: "none" }}>Support</a><ArrowRight size={16} aria-hidden /></div>
              </div>
              <div style={{ textAlign: "center", padding: "16px 0", color: "var(--text-tertiary)", fontSize: 13 }}>OpenLedger . Free &amp; open-source . AGPL-3.0</div>
            </div>
          )}
        </section>
      </div>
      <nav className="bottom-tabs" aria-label="Navigation">
        {TABS.map((tab) => {
          const Icon = tabIcons[tab];
          return (
            <button key={tab} className={activeTab === tab ? "active" : ""}
              onClick={() => setActiveTab(tab)} aria-current={activeTab === tab ? "page" : undefined}>
              <Icon aria-hidden /><span>{tab}</span>
            </button>
          );
        })}
      </nav>
      <div className="storage-live-region" aria-live="polite" aria-atomic="true" role="status">
        {storageNotice ? <span className="storage-notice">{storageNotice}</span> : null}
      </div>
    </main>
  );

  function TransactionTable({ selectedAccount }: { selectedAccount: Account }) {
    const rows = transactionsForAccount.length > 0 ? transactionsForAccount : transactions.slice(0, 5);

    return (
      <div className="transaction-table">
        <div className="table-head">
          <span>Date</span>
          <span>Description</span>
          <span>Category</span>
          <span>Account</span>
          <span>Amount</span>
          <span>Actions</span>
        </div>
        {rows.map((transaction) => (
          <div className="table-row" key={transaction.id}>
            <span>{formatDate(transaction.date)}</span>
            <strong>{transaction.description}</strong>
            <span>{transaction.category}</span>
            <span>{accountsWithBalances.find((account) => account.id === transaction.accountId)?.name ?? selectedAccount.name}</span>
            <em className={transaction.amount < 0 ? "negative" : "positive"}>{currency.format(transaction.amount)}</em>
            <span className="row-actions">
              <button onClick={() => editTransaction(transaction)} aria-label={`Edit ${transaction.description}`}>
                <Pencil size={14} aria-hidden />
              </button>
              <button onClick={() => duplicateTransaction(transaction)} aria-label={`Duplicate ${transaction.description}`}>
                <Copy size={14} aria-hidden />
              </button>
              <button onClick={() => deleteTransaction(transaction)} aria-label={`Delete ${transaction.description}`}>
                <Trash2 size={14} aria-hidden />
              </button>
            </span>
          </div>
        ))}
      </div>
    );
  }
}

function Panel({
  title,
  action,
  control,
  className = "",
  children,
}: {
  title: string;
  action?: string;
  control?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-header">
        <h2>{title}</h2>
        {control}
      </header>
      <div className="panel-body">{children}</div>
      {action ? (
        <button className="panel-action">
          {action}
          <ArrowRight size={14} aria-hidden />
        </button>
      ) : null}
    </section>
  );
}

function CsvImportPreview({
  headers,
  mapping,
  onMappingChange,
  defaultAccountId,
  onDefaultAccountChange,
  accounts,
  rows,
  validCount,
  duplicateCount,
  errorCount,
  onSave,
}: {
  headers: string[];
  mapping: CsvMapping;
  onMappingChange: (field: CsvField, header: string) => void;
  defaultAccountId: string;
  onDefaultAccountChange: (accountId: string) => void;
  accounts: Account[];
  rows: ImportPreviewRow[];
  validCount: number;
  duplicateCount: number;
  errorCount: number;
  onSave: () => void;
}) {
  const missingRequired = csvFields.filter((item) => item.required && !mapping[item.field]);

  return (
    <div className="csv-preview">
      <div className="mapping-grid">
        {csvFields.map((item) => (
          <label key={item.field}>
            <span>
              {item.label}
              {item.required ? " *" : ""}
            </span>
            <select value={mapping[item.field] ?? ""} onChange={(event) => onMappingChange(item.field, event.target.value)}>
              <option value="">Not in this CSV</option>
              {headers.map((header) => (
                <option key={`${item.field}-${header}`} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label>
          <span>Default account</span>
          <select value={defaultAccountId} onChange={(event) => onDefaultAccountChange(event.target.value)}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="import-summary">
        <span>
          <CheckCircle2 size={15} aria-hidden />
          {validCount} ready
        </span>
        <span>
          <AlertTriangle size={15} aria-hidden />
          {duplicateCount} possible duplicates
        </span>
        <span>
          <AlertTriangle size={15} aria-hidden />
          {errorCount} blocked
        </span>
      </div>

      {missingRequired.length > 0 ? (
        <div className="import-warning">
          <AlertTriangle size={16} aria-hidden />
          Map {missingRequired.map((item) => item.label.toLowerCase()).join(", ")} before saving.
        </div>
      ) : null}

      <div className="preview-table" aria-label="CSV import preview">
        <div className="preview-head">
          <span>Row</span>
          <span>Date</span>
          <span>Description</span>
          <span>Category</span>
          <span>Amount</span>
          <span>Warnings</span>
        </div>
        {rows.slice(0, 6).map((row) => (
          <div className={hasError(row) ? "preview-row error" : row.duplicate ? "preview-row duplicate" : "preview-row"} key={row.rowNumber}>
            <span>{row.rowNumber}</span>
            <span>{row.transaction?.date ?? "Invalid"}</span>
            <strong>{row.transaction?.description ?? row.raw[mapping.description ?? ""] ?? "Unmapped"}</strong>
            <span>{row.transaction?.category ?? "Unmapped"}</span>
            <em className={(row.transaction?.amount ?? 0) < 0 ? "negative" : "positive"}>
              {row.transaction ? currency.format(row.transaction.amount) : "Missing"}
            </em>
            <span>{row.warnings.length > 0 ? row.warnings.map((warning) => warning.message).join(", ") : "Ready"}</span>
          </div>
        ))}
      </div>

      <button className="save-import" disabled={validCount === 0 || missingRequired.length > 0} onClick={onSave}>
        <Upload size={16} aria-hidden />
        Save {validCount} local transactions
      </button>
    </div>
  );
}

function ManualTransactionForm({
  values,
  accounts,
  error,
  onChange,
  onSave,
  onCancel,
}: {
  values: TransactionFormValues;
  accounts: Account[];
  error: string;
  onChange: (values: TransactionFormValues) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="ledger-form">
      <div className="form-grid">
        <label>
          <span>Date</span>
          <input type="date" value={values.date} onChange={(event) => onChange({ ...values, date: event.target.value })} />
        </label>
        <label>
          <span>Description</span>
          <input value={values.description} maxLength={200} onChange={(event) => onChange({ ...values, description: event.target.value })} placeholder="Grocery Store" />
        </label>
        <label>
          <span>Merchant</span>
          <input value={values.merchant} maxLength={200} onChange={(event) => onChange({ ...values, merchant: event.target.value })} placeholder="Optional" />
        </label>
        <label>
          <span>Amount</span>
          <input type="number" min="0" step="0.01" value={values.amount} onChange={(event) => onChange({ ...values, amount: event.target.value })} placeholder="0.00" />
        </label>
        <label>
          <span>Type</span>
          <select value={values.direction} onChange={(event) => onChange({ ...values, direction: event.target.value as TransactionFormValues["direction"] })}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>
        <label>
          <span>Account</span>
          <select value={values.accountId} onChange={(event) => onChange({ ...values, accountId: event.target.value })}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Category</span>
          <select value={values.category} onChange={(event) => onChange({ ...values, category: event.target.value })}>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="wide-field">
          <span>Notes</span>
          <input value={values.note} maxLength={500} onChange={(event) => onChange({ ...values, note: event.target.value })} placeholder="Optional memory or context" />
        </label>
      </div>
      {error ? <p className="gentle-error" id="transaction-form-error">{error}</p> : null}
      <p className="gentle-help" id="transaction-form-help">Manual entries stay in this browser and are included in backups.</p>
      <div className="form-actions" role="group" aria-describedby={error ? "transaction-form-error" : "transaction-form-help"}>
        <button onClick={onSave}>
          <Plus size={16} aria-hidden />
          {values.id ? "Save changes" : "Add transaction"}
        </button>
        {values.id ? <button onClick={onCancel}>Cancel edit</button> : null}
      </div>
    </div>
  );
}

function AccountManagement({
  values,
  accounts,
  error,
  onChange,
  onSave,
  onCancel,
  onEdit,
  onArchive,
}: {
  values: AccountFormValues;
  accounts: Account[];
  error: string;
  onChange: (values: AccountFormValues) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: (account: Account) => void;
  onArchive: (account: Account) => void;
}) {
  return (
    <div className="ledger-form">
      <div className="form-grid account-form-grid">
        <label>
          <span>Name</span>
          <input value={values.name} maxLength={100} onChange={(event) => onChange({ ...values, name: event.target.value })} placeholder="Everyday card" />
        </label>
        <label>
          <span>Type</span>
          <select value={values.kind} onChange={(event) => onChange({ ...values, kind: event.target.value as AccountKind })}>
            {accountKindOptions.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Starting balance</span>
          <input type="number" step="0.01" value={values.balance} onChange={(event) => onChange({ ...values, balance: event.target.value })} placeholder="0.00" />
        </label>
        <label>
          <span>Subtitle</span>
          <input value={values.subtitle} maxLength={100} onChange={(event) => onChange({ ...values, subtitle: event.target.value })} placeholder="Optional" />
        </label>
      </div>
      {error ? <p className="gentle-error" id="account-form-error">{error}</p> : null}
      <p className="gentle-help" id="account-form-help">Archive hides an account but keeps its transaction history.</p>
      <div className="form-actions" role="group" aria-describedby={error ? "account-form-error" : "account-form-help"}>
        <button onClick={onSave}>
          <Plus size={16} aria-hidden />
          {values.id ? "Save account" : "Create account"}
        </button>
        {values.id ? <button onClick={onCancel}>Cancel edit</button> : null}
      </div>
      <div className="managed-account-list">
        {accounts.length === 0 ? (
          <p className="empty-state">No accounts yet. Add one above to start a local ledger.</p>
        ) : (
          accounts.map((account) => (
            <div key={account.id} className={account.archivedAt ? "managed-account archived" : "managed-account"}>
              <span>
                <strong>{account.name}</strong>
                <small>
                  {accountKindLabel(account.kind)} · {account.archivedAt ? "Archived" : currency.format(account.balance)}
                </small>
              </span>
              <span className="row-actions">
                <button onClick={() => onEdit(account)} aria-label={`Edit ${account.name}`}>
                  <Pencil size={14} aria-hidden />
                </button>
                {!account.archivedAt ? (
                  <button onClick={() => onArchive(account)} aria-label={`Archive ${account.name}`}>
                    <Archive size={14} aria-hidden />
                  </button>
                ) : null}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AccountRow({ account, selected, onSelect }: { account: Account; selected: boolean; onSelect: () => void }) {
  const Icon = accountIcons[account.kind];

  return (
    <button className={selected ? "account-row selected" : "account-row"} onClick={onSelect}>
      <span className="line-icon">
        <Icon size={17} aria-hidden />
      </span>
      <span>
        <strong>{account.name}</strong>
        <small>{account.subtitle}</small>
      </span>
      <em className={account.balance < 0 ? "negative" : "positive"}>{currency.format(account.balance)}</em>
    </button>
  );
}

function PatternButton({
  pattern,
  selected,
  onSelect,
}: {
  pattern: CategoryPattern;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button className={selected ? `insight-row ${pattern.tone} selected` : `insight-row ${pattern.tone}`} onClick={onSelect}>
      <span className="insight-icon">
        <Tag size={18} aria-hidden />
      </span>
      <span>
        <strong>{pattern.title}</strong>
        <small>{pattern.delta}</small>
      </span>
      <ChevronRight size={17} aria-hidden />
    </button>
  );
}

function LifeCostMap({ events }: { events: LifeCostEvent[] }) {
  return (
    <div className="life-map">
      <div className="map-months">
        {events.map((event) => (
          <span key={`${event.id}-month`}>{event.month}</span>
        ))}
      </div>
      <div className="map-line">
        {events.map((event) => (
          <span key={`${event.id}-dot`} className={event.kind} />
        ))}
      </div>
      <div className="map-labels">
        {events.map((event) => (
          <div key={event.id}>
            <strong>{event.label}</strong>
            <span>{event.date}</span>
          </div>
        ))}
      </div>
      <div className="map-legend">
        <span><i className="income" />Income</span>
        <span><i className="large-expense" />Large expense</span>
        <span><i className="recurring" />Recurring</span>
      </div>
    </div>
  );
}

function Note({ date, text }: { date: string; text: string }) {
  return (
    <div className="note-row">
      <span>{date}</span>
      <p>{text}</p>
      <FileText size={16} aria-hidden />
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildMonthOptions(transactions: typeof ledgerData.transactions, snapshots: MonthlySnapshot[]) {
  const known = new Map(snapshots.map((snapshot) => [snapshot.month, snapshot.label]));
  transactions.forEach((transaction) => {
    const month = transaction.date.slice(0, 7);
    if (!known.has(month)) known.set(month, monthLabel(month));
  });

  return [...known.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([value, label]) => ({ value, label }));
}

function buildSnapshot(month: string, transactions: typeof ledgerData.transactions, fallback: MonthlySnapshot): MonthlySnapshot {
  const monthTransactions = transactions.filter((transaction) => transaction.date.startsWith(month));
  if (
    monthTransactions.length === 0 ||
    !monthTransactions.some((transaction) => transaction.source === "csv" || transaction.source === "manual")
  ) {
    return fallback;
  }

  const income = sumWhere(monthTransactions, (transaction) => transaction.amount > 0);
  const essential = sumWhere(monthTransactions, (transaction) =>
    ["Groceries", "Rent", "Utilities", "Transport", "Health"].includes(transaction.category),
  );
  const optional = sumWhere(monthTransactions, (transaction) =>
    transaction.amount < 0 && ["Food delivery", "Shopping", "Misc", "Food & Drink"].includes(transaction.category),
  );
  const recurring = sumWhere(monthTransactions, (transaction) =>
    ["Subscriptions", "Rent", "Utilities"].includes(transaction.category),
  );
  const debt = sumWhere(monthTransactions, (transaction) => transaction.category === "Debt");
  const savingsMovement = income + essential + optional + recurring + debt;
  const largest = Math.max(1, ...[income, essential, optional, recurring, savingsMovement, debt].map((value) => Math.abs(value)));

  return {
    month,
    label: monthLabel(month),
    daysLeft: fallback.month === month ? fallback.daysLeft : 0,
    metrics: [
      { id: "income", label: "Income", amount: income, ratio: ratio(income, largest), tone: "sage" },
      { id: "essential", label: "Essential spending", amount: essential, ratio: ratio(essential, largest), tone: "quiet" },
      { id: "optional", label: "Optional spending", amount: optional, ratio: ratio(optional, largest), tone: "quiet" },
      { id: "recurring", label: "Recurring obligations", amount: recurring, ratio: ratio(recurring, largest), tone: "quiet" },
      { id: "savings", label: "Savings movement", amount: savingsMovement, ratio: ratio(savingsMovement, largest), tone: "sage" },
      { id: "debt", label: "Debt progress", amount: debt, ratio: ratio(debt, largest), tone: "amber" },
    ],
  };
}

function sumWhere(transactions: typeof ledgerData.transactions, predicate: (transaction: typeof ledgerData.transactions[number]) => boolean) {
  return transactions.filter(predicate).reduce((total, transaction) => total + transaction.amount, 0);
}

function ratio(value: number, largest: number) {
  return Math.max(0.18, Math.min(1, Math.abs(value) / largest));
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric" }).format(new Date(`${month}-01T12:00:00`));
}

function normalizeAccountKind(kind: AccountKind): AccountKind {
  return kind === "credit" ? "credit-card" : kind;
}

function accountKindLabel(kind: AccountKind) {
  if (kind === "crypto") return "Investment";
  return accountKindOptions.find((item) => item.value === normalizeAccountKind(kind))?.label ?? "Account";
}
