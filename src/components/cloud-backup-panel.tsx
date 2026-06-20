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
      <div className="cloud-backup-guest">
        <p className="gentle-help">Sign in to back up your ledger to the cloud.</p>
      </div>
    );
  }

  const handleBackup = async () => {
    setLoading(true);
    setStatus("Backing up...");

    const payload: BackupPayload = {
      accounts: ledgerData.accounts,
      transactions: ledgerData.transactions,
      categories: [],
      budgets: [],
      goals: [],
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
    <div className="cloud-backup-panel">
      <div className="backup-status">
        <span className="status-dot online" />
        <strong>Cloud-ready</strong>
        <span className="auth-badge">Signed in</span>
      </div>

      {backup ? (
        <p className="backup-timestamp">
          Last backup: <strong>{formatTime(backup.created_at)}</strong>
        </p>
      ) : (
        <p className="gentle-help">No cloud backup yet.</p>
      )}

      <div className="backup-actions">
        <button className="backup-btn" onClick={handleBackup} disabled={loading}>
          {loading ? "Working..." : "Back up to cloud"}
        </button>

        {backup ? (
          <>
            <button className="restore-btn" onClick={handleRestorePreview} disabled={loading}>
              Preview & restore
            </button>
            <button className="delete-btn" onClick={handleDelete} disabled={loading}>
              Delete cloud backup
            </button>
          </>
        ) : null}
      </div>

      {status ? <p className="backup-notice">{status}</p> : null}

      {showConfirm && preview ? (
        <div className="restore-confirm">
          <h4>Restore from cloud backup?</h4>
          <p>This will replace your current local ledger data.</p>
          <ul>
            <li>{preview.accounts.length} accounts</li>
            <li>{preview.transactions.length} transactions</li>
          </ul>
          <div className="confirm-actions">
            <button className="backup-btn" onClick={handleConfirmRestore}>
              Yes, restore
            </button>
            <button
              className="delete-btn"
              onClick={() => {
                setShowConfirm(false);
                setPreview(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
