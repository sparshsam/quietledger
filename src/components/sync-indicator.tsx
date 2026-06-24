"use client";

/**
 * SyncIndicator — Compact pill-style status widget for the app header.
 *
 * Shows sync status as a coloured dot, "Sync now" button,
 * last synced timestamp, and pending change count.
 */

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/supabase/auth-hook";
import {
  getSyncStatus,
  getLastSyncedAt,
  getPendingChangeCount,
  syncNow,
} from "@/lib/sync/sync-engine";
import type { SyncStatus } from "@/lib/sync/sync-types";

export function SyncIndicator() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SyncStatus>(() => getSyncStatus());
  const [lastSync, setLastSync] = useState<string | null>(() => getLastSyncedAt());
  const [pending, setPending] = useState(() => getPendingChangeCount());
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setStatus(getSyncStatus());
    setLastSync(getLastSyncedAt());
    setPending(getPendingChangeCount());
  }, []);

  // Subscribe to visibility changes to refresh status when user returns
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refresh]);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setError(null);
    setStatus("syncing");
    const result = await syncNow();
    if (result.ok) {
      refresh();
    } else {
      setStatus("error");
      setError(result.error);
    }
    setSyncing(false);
  };

  if (!user) return null;

  const dotColor =
    status === "syncing"
      ? "#D4A72C"
      : status === "error"
        ? "#C0392B"
        : status === "pending"
          ? "#8B6534"
          : "#2E7D32";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 12px 4px 8px",
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        fontSize: 12,
        lineHeight: 1,
        cursor: "default",
        userSelect: "none",
      }}
      title={error ?? undefined}
    >
      {/* Status dot */}
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: dotColor,
          display: "inline-block",
          flexShrink: 0,
          animation: status === "syncing" ? "pulse 1.5s ease-in-out infinite" : undefined,
        }}
      />

      {/* Label */}
      <span style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
        {status === "syncing"
          ? "Syncing"
          : status === "error"
            ? "Error"
            : pending > 0
              ? `${pending} pending`
              : "Synced"}
      </span>

      {/* Last synced */}
      {lastSync && status !== "syncing" ? (
        <span style={{ color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
          {formatTimeShort(lastSync)}
        </span>
      ) : null}

      {/* Sync now button */}
      <button
        onClick={handleSync}
        disabled={syncing || !user}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 8px",
          borderRadius: 999,
          border: "none",
          background: syncing ? "var(--border)" : "var(--accent)",
          color: syncing ? "var(--text-tertiary)" : "#fff",
          fontSize: 11,
          fontWeight: 600,
          cursor: syncing ? "default" : "pointer",
          transition: "opacity 0.15s",
          lineHeight: "20px",
        }}
      >
        <RefreshCw size={11} style={syncing ? { animation: "spin 1s linear infinite" } : undefined} />
        {syncing ? "..." : "Sync"}
      </button>
    </div>
  );
}

function formatTimeShort(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return new Intl.DateTimeFormat("en-CA", {
      month: "short",
      day: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}
