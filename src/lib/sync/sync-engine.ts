"use client";

/**
 * Cloud Sync Engine — v0.9.3
 *
 * Bridges local localStorage data with Supabase cloud backup.
 * Tracks sync state, logs events, and reports pending changes.
 * Designed for manual "sync now" flow — never automatic.
 */

import { createClient } from "@/lib/supabase/client";
import { uploadBackup } from "@/lib/supabase/backup";
import type { SyncStatus, SyncEvent } from "./sync-types";

const LAST_SYNC_KEY = "openledger.lastSync";
const SYNC_LOG_KEY = "openledger.syncLog";

// ── Helpers ──────────────────────────────────────────

function getLastSync(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_SYNC_KEY);
}

function setLastSync(): void {
  const now = new Date().toISOString();
  localStorage.setItem(LAST_SYNC_KEY, now);
}

function getSavedAt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("openledger.localLedger.v1");
    if (!raw) return null;
    const state = JSON.parse(raw);
    return typeof state.savedAt === "string" ? state.savedAt : null;
  } catch {
    return null;
  }
}

function getCachedSyncLog(): SyncEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SYNC_LOG_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SyncEvent[];
  } catch {
    return [];
  }
}

function setCachedSyncLog(events: SyncEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SYNC_LOG_KEY, JSON.stringify(events));
  } catch {
    // Silently fail — localStorage may be full
  }
}

function readLocalLedgerState(): {
  accounts: unknown[];
  transactions: unknown[];
  budgets: unknown[];
  goals: unknown[];
} {
  if (typeof window === "undefined") {
    return { accounts: [], transactions: [], budgets: [], goals: [] };
  }
  try {
    const raw = localStorage.getItem("openledger.localLedger.v1");
    if (!raw) return { accounts: [], transactions: [], budgets: [], goals: [] };
    const state = JSON.parse(raw);
    return {
      accounts: Array.isArray(state.accounts) ? state.accounts : [],
      transactions: Array.isArray(state.transactions) ? state.transactions : [],
      budgets: Array.isArray(state.budgets) ? state.budgets : [],
      goals: Array.isArray(state.goals) ? state.goals : [],
    };
  } catch {
    return { accounts: [], transactions: [], budgets: [], goals: [] };
  }
}

// ── Public API ───────────────────────────────────────

/**
 * Get current sync status based on last sync and local state.
 */
export function getSyncStatus(): SyncStatus {
  if (typeof window === "undefined") return "idle";
  const lastSync = getLastSync();
  if (!lastSync) return "pending";
  return "idle";
}

/**
 * Check whether there are pending (unsynced) changes.
 * Compares the ledger's savedAt timestamp to the last sync time.
 */
export function getPendingChangeCount(): number {
  const savedAt = getSavedAt();
  if (!savedAt) return 0;
  const lastSync = getLastSync();
  if (!lastSync) return 1; // never synced
  return new Date(savedAt).getTime() > new Date(lastSync).getTime() ? 1 : 0;
}

/**
 * Get the last synced ISO timestamp, or null if never synced.
 */
export function getLastSyncedAt(): string | null {
  return getLastSync();
}

/**
 * Get the sync event log (from localStorage cache + DB for remote events).
 * Returns the local cache immediately; call `fetchRemoteSyncEvents` for full history.
 */
export function getLocalSyncEvents(): SyncEvent[] {
  return getCachedSyncLog();
}

/**
 * Fetch recent sync events from the database for the signed-in user.
 */
export async function fetchRemoteSyncEvents(
  limit = 10,
): Promise<SyncEvent[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("openledger_sync_events")
    .select("id, sync_type, status, started_at, completed_at, error_message, records_synced")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  const events: SyncEvent[] = data.map((row) => ({
    id: row.id,
    type: (row.sync_type === "download" ? "download" : "upload") as "upload" | "download",
    status: (row.status === "in_progress"
      ? "in_progress"
      : row.status === "failed"
        ? "failed"
        : row.status === "pending"
          ? "pending"
          : "completed") as SyncEvent["status"],
    startedAt: row.started_at ?? new Date().toISOString(),
    completedAt: row.completed_at ?? undefined,
    recordsCount: row.records_synced ?? 0,
    errorMessage: row.error_message ?? undefined,
  }));

  return events;
}

/**
 * Run a full sync: read local state, upload to Supabase, log the event.
 * Returns true on success, false on failure (no thrown errors).
 */
export async function syncNow(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();

  // Must be signed in
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  // Get current device ID
  const { data: devices } = await supabase
    .from("openledger_devices")
    .select("id, device_id")
    .eq("user_id", user.id)
    .order("last_sync_at", { ascending: false })
    .limit(1);

  const deviceId = devices?.[0]?.device_id ?? null;

  // Insert a sync event as "in_progress"
  const now = new Date().toISOString();
  const { data: eventInsert, error: eventError } = await supabase
    .from("openledger_sync_events")
    .insert({
      user_id: user.id,
      device_id: deviceId,
      sync_type: "upload",
      status: "in_progress",
      started_at: now,
      records_synced: 0,
    })
    .select("id")
    .single();

  if (eventError || !eventInsert) {
    return { ok: false, error: eventError?.message ?? "Failed to create sync event" };
  }

  const eventId = eventInsert.id;

  // Read local state and upload
  const localState = readLocalLedgerState();
  const totalRecords =
    localState.accounts.length +
    localState.transactions.length +
    localState.budgets.length +
    localState.goals.length;

  const result = await uploadBackup({
    accounts: localState.accounts,
    transactions: localState.transactions,
    categories: [],
    budgets: localState.budgets,
    goals: localState.goals,
  });

  if (!result.ok) {
    // Mark sync event as failed
    await supabase
      .from("openledger_sync_events")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: result.error,
      })
      .eq("id", eventId);

    return { ok: false, error: result.error };
  }

  // Mark sync event as completed
  await supabase
    .from("openledger_sync_events")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      records_synced: totalRecords,
    })
    .eq("id", eventId);

  // Update device last_sync_at
  if (devices?.[0]?.id) {
    await supabase
      .from("openledger_devices")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", devices[0].id);
  }

  // Update local tracking
  setLastSync();

  // Update local sync log
  const log = getCachedSyncLog();
  log.unshift({
    id: eventId,
    type: "upload",
    status: "completed",
    startedAt: now,
    completedAt: new Date().toISOString(),
    recordsCount: totalRecords,
  });
  // Keep only last 20
  setCachedSyncLog(log.slice(0, 20));

  return { ok: true };
}

/**
 * Register the app version for sync tracking.
 */
export function getAppVersion(): string {
  if (typeof document === "undefined") return "0.9.3";
  return (
    document
      .querySelector('meta[name="application-version"]')
      ?.getAttribute("content") ?? "0.9.3"
  );
}
