"use client";

import { createClient } from "@/lib/supabase/client";

export type BackupPayload = {
  accounts: unknown[];
  transactions: unknown[];
  categories: unknown[];
  budgets: unknown[];
  goals: unknown[];
};

export type BackupRecord = {
  id: string;
  backup_version: number;
  payload_json: BackupPayload;
  created_at: string;
};

export async function fetchLatestBackup(): Promise<BackupRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("openledger_backups")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as BackupRecord;
}

export function classifyBackupError(error: { message: string; code?: string }): "auth" | "server" | "unknown" {
  const msg = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toLowerCase();
  if (msg.includes("jwt") || msg.includes("auth") || code === "pgrst301" || code === "42501") return "auth";
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("econnrefused") || msg.includes("timeout")) return "server";
  return "unknown";
}

export async function uploadBackup(
  payload: BackupPayload,
): Promise<{ ok: true; id: string } | { ok: false; error: string; errorType: "auth" | "server" | "unknown" }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("openledger_backups")
    .insert({
      backup_version: 1,
      payload_json: payload,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message, errorType: classifyBackupError(error) };
  return { ok: true, id: data.id };
}

export async function deleteBackup(
  backupId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();

  const { error } = await supabase
    .from("openledger_backups")
    .delete()
    .eq("id", backupId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
