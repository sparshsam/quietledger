"use client";

import { useState, useRef } from "react";
import { Download, FileUp, FileText, Trash2, Archive } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import {
  downloadLedgerExport,
  downloadCsvExport,
} from "@/lib/data/export";
import type { Account, Transaction, ImportMetadata, Budget, Goal } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/client";

type LedgerData = {
  accounts: Account[];
  transactions: Transaction[];
  importMetadata: ImportMetadata[];
  budgets: Budget[];
  goals: Goal[];
};

type Props = {
  user: User | null;
  ledgerData: LedgerData;
  onResetToDemo: () => void;
  onClearLocal: () => void;
};

export function DataManagementPanel({ user, ledgerData, onResetToDemo, onClearLocal }: Props) {
  const [cloudStatus, setCloudStatus] = useState("");
  const [deleting, setDeleting] = useState(false);
  const jsonImportRef = useRef<HTMLInputElement | null>(null);

  const handleExportJson = () => {
    downloadLedgerExport(
      ledgerData as unknown as Parameters<typeof downloadLedgerExport>[0],
      undefined,
      ledgerData.importMetadata,
    );
  };

  const handleExportCsv = () => {
    downloadCsvExport(ledgerData.accounts, ledgerData.transactions);
  };

  const handleDeleteAllCloudData = async () => {
    if (!user) return;
    if (!window.confirm(
      "Delete ALL your cloud data from OpenLedger?\n\n" +
      "This will permanently remove all backups and synced data from the server. " +
      "Your local data will not be affected.\n\n" +
      "This action cannot be undone."
    )) return;

    setDeleting(true);
    setCloudStatus("Deleting cloud data...");

    try {
      const supabase = createClient();

      // Delete from all openledger_ tables for this user
      const tables = [
        "openledger_backups",
        "openledger_transactions",
        "openledger_accounts",
        "openledger_budgets",
        "openledger_goals",
        "openledger_imports",
        "openledger_audit_events",
      ];

      let deleted = 0;
      let errors = 0;

      for (const table of tables) {
        const { error } = await supabase.from(table).delete().neq("user_id", user.id);
        // If the table doesn't have a user_id RLS policy that works, try id-based
        if (error) {
          // Try backup table pattern (backups use eq on id, not user_id)
          if (table === "openledger_backups") {
            const { error: delErr } = await supabase.from(table).delete().not("id", "is", null);
            if (!delErr) deleted++;
            else errors++;
          } else {
            errors++;
          }
        } else {
          deleted++;
        }
      }

      setCloudStatus(`Cloud data deleted (${deleted} tables). Errors on ${errors} tables.`);
    } catch {
      setCloudStatus("Failed to delete cloud data. Try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="settings-panel-section">
        <h4 className="settings-panel-heading">Export</h4>
        <p className="gentle-help" style={{ marginBottom: 12 }}>
          Download your full ledger. All data is exported from your browser — nothing is sent to a server.
        </p>
        <div className="settings-panel-actions">
          <button onClick={handleExportJson} className="settings-panel-btn">
            <FileText size={14} aria-hidden />
            Export JSON
          </button>
          <button onClick={handleExportCsv} className="settings-panel-btn">
            <FileText size={14} aria-hidden />
            Export CSV
          </button>
        </div>
      </div>

      <div className="settings-panel-divider" />

      <div className="settings-panel-section">
        <h4 className="settings-panel-heading">Restore &amp; Reset</h4>
        <p className="gentle-help" style={{ marginBottom: 12 }}>
          Import a previous JSON backup or reset to the demo ledger.
        </p>
        <div className="settings-panel-actions">
          <button onClick={() => jsonImportRef.current?.click()} className="settings-panel-btn">
            <FileUp size={14} aria-hidden />
            Import JSON
          </button>
          <button onClick={onResetToDemo} className="settings-panel-btn">
            <Archive size={14} aria-hidden />
            Reset to demo
          </button>
          <input ref={jsonImportRef} type="file" accept=".json,application/json" style={{ display: "none" }} />
        </div>
      </div>

      <div className="settings-panel-divider" />

      <div className="settings-panel-section">
        <h4 className="settings-panel-heading">Delete Data</h4>

        <div className="settings-panel-actions">
          <button className="settings-panel-btn settings-panel-btn-danger" onClick={onClearLocal}>
            <Trash2 size={14} aria-hidden />
            Clear local data
          </button>

          {user ? (
            <button
              className="settings-panel-btn settings-panel-btn-danger"
              onClick={handleDeleteAllCloudData}
              disabled={deleting}
            >
              <Trash2 size={14} aria-hidden />
              {deleting ? "Deleting..." : "Delete cloud data"}
            </button>
          ) : null}
        </div>

        {cloudStatus ? (
          <p className="backup-notice" style={{ marginTop: 10 }}>{cloudStatus}</p>
        ) : null}

        {!user ? (
          <p className="gentle-help" style={{ marginTop: 10 }}>
            Sign in to manage cloud data.
          </p>
        ) : null}
      </div>
    </div>
  );
}
