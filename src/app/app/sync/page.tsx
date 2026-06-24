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
      setMessage(`Sync failed: ${result.error}`);
    }
    setSyncing(false);
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
                  <RefreshCw size={20} style={{ animation: "spin 1s linear infinite", color: "#D4A72C" }} />
                ) : status === "error" ? (
                  <AlertCircle size={20} style={{ color: "#C0392B" }} />
                ) : (
                  <Cloud size={20} style={{ color: pending > 0 ? "#8B6534" : "#2E7D32" }} />
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

            {/* Devices */}
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
                  {devices.map((d) => (
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
                      <div style={{ flex: 1 }}>
                        <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                          {d.device_name}
                        </span>
                      </div>
                      {d.last_sync_at ? (
                        <span style={{ fontSize: 12, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                          {formatTime(d.last_sync_at)}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Never synced</span>
                      )}
                    </div>
                  ))}
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
