export type SyncStatus = "idle" | "syncing" | "error" | "pending";

export type SyncDirection = "upload" | "download" | "both";

export type SyncEvent = {
  id: string;
  type: "upload" | "download";
  status: "pending" | "in_progress" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  recordsCount: number;
  errorMessage?: string;
};

export type ConflictRecord = {
  id: string;
  timestamp: string;
  entityType: "transaction" | "account" | "budget" | "goal";
  entityId: string;
  localVersion: unknown;
  remoteVersion: unknown;
  resolution?: "local_wins" | "remote_wins" | "manual";
  resolvedAt?: string;
};
