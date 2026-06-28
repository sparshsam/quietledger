"use client";

import { useState, useRef, useMemo } from "react";
import type { Account, ImportMetadata, LearnedCategory, Transaction } from "@/lib/data/types";
import { Select } from "@/components/select";
import { parseCsv, buildImportPreview, summarizeImport, buildImportSession, type ParsedCsv, type CsvMapping } from "@/lib/data/csv-import";
import { guessMapping } from "@/lib/data/csv-import";
import { autoCategorize } from "@/lib/data/categories";
import { formatCurrency, formatWithCurrency, formatConversionLine } from "@/lib/finance/currency";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

type ImportFlowProps = {
  accounts: Account[];
  transactions: Transaction[];
  learnings: LearnedCategory[];
  /** Base currency for conversion display (defaults to USDC) */
  baseCurrency?: string;
  onImport: (txns: Transaction[], metadata: ImportMetadata) => void;
  onRecordLearning: (pattern: string, parent: string, child: string) => void;
  onClose: () => void;
};

type Step = "account" | "upload" | "review";
const STEP_ORDER: Step[] = ["account", "upload", "review"];

export function ImportFlow({
  accounts,
  transactions,
  learnings,
  baseCurrency = "USDC",
  onImport,
  onRecordLearning,
  onClose,
}: ImportFlowProps) {
  const [step, setStep] = useState<Step>("account");
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? "");
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
  const [csvMapping, setCsvMapping] = useState<CsvMapping>({});
  const [csvFileName, setCsvFileName] = useState("");
  const [importId, setImportId] = useState("");
  const [notice, setNotice] = useState("");
  const [animating, setAnimating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const stepIdx = STEP_ORDER.indexOf(step);

  const preview = useMemo(() => {
    if (!parsedCsv) return [];
    return buildImportPreview({
      parsed: parsedCsv,
      mapping: csvMapping,
      accounts: accounts.filter((a) => !a.archivedAt),
      existingTransactions: transactions,
      defaultAccountId: selectedAccountId,
      importId,
      learnings,
      baseCurrency,
    });
  }, [parsedCsv, csvMapping, accounts, transactions, selectedAccountId, importId, learnings, baseCurrency]);

  const validRows = preview.filter((r) => r.transaction && !r.duplicate);

  // Detect unique currencies in preview
  const currenciesInPreview = useMemo(() => {
    const currencies = new Set<string>();
    for (const row of preview) {
      if (row.detectedCurrency) currencies.add(row.detectedCurrency);
    }
    return [...currencies];
  }, [preview]);

  function transitionTo(next: Step) {
    setAnimating(true);
    setTimeout(() => {
      setStep(next);
      setAnimating(false);
    }, 120);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > MAX_FILE_SIZE) {
      setNotice("File too large. Maximum 50 MB.");
      return;
    }
    const text = await file.text();
    const parsed = parseCsv(text);
    setParsedCsv(parsed);
    setCsvMapping(guessMapping(parsed.headers, parsed.detectedFormat));
    setCsvFileName(file.name);
    setImportId(`import-${crypto.randomUUID()}`);
    setNotice(
      `${parsed.rows.length} rows parsed.` +
        (parsed.detectedFormat && parsed.detectedFormat.id !== "generic-csv"
          ? ` Detected format: ${parsed.detectedFormat.name}.`
          : "") +
        (parsed.detectedCurrency ? ` Detected currency: ${parsed.detectedCurrency}.` : ""),
    );
    transitionTo("review");
  }

  function handleCategoryChange(rowIndex: number, parent: string) {
    const row = preview[rowIndex];
    const rawKeys = Object.keys(row.raw);
    onRecordLearning(row.raw[rawKeys[0]] || "", parent, "");
  }

  function handleImport() {
    const txns = validRows.flatMap((r) => (r.transaction ? [r.transaction] : []));
    const categorized = txns.map((t) => {
      const result = autoCategorize(t.description, learnings);
      if (result) {
        t.category = result.parent;
        t.subcategory = result.child;
      }
      return t;
    });
    const metadata = summarizeImport(csvFileName, importId, preview);
    onImport(categorized, metadata);
  }

  function handleDropZoneClick() {
    fileRef.current?.click();
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const input = fileRef.current;
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  }

  // Summary stats
  const totalAmount = validRows.reduce((sum, r) => sum + (r.transaction?.amount ?? 0), 0);
  const expenseCount = validRows.filter((r) => (r.transaction?.amount ?? 0) < 0).length;
  const incomeCount = validRows.filter((r) => (r.transaction?.amount ?? 0) > 0).length;
  const duplicateCount = preview.filter((r) => r.duplicate).length;
  const errorCount = preview.filter(hasErrorRow).length;

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="import-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="import-header">
          <h2 className="import-title">Bring your financial life into OpenLedger</h2>
          <p className="import-subtitle">
            Import your bank statement, review the detected transactions, and begin understanding where your money goes.
          </p>
        </div>

        {/* Step indicator */}
        <div className="import-progress">
          {STEP_ORDER.map((s, i) => (
            <div
              key={s}
              className={
                "import-progress-step" +
                (i <= stepIdx ? " completed" : "") +
                (i === stepIdx ? " active" : "") +
                (i === STEP_ORDER.length - 1 ? " last" : "")
              }
            >
              <div className="import-progress-circle">
                {i < stepIdx ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span className="import-progress-label">
                {["Choose Account", "Upload Statement", "Review & Import"][i]}
              </span>
              {i < STEP_ORDER.length - 1 && <div className="import-progress-line" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className={"import-body" + (animating ? " fade" : "")}>
          {/* Step 1: Choose Account */}
          {step === "account" && (
            <div className="import-step">
              <p className="import-step-desc">
                Every transaction belongs to an account. Select where this statement should go.
              </p>

              <div className="import-field">
                <label className="import-field-label">Account</label>
                <Select
                  value={selectedAccountId}
                  onChange={setSelectedAccountId}
                  options={accounts
                    .filter((a) => !a.archivedAt)
                    .map((a) => ({ value: a.id, label: a.name }))}
                  className="import-field-select"
                />
              </div>

              <div className="import-info">
                <p>• Your transactions stay private and local</p>
                <p>• You can review everything before importing</p>
                <p>• Multi-currency and international formats supported</p>
              </div>

              <div className="import-footer">
                <button
                  className="import-btn-primary"
                  onClick={() => transitionTo("upload")}
                  disabled={!selectedAccountId}
                >
                  Continue
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
                <button className="import-btn-ghost" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Upload */}
          {step === "upload" && (
            <div className="import-step">
              <p className="import-step-desc">
                Drop your bank export file below. We accept CSV and TSV formats from banks worldwide.
              </p>

              <div
                className="import-dropzone"
                onClick={handleDropZoneClick}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleDropZoneClick();
                  }
                }}
              >
                <div className="import-dropzone-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p className="import-dropzone-title">Drop your bank statement here</p>
                <p className="import-dropzone-sub">or choose a file to upload</p>
                <div className="import-dropzone-formats">
                  <span>CSV</span>
                  <span>TSV</span>
                  <span>International formats</span>
                </div>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFile}
                style={{ display: "none" }}
              />

              <div className="import-footer" style={{ justifyContent: "center" }}>
                <button className="import-btn-ghost" onClick={() => transitionTo("account")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Import */}
          {step === "review" && parsedCsv && (
            <div className="import-step">
              <p className="import-step-desc">
                {notice ||
                  `${preview.length} transactions detected from "${csvFileName}". Review before importing.`}
              </p>

              {/* Summary strip */}
              {validRows.length > 0 && (
                <div className="import-summary-row">
                  <div className="import-summary-stat">
                    <span className="import-summary-label">Total</span>
                    <span className="import-summary-value">
                      {formatWithCurrency(totalAmount, baseCurrency)}
                    </span>
                  </div>
                  <div className="import-summary-stat">
                    <span className="import-summary-label">Expenses</span>
                    <span className="import-summary-value negative">
                      {expenseCount} txns
                    </span>
                  </div>
                  <div className="import-summary-stat">
                    <span className="import-summary-label">Income</span>
                    <span className="import-summary-value positive">
                      {incomeCount} txns
                    </span>
                  </div>
                  {currenciesInPreview.length > 0 && (
                    <div className="import-summary-stat">
                      <span className="import-summary-label">Currencies</span>
                      <span className="import-summary-value">
                        {currenciesInPreview.join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Currency detection notice */}
              {currenciesInPreview.length > 0 &&
                currenciesInPreview.some((c) => c !== baseCurrency) && (
                  <p className="import-currency-notice">
                    🌐 Transactions in{" "}
                    {currenciesInPreview.filter((c) => c !== baseCurrency).join(", ")}{" "}
                    will be converted to {baseCurrency} for display.
                  </p>
                )}

              {/* Preview table */}
              <div className="import-review-table">
                <div className="import-review-header">
                  <span className="import-review-hdr">Date</span>
                  <span className="import-review-hdr">Description</span>
                  <span className="import-review-hdr">Currency</span>
                  <span className="import-review-hdr">Category</span>
                  <span className="import-review-hdr">Amount</span>
                  <span className="import-review-hdr"></span>
                </div>
                {preview.slice(0, 50).map((row, i) => {
                  const hasConversion =
                    row.detectedCurrency &&
                    row.detectedCurrency !== baseCurrency;
                  return (
                    <div
                      key={i}
                      className={
                        "import-review-row" +
                        (row.duplicate ? " duplicate" : "") +
                        (hasErrorRow(row) ? " error" : "")
                      }
                    >
                      <span className="import-review-date">
                        {row.transaction?.date ?? "—"}
                      </span>
                      <span className="import-review-desc">
                        {row.transaction?.description ?? "—"}
                      </span>
                      <span className="import-review-currency">
                        {row.detectedCurrency || baseCurrency}
                      </span>
                      <Select
                        value={row.transaction?.category || "Misc"}
                        onChange={(v) => handleCategoryChange(i, v)}
                        options={[
                          "Food",
                          "Housing",
                          "Transport",
                          "Income",
                          "Subscriptions",
                          "Shopping",
                          "Health",
                          "Debt",
                          "Misc",
                        ].map((c) => ({ value: c, label: c }))}
                        className="import-review-cat"
                      />
                      <span
                        className={
                          "import-review-amt" +
                          ((row.transaction?.amount ?? 0) < 0
                            ? " negative"
                            : " positive")
                        }
                      >
                        {row.transaction
                          ? formatCurrency(row.transaction.amount, baseCurrency)
                          : "—"}
                      </span>
                      <span className="import-review-conversion">
                        {hasConversion && row.transaction
                          ? formatConversionLine(
                              row.originalAmount ?? Math.abs(row.transaction.amount),
                              row.detectedCurrency!,
                              Math.abs(row.transaction.amount),
                              baseCurrency,
                            )
                          : ""}
                      </span>
                    </div>
                  );
                })}
                {preview.length > 50 && (
                  <p className="import-review-more">
                    … and {preview.length - 50} more transactions
                  </p>
                )}
              </div>

              {/* Import summary */}
              <div className="import-summary-strip">
                <span>
                  ✅ {validRows.length} valid
                  {duplicateCount > 0
                    ? ` · ⚠️ ${duplicateCount} duplicates`
                    : ""}
                  {errorCount > 0 ? ` · ❌ ${errorCount} errors` : ""}
                </span>
              </div>

              <div className="import-footer">
                <button
                  className="import-btn-primary"
                  onClick={handleImport}
                  disabled={validRows.length === 0}
                >
                  Import {validRows.length} transaction
                  {validRows.length !== 1 ? "s" : ""}
                  <UploadIcon />
                </button>
                <button className="import-btn-ghost" onClick={() => transitionTo("upload")}>
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-component helpers
function hasErrorRow(row: { warnings: Array<{ level: string }> }) {
  return row.warnings.some((w) => w.level === "error");
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
