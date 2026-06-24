"use client";

// Dynamic — render depends on auth state and sync data
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import {
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Smartphone,
  Monitor,
  ArrowLeft,
  Edit3,
  Trash2,
  Check,
  X,
  ShieldAlert,
  AlertTriangle,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { useAuth } from "@/lib/supabase/auth-hook";
import { createClient } from "@/lib/supabase/client";
import {
  getSyncStatus,
  getLastSyncedAt,
  getPendingChangeCount,
  syncNow,
  fetchRemoteSyncEvents,
  getSyncDiagnostics,
  getConflictLog,
  clearConflictLog,
  renameDevice,
  removeDevice,
  forceResync,
} from "@/lib/sync/sync-engine";
import type { SyncStatus, SyncEvent, ConflictRecord } from "@/lib/sync/sync-types";
import {
  findDuplicateTransactions,
  reconcileAccounts,
  verifyBackupPayload,
} from "@/lib/finance/validation";
import type { Transaction, Account } from "@/lib/data/types";

type DeviceRow = {
  id: string;
  device_name: string;
  device_type: string | null;
  device_id: string;
  last_sync_at: string | null;
  created_at: string;
};

function readLocalLedgerData(): {
  transactions: Transaction[];
  accounts: Account[];
  raw: unknown;
} {
  if (typeof window === "undefined") return { transactions: [], accounts: [], raw: null };
  try {
    const raw = localStorage.getItem("openledger.localLedger.v1");
    if (!raw) return { transactions: [], accounts: [], raw: null };
    const state = JSON.parse(raw);
    return {
      transactions: Array.isArray(state.transactions) ? state.transactions : [],
      accounts: Array.isArray(state.accounts) ? state.accounts : [],
      raw: state,
    };
  } catch {
    return { transactions: [], accounts: [], raw: null };
  }
}

export default function SyncPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SyncStatus>(() => getSyncStatus());
  const [lastSync, setLastSync] = useState<string | null>(() => getLastSyncedAt());
  const [pending, setPending] = useState(() => getPendingChangeCount());
  const [syncing, setSyncing] = useState(false);
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Diagnostics
  const [diagnostics, setDiagnostics] = useState<{
    lastSync: string | null;
    pendingChanges: number;
    deviceCount: number;
    remoteEventCount: number;
    syncEvents: SyncEvent[];
    conflicts: ConflictRecord[];
  } | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Conflict log
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);

  // Data integrity
  const [duplicates, setDuplicates] = useState<Array<{ original: Transaction; duplicate: Transaction; reason: string }>>([]);
  const [reconciliationIssues, setReconciliationIssues] = useState<Array<{
    account: Account;
    calculatedBalance: number;
    declaredBalance: number;
    difference: number;
  }>>([]);
  const [backupValid, setBackupValid] = useState<boolean | null>(null);
  const [integrityChecked, setIntegrityChecked] = useState(false);

  // Device rename state
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editDeviceName, setEditDeviceName] = useState("");

  // Device removal confirmation
  const [removingDeviceId, setRemovingDeviceId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setStatus(getSyncStatus());
    setLastSync(getLastSyncedAt());
    setPending(getPendingChangeCount());
  }, []);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const load = async () => {
      const events = await fetchRemoteSyncEvents(20);
      if (cancelled) return;
      setSyncEvents(events);

      const supabase = createClient();
      const { data: deviceData } = await supabase
        .from("openledger_devices")
        .select("id, device_name, device_type, device_id, last_sync_at, created_at")
        .eq("user_id", user.id)
        .order("last_sync_at", { ascending: false });

      if (!cancelled) {
        if (deviceData) setDevices(deviceData as DeviceRow[]);
        setConflicts(getConflictLog());
        setLoading(false);
        runIntegrityCheck();
      }
    };

    load();

    return () => { cancelled = true; };
  }, [user]);

  function runIntegrityCheck() {
    const { transactions, accounts, raw } = readLocalLedgerData();
    const dupes = findDuplicateTransactions(transactions);
    const issues = reconcileAccounts(accounts, transactions);
    setDuplicates(dupes);
    setReconciliationIssues(issues);
    setBackupValid(raw ? verifyBackupPayload(raw).valid : null);
    setIntegrityChecked(true);
  }

  const handleSync = async () => {
    if (syncing || !user) return;
    setSyncing(true);
    setMessage(null);
    setStatus("syncing");

    const result = await syncNow();
    if (result.ok) {
      setMessage("Sync completed successfully.");
      refresh();
      const events = await fetchRemoteSyncEvents(20);
      setSyncEvents(events);
      const supabase = createClient();
      const { data: deviceData } = await supabase
        .from("openledger_devices")
        .select("id, device_name, device_type, device_id, last_sync_at, created_at")
        .eq("user_id", user.id)
        .order("last_sync_at", { ascending: false });
      if (deviceData) setDevices(deviceData as DeviceRow[]);
      setConflicts(getConflictLog());
    } else {
      setStatus("error");
      setMessage(`Sync failed: ${result.error}`);
    }
    setSyncing(false);
  };

  const handleForceResync = async () => {
    if (syncing || !user) return;
    setSyncing(true);
    setMessage(null);
    setStatus("syncing");

    const result = await forceResync();
    if (result.ok) {
      setMessage("Force re-sync completed successfully.");
      refresh();
      const events = await fetchRemoteSyncEvents(20);
      setSyncEvents(events);
      const supabase = createClient();
      const { data: deviceData } = await supabase
        .from("openledger_devices")
        .select("id, device_name, device_type, device_id, last_sync_at, created_at")
        .eq("user_id", user.id)
        .order("last_sync_at", { ascending: false });
      if (deviceData) setDevices(deviceData as DeviceRow[]);
    } else {
      setStatus("error");
      setMessage(`Force re-sync failed: ${result.error}`);
    }
    setSyncing(false);
  };

  const handleLoadDiagnostics = async () => {
    const diag = await getSyncDiagnostics();
    setDiagnostics(diag);
    setShowDiagnostics(!showDiagnostics);
  };

  const handleRenameDevice = async (deviceId: string) => {
    const result = await renameDevice(deviceId, editDeviceName);
    if (result.ok) {
      setDevices((prev) =>
        prev.map((d) =>
          d.id === deviceId ? { ...d, device_name: editDeviceName } : d,
        ),
      );
      setEditingDeviceId(null);
      setEditDeviceName("");
      setMessage(null);
    } else {
      setMessage(`Rename failed: ${result.error}`);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    const result = await removeDevice(deviceId);
    if (result.ok) {
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      setRemovingDeviceId(null);
      setMessage(null);
    } else {
      setMessage(`Remove failed: ${result.error}`);
    }
  };

  const handleClearConflictLog = () => {
    clearConflictLog();
    setConflicts([]);
  };

  return (
    <>
      <PublicHeader />

      <main
        style={{
          width: "100%",
          maxWidth: 720,
          margin: "0 auto",
          padding: "48px var(--space-lg) 80px",
        }}
        className="narrow"
      >
        {/* Back link */}
        <Link
          href="/app"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--text-secondary)",
            textDecoration: "none",
            marginBottom: 24,
          }}
        >
          <ArrowLeft size={14} />
          Back to Ledger
        </Link>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 8,
          }}
        >
          Cloud Sync
        </h1>
        <p className="gentle-help" style={{ marginBottom: 32 }}>
          Sync your ledger data across devices. Sync is always manual &mdash; your data never leaves
          without your permission.
        </p>

        {!user ? (
          <div
            style={{
              padding: 24,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              textAlign: "center",
            }}
          >
            <Cloud size={32} style={{ color: "var(--text-tertiary)", marginBottom: 12 }} />
            <p className="gentle-help" style={{ marginBottom: 4 }}>
              Sign in with Google to use cloud sync.
            </p>
            <p className="gentle-help">
              Your data is always stored locally first. Sync is optional and manually triggered.
            </p>
          </div>
        ) : (
          <>
            {/* Status card */}
            <div
              style={{
                padding: 20,
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                marginBottom: 24,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                {status === "syncing" ? (
                  <RefreshCw size={20} style={{ animation: "spin 1s linear infinite", color: "var(--warning)" }} />
                ) : status === "error" ? (
                  <AlertCircle size={20} style={{ color: "var(--negative)" }} />
                ) : (
                  <Cloud size={20} style={{ color: pending > 0 ? "var(--accent)" : "var(--positive)" }} />
                )}
                <span style={{ fontWeight: 600, fontSize: 16, color: "var(--text-primary)" }}>
                  {status === "syncing"
                    ? "Syncing..."
                    : status === "error"
                      ? "Sync error"
                      : pending > 0
                        ? `${pending} unsaved change${pending !== 1 ? "s" : ""}`
                        : "Up to date"}
                </span>
              </div>

              {lastSync ? (
                <p className="gentle-help" style={{ marginBottom: 14 }}>
                  Last synced: <strong>{formatTime(lastSync)}</strong>
                </p>
              ) : (
                <p className="gentle-help" style={{ marginBottom: 14 }}>
                  Never synced. Your data is only stored locally on this device.
                </p>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 24px",
                    borderRadius: 999,
                    border: "none",
                    background: syncing ? "var(--border)" : "var(--accent)",
                    color: syncing ? "var(--text-tertiary)" : "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: syncing ? "default" : "pointer",
                    transition: "opacity 0.15s",
                  }}
                >
                  <RefreshCw
                    size={16}
                    style={syncing ? { animation: "spin 1s linear infinite" } : undefined}
                  />
                  {syncing ? "Syncing..." : "Sync now"}
                </button>

                <button
                  onClick={handleForceResync}
                  disabled={syncing}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 24px",
                    borderRadius: 999,
                    border: "1px solid rgba(192, 57, 43, 0.3)",
                    background: "transparent",
                    color: "#C0392B",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: syncing ? "default" : "pointer",
                    transition: "opacity 0.15s",
                  }}
                >
                  <RefreshCw size={16} />
                  Force re-sync
                </button>
              </div>

              {message ? (
                <p
                  style={{
                    marginTop: 12,
                    fontSize: 13,
                    color: message.includes("failed") ? "#C0392B" : "var(--text-secondary)",
                  }}
                >
                  {message}
                </p>
              ) : null}
            </div>

            {/* Data Integrity card */}
            <div
              style={{
                padding: 20,
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                marginBottom: 24,
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "var(--text-primary)" }}>
                Data Integrity
              </h2>

              {!integrityChecked ? (
                <p className="gentle-help">Checking...</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Duplicate transactions */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      {duplicates.length > 0 ? (
                        <AlertTriangle size={16} style={{ color: "#D4A72C", flexShrink: 0 }} />
                      ) : (
                        <CheckCircle2 size={16} style={{ color: "#2E7D32", flexShrink: 0 }} />
                      )}
                      <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                        Duplicate Transactions
                      </span>
                      {duplicates.length > 0 && (
                        <span
                          style={{
                            background: "#D4A72C",
                            color: "#fff",
                            borderRadius: 999,
                            padding: "1px 7px",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {duplicates.length}
                        </span>
                      )}
                    </div>
                    {duplicates.length === 0 ? (
                      <p className="gentle-help" style={{ marginLeft: 24 }}>No duplicates found.</p>
                    ) : (
                      <div style={{ marginLeft: 24, display: "flex", flexDirection: "column", gap: 4 }}>
                        {duplicates.slice(0, 5).map((d, i) => (
                          <p key={i} style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                            <strong>{d.duplicate.description}</strong> &mdash; {d.reason}
                          </p>
                        ))}
                        {duplicates.length > 5 && (
                          <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                            ...and {duplicates.length - 5} more
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Account reconciliation */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      {reconciliationIssues.length > 0 ? (
                        <AlertTriangle size={16} style={{ color: "#D4A72C", flexShrink: 0 }} />
                      ) : (
                        <CheckCircle2 size={16} style={{ color: "#2E7D32", flexShrink: 0 }} />
                      )}
                      <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                        Account Reconciliation
                      </span>
                      {reconciliationIssues.length > 0 && (
                        <span
                          style={{
                            background: "#D4A72C",
                            color: "#fff",
                            borderRadius: 999,
                            padding: "1px 7px",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {reconciliationIssues.length}
                        </span>
                      )}
                    </div>
                    {reconciliationIssues.length === 0 ? (
                      <p className="gentle-help" style={{ marginLeft: 24 }}>All account balances reconcile.</p>
                    ) : (
                      <div style={{ marginLeft: 24, display: "flex", flexDirection: "column", gap: 4 }}>
                        {reconciliationIssues.map((r, i) => (
                          <p key={i} style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                            <strong>{r.account.name}</strong>: declared {formatCurrency(r.declaredBalance)}, calculated {formatCurrency(r.calculatedBalance)} (difference: {formatCurrency(r.difference)})
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Backup payload validation */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {backupValid === true ? (
                        <CheckCircle2 size={16} style={{ color: "#2E7D32", flexShrink: 0 }} />
                      ) : backupValid === false ? (
                        <AlertCircle size={16} style={{ color: "#C0392B", flexShrink: 0 }} />
                      ) : (
                        <Clock size={16} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                      )}
                      <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                        Backup Payload
                      </span>
                    </div>
                    <p className="gentle-help" style={{ marginLeft: 24 }}>
                      {backupValid === true
                        ? "Local data structure is valid for backup."
                        : backupValid === false
                          ? "Local data structure has issues."
                          : "No backup payload to validate."}
                    </p>
                  </div>

                  <button
                    onClick={runIntegrityCheck}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 16px",
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--text-secondary)",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      alignSelf: "flex-start",
                    }}
                  >
                    <RefreshCw size={12} />
                    Re-check
                  </button>
                </div>
              )}
            </div>

            {/* Sync Diagnostics */}
            <details
              style={{
                marginBottom: 24,
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  userSelect: "none",
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleLoadDiagnostics();
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Activity size={16} />
                  Sync Diagnostics
                </div>
              </summary>

              {showDiagnostics && diagnostics && (
                <div
                  style={{
                    padding: "16px 20px",
                    border: "1px solid var(--border)",
                    borderTop: "none",
                    borderRadius: "0 0 8px 8px",
                    background: "var(--surface)",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block" }}>Last Sync</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                        {diagnostics.lastSync ? formatTime(diagnostics.lastSync) : "Never"}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block" }}>Pending Changes</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                        {diagnostics.pendingChanges}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block" }}>Registered Devices</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                        {diagnostics.deviceCount}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block" }}>Remote Sync Events</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                        {diagnostics.remoteEventCount}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block" }}>Local Sync Events</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                        {diagnostics.syncEvents.length}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block" }}>Conflicts</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: diagnostics.conflicts.length > 0 ? "#C0392B" : "var(--text-primary)" }}>
                        {diagnostics.conflicts.length}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </details>

            {/* Conflict log */}
            <div
              style={{
                padding: 20,
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                  Conflict Log
                  {conflicts.length > 0 && (
                    <span
                      style={{
                        marginLeft: 8,
                        background: "#C0392B",
                        color: "#fff",
                        borderRadius: 999,
                        padding: "1px 7px",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {conflicts.length}
                    </span>
                  )}
                </h2>
                {conflicts.length > 0 && (
                  <button
                    onClick={handleClearConflictLog}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 999,
                      border: "1px solid rgba(192, 57, 43, 0.3)",
                      background: "transparent",
                      color: "#C0392B",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Clear log
                  </button>
                )}
              </div>

              {conflicts.length === 0 ? (
                <p className="gentle-help">No conflicts recorded.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {conflicts.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: "rgba(192, 57, 43, 0.04)",
                        border: "1px solid rgba(192, 57, 43, 0.1)",
                        fontSize: 13,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <ShieldAlert size={14} style={{ color: "#C0392B", flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {c.entityType}
                        </span>
                        <code style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                          {c.entityId.slice(0, 16)}...
                        </code>
                        {c.resolution && (
                          <span
                            style={{
                              fontSize: 10,
                              color: "var(--accent)",
                              padding: "1px 6px",
                              borderRadius: 999,
                              marginLeft: "auto",
                            }}
                          >
                            {c.resolution}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                        {formatTime(c.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sync activity */}
            <div
              style={{
                padding: 20,
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                marginBottom: 24,
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "var(--text-primary)" }}>
                Sync Activity
              </h2>

              {loading ? (
                <p className="gentle-help">Loading...</p>
              ) : syncEvents.length === 0 ? (
                <p className="gentle-help">
                  No sync events yet. Click &ldquo;Sync now&rdquo; above to create your first backup.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {syncEvents.map((evt) => (
                    <div
                      key={evt.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 0",
                        borderBottom: "1px solid var(--border)",
                        fontSize: 14,
                      }}
                    >
                      {evt.status === "completed" ? (
                        <CheckCircle2 size={16} style={{ color: "#2E7D32", flexShrink: 0 }} />
                      ) : evt.status === "failed" ? (
                        <AlertCircle size={16} style={{ color: "#C0392B", flexShrink: 0 }} />
                      ) : (
                        <Clock size={16} style={{ color: "#D4A72C", flexShrink: 0 }} />
                      )}
                      <span style={{ color: "var(--text-primary)", flex: 1 }}>
                        {evt.type === "upload" ? "Upload" : "Download"}
                        {evt.recordsCount > 0 ? ` (${evt.recordsCount} records)` : ""}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                        {formatTime(evt.startedAt)}
                      </span>
                      {evt.errorMessage ? (
                        <span
                          style={{
                            color: "#C0392B",
                            fontSize: 12,
                            maxWidth: 240,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={evt.errorMessage}
                        >
                          {evt.errorMessage}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Devices with rename/remove controls */}
            <div
              style={{
                padding: 20,
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                marginBottom: 24,
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "var(--text-primary)" }}>
                Registered Devices
              </h2>

              {loading ? (
                <p className="gentle-help">Loading...</p>
              ) : devices.length === 0 ? (
                <p className="gentle-help">No devices registered yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {devices.map((d) => {
                    const isEditing = editingDeviceId === d.id;
                    const isConfirmingRemove = removingDeviceId === d.id;
                    return (
                      <div
                        key={d.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 0",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        {d.device_type === "mobile" ? (
                          <Smartphone size={18} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                        ) : (
                          <Monitor size={18} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                        )}

                        {isEditing ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                            <input
                              type="text"
                              value={editDeviceName}
                              onChange={(e) => setEditDeviceName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRenameDevice(d.id);
                                if (e.key === "Escape") { setEditingDeviceId(null); setEditDeviceName(""); }
                              }}
                              autoFocus
                              style={{
                                flex: 1,
                                padding: "4px 8px",
                                borderRadius: 6,
                                border: "1px solid var(--border)",
                                fontSize: 13,
                                background: "var(--bg)",
                                color: "var(--text-primary)",
                                outline: "none",
                                maxWidth: 200,
                              }}
                            />
                            <button
                              onClick={() => handleRenameDevice(d.id)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 2,
                                color: "#2E7D32",
                              }}
                              title="Save"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => { setEditingDeviceId(null); setEditDeviceName(""); }}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 2,
                                color: "var(--text-tertiary)",
                              }}
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : isConfirmingRemove ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                            <span style={{ fontSize: 13, color: "#C0392B" }}>
                              Remove {d.device_name}?
                            </span>
                            <button
                              onClick={() => handleRemoveDevice(d.id)}
                              style={{
                                background: "#C0392B",
                                color: "#fff",
                                border: "none",
                                borderRadius: 999,
                                padding: "3px 12px",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Remove
                            </button>
                            <button
                              onClick={() => setRemovingDeviceId(null)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 2,
                                color: "var(--text-tertiary)",
                                fontSize: 12,
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ flex: 1 }}>
                            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                              {d.device_name}
                            </span>
                          </div>
                        )}

                        {d.last_sync_at && !isEditing && !isConfirmingRemove ? (
                          <span style={{ fontSize: 12, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                            {formatTime(d.last_sync_at)}
                          </span>
                        ) : !isEditing && !isConfirmingRemove ? (
                          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Never synced</span>
                        ) : null}

                        {!isEditing && !isConfirmingRemove && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={() => {
                                setEditingDeviceId(d.id);
                                setEditDeviceName(d.device_name);
                              }}
                              style={{
                                background: "none",
                                border: "1px solid var(--border)",
                                cursor: "pointer",
                                padding: "4px 8px",
                                borderRadius: 6,
                                color: "var(--text-tertiary)",
                                fontSize: 11,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                              title="Rename device"
                            >
                              <Edit3 size={12} />
                              Rename
                            </button>
                            <button
                              onClick={() => setRemovingDeviceId(d.id)}
                              style={{
                                background: "none",
                                border: "1px solid rgba(192, 57, 43, 0.3)",
                                cursor: "pointer",
                                padding: "4px 8px",
                                borderRadius: 6,
                                color: "#C0392B",
                                fontSize: 11,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                              title="Remove device"
                            >
                              <Trash2 size={12} />
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <PublicFooter />
    </>
  );
}

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatCurrency(n: number): string {
  const abs = Math.abs(n);
  const formatted = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(abs);
  return n < 0 ? `-${formatted}` : formatted;
}
