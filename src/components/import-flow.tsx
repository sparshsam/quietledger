"use client";

import { useState, useRef, useMemo } from "react";
import type { Account, ImportMetadata, LearnedCategory, Transaction } from "@/lib/data/types";
import { Select } from "@/components/select";
import { parseCsv, buildImportPreview, summarizeImport, type ParsedCsv, type ImportPreviewRow, type CsvMapping } from "@/lib/data/csv-import";
import { guessMapping } from "@/lib/data/csv-import";
import { autoCategorize } from "@/lib/data/categories";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

type ImportFlowProps = {
  accounts: Account[];
  transactions: Transaction[];
  learnings: LearnedCategory[];
  onImport: (txns: Transaction[], metadata: ImportMetadata) => void;
  onRecordLearning: (pattern: string, parent: string, child: string) => void;
  onClose: () => void;
};

type Step = "account" | "upload" | "review";

export function ImportFlow({ accounts, transactions, learnings, onImport, onRecordLearning, onClose }: ImportFlowProps) {
  const [step, setStep] = useState<Step>("account");
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? "");
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
  const [csvMapping, setCsvMapping] = useState<CsvMapping>({});
  const [csvFileName, setCsvFileName] = useState("");
  const [importId, setImportId] = useState("");
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => {
    if (!parsedCsv) return [];
    return buildImportPreview({
      parsed: parsedCsv, mapping: csvMapping,
      accounts: accounts.filter((a) => !a.archivedAt),
      existingTransactions: transactions,
      defaultAccountId: selectedAccountId,
      importId,
      learnings,
    });
  }, [parsedCsv, csvMapping, accounts, transactions, selectedAccountId, importId, learnings]);

  const validRows = preview.filter((r) => r.transaction && !r.duplicate);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > MAX_FILE_SIZE) { setNotice("File too large."); return; }
    const text = await file.text();
    const parsed = parseCsv(text);
    setParsedCsv(parsed);
    setCsvMapping(guessMapping(parsed.headers));
    setCsvFileName(file.name);
    setImportId(`import-${crypto.randomUUID()}`);
    setNotice(`${parsed.rows.length} rows parsed.`);
    setStep("review");
  }

  function handleCategoryChange(rowIndex: number, parent: string) {
    // Update the transaction's category in the preview
    onRecordLearning(preview[rowIndex].raw[Object.keys(preview[rowIndex].raw)[0]] || "", parent, "");
  }

  function handleImport() {
    const txns = validRows.flatMap((r) => r.transaction ? [r.transaction] : []);
    // Apply auto-categorization to each
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

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet import-sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Bring your financial life into OpenLedger</h2>

        {/* Step indicator */}
        <div className="import-steps">
          {["account", "upload", "review"].map((s, i) => (
            <div key={s} className={"import-step-dot " + (step === s ? "active" : "")}>
              <span>{i + 1}</span>
              <span className="import-step-label">{["Choose Account", "Upload", "Review"][i]}</span>
            </div>
          ))}
        </div>

        {/* Step 1: Account */}
        {step === "account" && (
          <div className="import-step-content">
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>
              Every transaction needs an account. Choose where this statement belongs.
            </p>
            <Select value={selectedAccountId} onChange={setSelectedAccountId} options={accounts.filter((a) => !a.archivedAt).map((a) => ({ value: a.id, label: a.name }))} />
            <button className="pill pill-primary" onClick={() => setStep("upload")} disabled={!selectedAccountId}>
              Continue <span style={{ marginLeft: 4 }}>→</span>
            </button>
          </div>
        )}

        {/* Step 2: Upload */}
        {step === "upload" && (
          <div className="import-step-content">
            <div className="import-dropzone" onClick={() => fileRef.current?.click()}>
              <p><strong>Upload bank statement</strong></p>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>CSV or TSV from your bank</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFile} style={{ display: "none" }} />
          </div>
        )}

        {/* Step 3: Review */}
        {step === "review" && parsedCsv && (
          <div className="import-step-content">
            {notice && <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>{notice}</p>}
            <div className="import-preview-table">
              {preview.slice(0, 50).map((row, i) => (
                <div key={i} className="import-preview-row">
                  <span style={{ minWidth: 100, fontSize: 13 }}>{row.transaction?.date ?? "—"}</span>
                  <span style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.transaction?.description ?? "—"}</span>
                  <Select
                    value={row.transaction?.category || "Misc"}
                    onChange={(e) => handleCategoryChange(i, e)}
                    options={["Food", "Housing", "Transport", "Income", "Subscriptions", "Shopping", "Health", "Debt", "Misc"].map((c) => ({ value: c, label: c }))}
                    className="import-cat-select"
                  />
                  <span style={{ minWidth: 80, textAlign: "right", fontSize: 13 }}>{row.transaction ? currency.format(row.transaction.amount) : "—"}</span>
                </div>
              ))}
              {preview.length > 50 && <p style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center" }}>… and {preview.length - 50} more</p>}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="pill pill-primary" onClick={handleImport} disabled={validRows.length === 0}>
                Import {validRows.length} transaction{validRows.length !== 1 ? "s" : ""}
              </button>
              <button className="pill pill-ghost" onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const currency = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
