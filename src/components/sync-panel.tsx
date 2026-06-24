"use client";

/**
 * SyncPanel — Full sync status panel for the Settings / Control Room.
 *
 * Shows current sync status, Sync Now button, last synced timestamp,
 * pending changes count, sync activity history (last 10 events),
 * and device list with names and last_seen timestamps.
 */

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Cloud, CheckCircle2, AlertCircle, Clock, Smartphone, Monitor } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/auth-hook";
import {
  getSyncStatus,
  getLastSyncedAt,
  getPendingChangeCount,
  syncNow,
  fetchRemoteSyncEvents,
} from "@/lib/sync/sync-engine";
import type { SyncStatus, SyncEvent } from "@/lib/sync/sync-types";

type DeviceRow = {
  id: string;
  device_name: string;
  device_type: string | null;
  device_id: string;
  last_sync_at: string | null;
  created_at: string;
};

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
        setLoading(false);
      }
    };

    load();

    return () => { cancelled = true; };
  }, [user]);

  const handleSync = async () => {
    if (syncing || !user) return;
    setSyncing(true);
    setMessage(null);
    setStatus("syncing");

    const result = await syncNow();
    if (result.ok) {
      setMessage("Sync completed successfully.");
      refresh();

      // Re-fetch events and devices
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
      setMessage(`Sync failed: ${result.error}`);
    }
    setSyncing(false);
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

      {/* Device list */}
      <div className="settings-panel-section" style={{ marginTop: 20 }}>
        <h4 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Devices</h4>
        {loading ? (
          <p className="gentle-help">Loading...</p>
        ) : devices.length === 0 ? (
          <p className="gentle-help">No devices registered.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {devices.map((d) => (
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
                <div style={{ flex: 1 }}>
                  <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                    {d.device_name}
                  </span>
                </div>
                {d.last_sync_at ? (
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                    {formatTime(d.last_sync_at)}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Never</span>
                )}
              </div>
            ))}
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
