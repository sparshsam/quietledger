"use client";

import {
  Archive,
  ArrowRight,
  Banknote,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleDollarSign,
  Cloud,
  Columns3,
  CreditCard,
  Download,
  Eye,
  FileUp,
  FileText,
  Landmark,
  LayoutDashboard,
  Moon,
  PiggyBank,
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
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import type { Account, AccountKind, CategoryPattern, ImportMetadata, LifeCostEvent, MonthlySnapshot } from "@/lib/data/types";
import { PwaRegister } from "@/components/pwa-register";

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Accounts", icon: WalletCards },
  { label: "Transactions", icon: ReceiptText },
  { label: "Memory", icon: Archive },
  { label: "Forecast", icon: Cloud },
  { label: "Settings", icon: Settings },
];

const accountIcons: Record<AccountKind, typeof Banknote> = {
  chequing: WalletCards,
  savings: PiggyBank,
  cash: Banknote,
  crypto: CircleDollarSign,
  credit: CreditCard,
  loan: Landmark,
};

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
  const [activeNav, setActiveNav] = useState("Overview");
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
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [storageNotice, setStorageNotice] = useState("Loading local ledger...");
  const [hydrated, setHydrated] = useState(false);
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvMapping, setCsvMapping] = useState<CsvMapping>({});
  const [defaultImportAccountId, setDefaultImportAccountId] = useState("chequing");
  const [currentImportId, setCurrentImportId] = useState("");
  const [importNotice, setImportNotice] = useState("No CSV loaded yet.");
  const jsonImportRef = useRef<HTMLInputElement | null>(null);
  const skipNextSaveRef = useRef(false);
  const nextSaveNoticeRef = useRef<string | null>(null);

  const importedTransactions = transactions.filter((transaction) => transaction.source === "csv");
  const currentLedgerData = { ...ledgerData, accounts, transactions, monthlySnapshots, memories, forecastItems, importMetadata };
  const accountsWithBalances = useMemo(
    () =>
      accounts.map((account) => ({
        ...account,
        balance:
          account.balance +
          importedTransactions
            .filter((transaction) => transaction.accountId === account.id)
            .reduce((total, transaction) => total + transaction.amount, 0),
      })),
    [accounts, importedTransactions],
  );
  const monthOptions = useMemo(() => buildMonthOptions(transactions, monthlySnapshots), [monthlySnapshots, transactions]);

  const fallbackSnapshot =
    monthlySnapshots.find((item) => item.month === selectedMonth) ?? monthlySnapshots[0] ?? ledgerData.monthlySnapshots[0];
  const snapshot = buildSnapshot(selectedMonth, transactions, fallbackSnapshot);
  const selectedAccount = accountsWithBalances.find((account) => account.id === selectedAccountId) ?? accountsWithBalances[0];
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
            accounts,
            existingTransactions: transactions,
            defaultAccountId: defaultImportAccountId,
            importId: currentImportId,
          })
        : [],
    [accounts, csvMapping, currentImportId, defaultImportAccountId, parsedCsv, transactions],
  );
  const validImportRows = importPreview.filter((row) => row.transaction && !hasError(row) && !row.duplicate);
  const duplicateImportRows = importPreview.filter((row) => row.duplicate);
  const errorImportRows = importPreview.filter(hasError);

  const transactionsForAccount = useMemo(
    () => transactions.filter((transaction) => transaction.accountId === selectedAccount.id),
    [selectedAccount.id, transactions],
  );

  useEffect(() => {
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
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    const saved = saveLedgerState(window.localStorage, {
      accounts,
      transactions,
      monthlySnapshots,
      memories,
      forecastItems,
      importMetadata,
    });
    setLastSavedAt(saved.savedAt);
    setStorageNotice(nextSaveNoticeRef.current ?? "Local ledger saved.");
    nextSaveNoticeRef.current = null;
  }, [accounts, forecastItems, hydrated, importMetadata, memories, monthlySnapshots, transactions]);

  function applyLedgerState(state: ReturnType<typeof createDemoLedgerState>) {
    setAccounts(state.accounts);
    setTransactions(state.transactions);
    setMonthlySnapshots(state.monthlySnapshots);
    setMemories(state.memories);
    setForecastItems(state.forecastItems);
    setImportMetadata(state.importMetadata);
    setSelectedAccountId(state.accounts[0]?.id ?? "chequing");
    setSelectedMonth(state.monthlySnapshots[0]?.month ?? "2026-05");
    setSelectedMemoryId(state.memories[0]?.id ?? "feb-2026");
  }

  async function handleCsvFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parsed = parseCsv(text);
    const nextImportId = `import-${Date.now()}`;
    setParsedCsv(parsed);
    setCsvFileName(file.name);
    setCsvMapping(guessMapping(parsed.headers));
    setCurrentImportId(nextImportId);
    setImportNotice(`${parsed.rows.length} rows parsed locally. Review the mapping before saving.`);
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
    setActiveNav("Transactions");
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
      setActiveNav("Overview");
    } catch {
      setStorageNotice("Backup could not be read. No local data was changed.");
    } finally {
      event.target.value = "";
    }
  }

  function resetToDemoData() {
    if (!window.confirm("Reset QuietLedger to the demo ledger? Your local imported transactions will be replaced.")) return;
    nextSaveNoticeRef.current = "Demo ledger restored and saved locally.";
    applyLedgerState(createDemoLedgerState());
  }

  function clearLocalData() {
    if (!window.confirm("Clear saved local QuietLedger data from this browser? Export a backup first if you need it.")) return;
    clearLedgerState(window.localStorage);
    skipNextSaveRef.current = true;
    applyLedgerState(createDemoLedgerState());
    setLastSavedAt(null);
    setStorageNotice("Local browser data cleared. Demo fallback is showing.");
  }

  return (
    <main className="min-h-screen bg-[var(--graphite)] text-[var(--ink)]">
      <PwaRegister />
      <div className="app-frame">
        <aside className="sidebar">
          <div>
            <div className="window-dots" aria-hidden>
              <span />
              <span />
              <span />
            </div>
            <div className="brand">
              <div className="brand-mark">
                <FileText size={18} aria-hidden />
              </div>
              <div>
                <p>QuietLedger</p>
                <span>Money without noise.</span>
              </div>
            </div>

            <nav className="nav-list" aria-label="Primary navigation">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  className={activeNav === item.label ? "active" : ""}
                  onClick={() => setActiveNav(item.label)}
                >
                  <item.icon size={18} aria-hidden />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="sidebar-lower">
            <section className="local-panel" aria-label="Local data status">
              <div>
                <span className="status-dot" />
                <strong>{localOnly ? "Local only" : "Sync preview"}</strong>
              </div>
              <p>{localOnly ? "All data stored on this device" : "Supabase boundary is ready for later"}</p>
              <button onClick={() => setLocalOnly((current) => !current)}>Change sync settings</button>
            </section>

            <div className="quiet-mode">
              <span>
                <Moon size={16} aria-hidden />
                Quiet mode
              </span>
              <button
                className={localOnly ? "toggle on" : "toggle"}
                onClick={() => setLocalOnly((current) => !current)}
                aria-label="Toggle local-only mode"
              >
                <span />
              </button>
            </div>
          </div>
        </aside>

        <section className="workspace">
          <header className="topbar">
            <div>
              <h1>This month is stable.</h1>
              <div className="month-row">
                <label>
                  <span className="sr-only">Selected month</span>
                  <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
                    {monthOptions.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="divider" />
                <span>{snapshot.daysLeft > 0 ? `${snapshot.daysLeft} days left` : "Month closed"}</span>
              </div>
            </div>
            <div className="system-status">
              <div>
                <ShieldCheck size={16} aria-hidden />
                <span>{localOnly ? "All data is local" : "Prepared for self-hosted sync"}</span>
              </div>
              <p>Last backup: Today, 11:32 PM</p>
              <button onClick={() => downloadLedgerExport(currentLedgerData, importedTransactions, importMetadata)}>
                <Download size={15} aria-hidden />
                Export JSON
              </button>
            </div>
          </header>

          <div className="dashboard-grid">
            <Panel className="accounts-panel" title="Accounts" action="View all accounts">
              <div className="account-list">
                {accountsWithBalances.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    selected={selectedAccount.id === account.id}
                    onSelect={() => setSelectedAccountId(account.id)}
                  />
                ))}
              </div>
            </Panel>

            <Panel title="Monthly snapshot" action="Details">
              <div className="snapshot-list">
                {snapshot.metrics.map((metric) => (
                  <div className="metric-row" key={metric.id}>
                    <span>{metric.label}</span>
                    <strong className={metric.amount < 0 ? "negative" : "positive"}>{currency.format(metric.amount)}</strong>
                    <span className="meter" aria-hidden>
                      <span className={metric.tone} style={{ width: `${metric.ratio * 100}%` }} />
                    </span>
                  </div>
                ))}
              </div>
              <div className="panel-foot">Compared to April 2026</div>
            </Panel>

            <Panel title="Quiet Categorization insights" action="View all insights" className="insights-panel">
              <label className="search-box">
                <Search size={15} aria-hidden />
                <span className="sr-only">Filter transaction patterns</span>
                <input
                  value={patternFilter}
                  onChange={(event) => setPatternFilter(event.target.value)}
                  placeholder="Filter patterns"
                />
              </label>
              <div className="insight-list">
                {visiblePatterns.map((pattern) => (
                  <PatternButton
                    key={pattern.id}
                    pattern={pattern}
                    selected={selectedPattern.id === pattern.id}
                    onSelect={() => setSelectedPatternId(pattern.id)}
                  />
                ))}
              </div>
            </Panel>

            <Panel
              title="Financial Memory"
              className="memory-panel"
              action="View full memory"
              control={
                <div className="memory-controls">
                  <select value={selectedMemoryId} onChange={(event) => setSelectedMemoryId(event.target.value)}>
                    {memories.map((memory) => (
                      <option key={memory.id} value={memory.id}>
                        {memory.month}
                      </option>
                    ))}
                  </select>
                  <ChevronLeft size={16} aria-hidden />
                  <ChevronRight size={16} aria-hidden />
                </div>
              }
            >
              <p className="memory-summary">{selectedMemory.summary}</p>
              <div className="memory-list">
                {selectedMemory.entries.map((entry) => (
                  <div key={`${selectedMemory.id}-${entry.label}`}>
                    <span className="memory-icon">
                      <FileText size={15} aria-hidden />
                    </span>
                    <div>
                      <strong>{entry.label}</strong>
                      <p>{entry.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Calm Forecast" action="View full forecast" className="forecast-panel">
              <h3>Upcoming recurring bills</h3>
              <div className="forecast-list">
                {forecastItems
                  .filter((item) => item.kind === "bill")
                  .map((item) => (
                    <div key={item.id}>
                      <span>{item.date}</span>
                      <strong>{item.label}</strong>
                      <em>{currency.format(Math.abs(item.amount))}</em>
                    </div>
                  ))}
              </div>
              <h3>Low-cash pressure windows</h3>
              <div className="pressure-list">
                {forecastItems
                  .filter((item) => item.kind === "pressure")
                  .map((item) => (
                    <div key={item.id}>
                      <span />
                      <strong>{item.date}</strong>
                      <em>(3 days)</em>
                    </div>
                  ))}
              </div>
            </Panel>

            <Panel
              title="Life Cost Map"
              className="map-panel"
              control={
                <button className="plain-control">
                  Show: 6 months
                  <ChevronDown size={15} aria-hidden />
                </button>
              }
            >
              <LifeCostMap events={ledgerData.lifeCostEvents} />
            </Panel>

            <Panel
              title="Local data"
              className="data-panel"
              control={
                <span className="privacy-chip">
                  <ShieldCheck size={14} aria-hidden />
                  Local ledger saved
                </span>
              }
            >
              <div className="data-copy">
                <strong>{storageNotice}</strong>
                <p>
                  QuietLedger stores this ledger in your browser with no bank login, no backend, and no server sync.
                  Export backups before clearing browser data or changing devices.
                </p>
                <span>Last saved: {lastSavedAt ? formatDateTime(lastSavedAt) : "Not saved in this browser yet"}</span>
              </div>
              <div className="data-actions">
                <button onClick={() => downloadLedgerExport(currentLedgerData, importedTransactions, importMetadata)}>
                  <Download size={16} aria-hidden />
                  Export JSON
                </button>
                <button onClick={() => jsonImportRef.current?.click()}>
                  <FileUp size={16} aria-hidden />
                  Import JSON backup
                </button>
                <button onClick={resetToDemoData}>
                  <Archive size={16} aria-hidden />
                  Reset demo
                </button>
                <button className="danger-action" onClick={clearLocalData}>
                  <Trash2 size={16} aria-hidden />
                  Clear local data
                </button>
                <input ref={jsonImportRef} type="file" accept=".json,application/json" onChange={handleJsonBackup} />
              </div>
            </Panel>

            <Panel
              title="CSV import"
              action={parsedCsv ? undefined : "No bank login required"}
              className="import-panel"
              control={
                <span className="privacy-chip">
                  <ShieldCheck size={14} aria-hidden />
                  Browser-only parsing
                </span>
              }
            >
              <div className="import-intro">
                <div>
                  <strong>Bring your bank export, not your bank login.</strong>
                  <p>CSV parsing happens locally in this browser. In local mode, transaction data does not leave this device.</p>
                </div>
                <label className="file-picker">
                  <Upload size={16} aria-hidden />
                  Select CSV
                  <input type="file" accept=".csv,text/csv" onChange={handleCsvFile} />
                </label>
              </div>

              <div className="import-status">
                <CheckCircle2 size={15} aria-hidden />
                <span>{importNotice}</span>
              </div>

              {parsedCsv ? (
                <CsvImportPreview
                  headers={parsedCsv.headers}
                  mapping={csvMapping}
                  onMappingChange={(field, header) =>
                    setCsvMapping((current) => ({ ...current, [field]: header || undefined }))
                  }
                  defaultAccountId={defaultImportAccountId}
                  onDefaultAccountChange={setDefaultImportAccountId}
                  accounts={accounts}
                  rows={importPreview}
                  validCount={validImportRows.length}
                  duplicateCount={duplicateImportRows.length}
                  errorCount={errorImportRows.length}
                  onSave={saveImportedTransactions}
                />
              ) : (
                <div className="import-empty">
                  <Columns3 size={18} aria-hidden />
                  <span>Supports headers like Date, Description, Debit, Credit, Amount, Account, Category, and Type.</span>
                </div>
              )}
            </Panel>

            <Panel title="Recent transactions" action="View all transactions" className="transactions-panel">
              <TransactionTable selectedAccount={selectedAccount} />
            </Panel>

            <Panel title="Notes" action="View all notes" className="notes-panel">
              <div className="notes-list">
                <Note date="Apr 30" text="Worked late this week. More takeout. Budget held up." />
                <Note date="Apr 21" text="Remember to review insurance coverage in May." />
                <Note date="Apr 10" text="Looking at switching internet plan next month." />
              </div>
            </Panel>
          </div>

          <section className="selection-strip" aria-label="Selected local context">
            <div>
              <Eye size={16} aria-hidden />
              <span>Viewing {activeNav}</span>
            </div>
            <div>
              <WalletCards size={16} aria-hidden />
              <span>{selectedAccount.name}: {currency.format(selectedAccount.balance)}</span>
            </div>
            <div>
              <Sparkles size={16} aria-hidden />
              <span>{selectedPattern.category}</span>
            </div>
            <div>
              <Upload size={16} aria-hidden />
              <span>{importedTransactions.length} imported</span>
            </div>
            <div>
              <ShieldCheck size={16} aria-hidden />
              <span>{lastSavedAt ? `Saved ${formatTime(lastSavedAt)}` : "Demo fallback"}</span>
            </div>
          </section>
        </section>
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
        </div>
        {rows.map((transaction) => (
          <div className="table-row" key={transaction.id}>
            <span>{formatDate(transaction.date)}</span>
            <strong>{transaction.description}</strong>
            <span>{transaction.category}</span>
            <span>{accountsWithBalances.find((account) => account.id === transaction.accountId)?.name ?? selectedAccount.name}</span>
            <em className={transaction.amount < 0 ? "negative" : "positive"}>{currency.format(transaction.amount)}</em>
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
  if (monthTransactions.length === 0 || !monthTransactions.some((transaction) => transaction.source === "csv")) return fallback;

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
