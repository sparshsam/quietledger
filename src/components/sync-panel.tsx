"use client";

/**
 * SyncPanel — Full sync status panel for the Settings / Control Room.
 *
 * Shows current sync status, Sync Now button, last synced timestamp,
 * pending changes count, sync activity history (last 10 events),
 * device list with rename/remove controls, conflict log viewer,
 * force re-sync button, and data integrity status.
 */

import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  Smartphone,
  Monitor,
  Trash2,
  Edit3,
  X,
  Check,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/auth-hook";
import {
  getSyncStatus,
  getLastSyncedAt,
  getPendingChangeCount,
  syncNow,
  fetchRemoteSyncEvents,
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
} {
  if (typeof window === "undefined") return { transactions: [], accounts: [] };
  try {
    const raw = localStorage.getItem("openledger.localLedger.v1");
    if (!raw) return { transactions: [], accounts: [] };
    const state = JSON.parse(raw);
    return {
      transactions: Array.isArray(state.transactions) ? state.transactions : [],
      accounts: Array.isArray(state.accounts) ? state.accounts : [],
    };
  } catch {
    return { transactions: [], accounts: [] };
  }
}

export function SyncPanel() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SyncStatus>(() => getSyncStatus());
  const [lastSync, setLastSync] = useState<string | null>(() => getLastSyncedAt());
  const [pending, setPending] = useState(() => getPendingChangeCount());
  const [syncing, setSyncing] = useState(false);
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Conflict log state
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [showConflictLog, setShowConflictLog] = useState(false);

  // Data integrity state
  const [duplicates, setDuplicates] = useState<number>(0);
  const [reconciliationIssues, setReconciliationIssues] = useState<number>(0);
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

  // Fetch remote data when user is available
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const load = async () => {
      const events = await fetchRemoteSyncEvents(10);
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
    const { transactions, accounts } = readLocalLedgerData();
    const dupes = findDuplicateTransactions(transactions);
    const issues = reconcileAccounts(accounts, transactions);
    setDuplicates(dupes.length);
    setReconciliationIssues(issues.length);
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
      const events = await fetchRemoteSyncEvents(10);
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
      setMessage("Force re-sync completed.");
      refresh();
      const events = await fetchRemoteSyncEvents(10);
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
    } else {
      setMessage(`Rename failed: ${result.error}`);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    const result = await removeDevice(deviceId);
    if (result.ok) {
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      setRemovingDeviceId(null);
    } else {
      setMessage(`Remove failed: ${result.error}`);
    }
  };

  const handleClearConflictLog = () => {
    clearConflictLog();
    setConflicts([]);
  };

  if (!user) {
    return (
      <div className="settings-panel-section">
        <p className="gentle-help" style={{ marginBottom: 12 }}>
          Sign in to sync your ledger data across devices.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Status summary */}
      <div className="settings-panel-section">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          {status === "syncing" ? (
            <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} />
          ) : status === "error" ? (
            <AlertCircle size={18} style={{ color: "#C0392B" }} />
          ) : (
            <Cloud size={18} style={{ color: "#2E7D32" }} />
          )}
          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
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
          <p className="gentle-help" style={{ marginBottom: 10 }}>
            Last synced: <strong>{formatTime(lastSync)}</strong>
          </p>
        ) : (
          <p className="gentle-help" style={{ marginBottom: 10 }}>
            Never synced. Your data is only stored locally.
          </p>
        )}

        <div className="settings-panel-actions">
          <button
            className="settings-panel-btn"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <>
                <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
                Syncing...
              </>
            ) : (
              <>
                <Cloud size={14} />
                Sync now
              </>
            )}
          </button>

          <button
            className="settings-panel-btn settings-panel-btn--danger"
            onClick={handleForceResync}
            disabled={syncing}
            title="Clear sync timestamp and re-sync from scratch"
          >
            <RefreshCw size={14} />
            Force re-sync
          </button>
        </div>

        {message ? (
          <p
            className="backup-notice"
            style={{
              marginTop: 10,
              color: message.includes("failed") ? "#C0392B" : "var(--text-secondary)",
            }}
          >
            {message}
          </p>
        ) : null}
      </div>

      {/* Data integrity status */}
      <div className="settings-panel-section" style={{ marginTop: 20 }}>
        <h4 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>
          Data Integrity
        </h4>
        {!integrityChecked ? (
          <p className="gentle-help">Checking...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              {duplicates > 0 ? (
                <AlertTriangle size={14} style={{ color: "#D4A72C", flexShrink: 0 }} />
              ) : (
                <CheckCircle2 size={14} style={{ color: "#2E7D32", flexShrink: 0 }} />
              )}
              <span style={{ color: "var(--text-primary)" }}>
                {duplicates > 0
                  ? `${duplicates} duplicate transaction${duplicates !== 1 ? "s" : ""} found`
                  : "No duplicate transactions"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              {reconciliationIssues > 0 ? (
                <AlertTriangle size={14} style={{ color: "#D4A72C", flexShrink: 0 }} />
              ) : (
                <CheckCircle2 size={14} style={{ color: "#2E7D32", flexShrink: 0 }} />
              )}
              <span style={{ color: "var(--text-primary)" }}>
                {reconciliationIssues > 0
                  ? `${reconciliationIssues} account${reconciliationIssues !== 1 ? "s" : ""} have balance discrepancies`
                  : "All account balances reconcile"}
              </span>
            </div>
            <button
              className="settings-panel-btn"
              onClick={runIntegrityCheck}
              style={{ marginTop: 4, alignSelf: "flex-start" }}
            >
              <RefreshCw size={12} />
              Re-check
            </button>
          </div>
        )}
      </div>

      {/* Conflict log */}
      <div className="settings-panel-section" style={{ marginTop: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <h4 style={{ fontWeight: 700, fontSize: 14 }}>
            Conflicts
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
          </h4>
          <div style={{ display: "flex", gap: 6 }}>
            {conflicts.length > 0 && (
              <button
                className="settings-panel-btn"
                onClick={handleClearConflictLog}
                style={{ fontSize: 11 }}
              >
                Clear log
              </button>
            )}
            <button
              className="settings-panel-btn"
              onClick={() => setShowConflictLog(!showConflictLog)}
              style={{ fontSize: 11 }}
            >
              {showConflictLog ? "Hide" : conflicts.length > 0 ? "View" : "View log"}
            </button>
          </div>
        </div>

        {showConflictLog && (
          <div>
            {conflicts.length === 0 ? (
              <p className="gentle-help">No conflicts recorded.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                {conflicts.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: "rgba(192, 57, 43, 0.06)",
                      border: "1px solid rgba(192, 57, 43, 0.12)",
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <ShieldAlert size={12} style={{ color: "#C0392B", flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {c.entityType}
                      </span>
                      <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
                        {c.entityId.slice(0, 12)}...
                      </span>
                    </div>
                    <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
                      {formatTime(c.timestamp)}
                    </span>
                    {c.resolution && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10,
                          color: "#8B6534",
                          background: "rgba(139, 101, 52, 0.1)",
                          padding: "1px 6px",
                          borderRadius: 999,
                        }}
                      >
                        {c.resolution}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sync activity history */}
      <div className="settings-panel-section" style={{ marginTop: 20 }}>
        <h4 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Sync Activity</h4>
        {loading ? (
          <p className="gentle-help">Loading...</p>
        ) : syncEvents.length === 0 ? (
          <p className="gentle-help">No sync events yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {syncEvents.map((evt) => (
              <div
                key={evt.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 13,
                }}
              >
                {evt.status === "completed" ? (
                  <CheckCircle2 size={14} style={{ color: "#2E7D32", flexShrink: 0 }} />
                ) : evt.status === "failed" ? (
                  <AlertCircle size={14} style={{ color: "#C0392B", flexShrink: 0 }} />
                ) : (
                  <Clock size={14} style={{ color: "#D4A72C", flexShrink: 0 }} />
                )}
                <span style={{ color: "var(--text-primary)", flex: 1 }}>
                  {evt.type === "upload" ? "Upload" : "Download"}
                  {evt.recordsCount > 0 ? ` (${evt.recordsCount} records)` : ""}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatTime(evt.startedAt)}
                </span>
                {evt.errorMessage ? (
                  <span style={{ color: "#C0392B", fontSize: 11, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {evt.errorMessage}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Device list with rename/remove controls */}
      <div className="settings-panel-section" style={{ marginTop: 20 }}>
        <h4 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Devices</h4>
        {loading ? (
          <p className="gentle-help">Loading...</p>
        ) : devices.length === 0 ? (
          <p className="gentle-help">No devices registered.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {devices.map((d) => {
              const isEditing = editingDeviceId === d.id;
              const isConfirmingRemove = removingDeviceId === d.id;
              return (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border)",
                    fontSize: 13,
                  }}
                >
                  {d.device_type === "mobile" ? (
                    <Smartphone size={16} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                  ) : (
                    <Monitor size={16} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
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
                        <Check size={14} />
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
                        <X size={14} />
                      </button>
                    </div>
                  ) : isConfirmingRemove ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                      <span style={{ fontSize: 12, color: "#C0392B" }}>
                        Remove {d.device_name}?
                      </span>
                      <button
                        onClick={() => handleRemoveDevice(d.id)}
                        style={{
                          background: "#C0392B",
                          color: "#fff",
                          border: "none",
                          borderRadius: 999,
                          padding: "2px 10px",
                          fontSize: 11,
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
                          fontSize: 11,
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

                  {d.last_sync_at ? (
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                      {formatTime(d.last_sync_at)}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Never</span>
                  )}

                  {!isEditing && !isConfirmingRemove && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={() => {
                          setEditingDeviceId(d.id);
                          setEditDeviceName(d.device_name);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 3,
                          color: "var(--text-tertiary)",
                          borderRadius: 4,
                        }}
                        title="Rename device"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => setRemovingDeviceId(d.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 3,
                          color: "#C0392B",
                          borderRadius: 4,
                        }}
                        title="Remove device"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
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
