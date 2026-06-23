"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import {
  fetchLatestBackup,
  uploadBackup,
  deleteBackup,
  type BackupRecord,
  type BackupPayload,
} from "@/lib/supabase/backup";

type Props = {
  user: User | null;
  ledgerData: {
    accounts: unknown[];
    transactions: unknown[];
    budgets?: unknown[];
    goals?: unknown[];
  };
  onRestore: (payload: BackupPayload) => void;
};

export function CloudBackupPanel({ user, ledgerData, onRestore }: Props) {
  const [backup, setBackup] = useState<BackupRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [preview, setPreview] = useState<BackupPayload | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchLatestBackup().then((b) => {
      if (!cancelled) setBackup(b);
    });
    return () => { cancelled = true; };
  }, [user]);

  if (!user) {
    return (
      <p className="gentle-help">Sign in to back up your ledger to the cloud.</p>
    );
  }

  const handleBackup = async () => {
    setLoading(true);
    setStatus("Backing up...");

    const payload: BackupPayload = {
      accounts: ledgerData.accounts,
      transactions: ledgerData.transactions,
      categories: [],
      budgets: ledgerData.budgets ?? [],
      goals: ledgerData.goals ?? [],
    };

    const result = await uploadBackup(payload);
    if (result.ok) {
      setStatus("Backup saved to cloud.");
      const updated = await fetchLatestBackup();
      setBackup(updated);
    } else {
      setStatus(`Backup failed: ${result.error}`);
    }
    setLoading(false);
  };

  const handleRestorePreview = () => {
    if (!backup) return;
    setPreview(backup.payload_json);
    setShowConfirm(true);
  };

  const handleConfirmRestore = () => {
    if (!preview) return;
    onRestore(preview);
    setShowConfirm(false);
    setPreview(null);
    setStatus("Local data restored from cloud backup.");
  };

  const handleDelete = async () => {
    if (!backup) return;
    setLoading(true);
    const result = await deleteBackup(backup.id);
    if (result.ok) {
      setBackup(null);
      setStatus("Cloud backup deleted.");
    } else {
      setStatus(`Delete failed: ${result.error}`);
    }
    setLoading(false);
  };

  const formatTime = (ts: string) =>
    new Intl.DateTimeFormat("en-CA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ts));

  return (
    <div>
      <div className="settings-panel-section">
        {backup ? (
          <p className="gentle-help" style={{ marginBottom: 12 }}>
            Last backup: <strong>{formatTime(backup.created_at)}</strong>
          </p>
        ) : (
          <p className="gentle-help" style={{ marginBottom: 12 }}>No cloud backup yet.</p>
        )}

        <div className="settings-panel-actions">
          <button className="settings-panel-btn" onClick={handleBackup} disabled={loading}>
            {loading ? "Working..." : "Back up to cloud"}
          </button>

          {backup ? (
            <>
              <button className="settings-panel-btn settings-panel-btn-danger" onClick={handleRestorePreview} disabled={loading}>
                Preview & restore
              </button>
              <button className="settings-panel-btn settings-panel-btn-danger" onClick={handleDelete} disabled={loading}>
                Delete cloud backup
              </button>
            </>
          ) : null}
        </div>

        {status ? <p className="backup-notice" style={{ marginTop: 10 }}>{status}</p> : null}
      </div>

      {showConfirm && preview ? (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
          <h4 style={{ fontWeight: 700, marginBottom: 8 }}>Restore from cloud backup?</h4>
          <p className="gentle-help" style={{ marginBottom: 8 }}>This will replace your current local ledger data.</p>
          <ul style={{ marginBottom: 12, paddingLeft: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
            <li>{preview.accounts.length} accounts</li>
            <li>{preview.transactions.length} transactions</li>
            <li>{preview.budgets?.length ?? 0} budgets</li>
            <li>{preview.goals?.length ?? 0} goals</li>
          </ul>
          <div className="settings-panel-actions">
            <button className="settings-panel-btn" onClick={handleConfirmRestore}>Yes, restore</button>
            <button className="settings-panel-btn settings-panel-btn-danger" onClick={() => { setShowConfirm(false); setPreview(null); }}>Cancel</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
