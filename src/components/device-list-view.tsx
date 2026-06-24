"use client";

/**
 * DeviceListView — Lists all registered devices for the current user.
 * Used in the Privacy/Settings section.
 *
 * Shows device_name, device_type, last_sync_at, and marks the current
 * browser as the "current device" with a subtle indicator.
 * Supports inline rename and remove with confirmation.
 */

import { useEffect, useState } from "react";
import { Monitor, Smartphone, Laptop, CheckCircle2, Edit3, Trash2, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/auth-hook";
import { renameDevice, removeDevice } from "@/lib/sync/sync-engine";

type DeviceRow = {
  id: string;
  device_name: string;
  device_type: string | null;
  device_id: string;
  last_sync_at: string | null;
  created_at: string;
};

function computeCurrentDeviceId(): string {
  try {
    const stored = localStorage.getItem("openledger.deviceId");
    if (stored) return stored;
  } catch {
    // localStorage unavailable
  }

  // Generate a fingerprint similar to device.ts
  const parts = [
    ...(typeof screen !== "undefined" ? [screen.width, screen.height, screen.colorDepth] : [0, 0, 0]),
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency,
  ];
  const raw = parts.join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  const id = `web_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
  try {
    localStorage.setItem("openledger.deviceId", id);
  } catch {
    // silent
  }
  return id;
}

export function DeviceListView() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDeviceId] = useState(() => computeCurrentDeviceId());
  const [message, setMessage] = useState<string | null>(null);

  // Device rename state
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editDeviceName, setEditDeviceName] = useState("");

  // Device removal confirmation
  const [removingDeviceId, setRemovingDeviceId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const fetchDevices = async () => {
      const supabase = createClient();

      const { data: deviceData } = await supabase
        .from("openledger_devices")
        .select("id, device_name, device_type, device_id, last_sync_at, created_at")
        .eq("user_id", user.id)
        .order("last_sync_at", { ascending: false });

      if (!cancelled) {
        if (deviceData) {
          setDevices(deviceData as DeviceRow[]);
        }
        setLoading(false);
      }
    };

    fetchDevices();

    return () => { cancelled = true; };
  }, [user]);

  const handleRename = async (deviceId: string) => {
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

  const handleRemove = async (deviceId: string) => {
    const result = await removeDevice(deviceId);
    if (result.ok) {
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      setRemovingDeviceId(null);
      setMessage(null);
    } else {
      setMessage(`Remove failed: ${result.error}`);
    }
  };

  if (!user) {
    return (
      <div>
        <p className="gentle-help">Sign in to manage your devices.</p>
      </div>
    );
  }

  if (loading) {
    return <p className="gentle-help">Loading devices...</p>;
  }

  if (devices.length === 0) {
    return (
      <div>
        <p className="gentle-help">No devices registered yet. Sign in on another browser to link it.</p>
      </div>
    );
  }

  return (
    <div>
      {message ? (
        <p style={{ fontSize: 12, color: "#C0392B", marginBottom: 8 }}>{message}</p>
      ) : null}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {devices.map((d) => {
          const isCurrent = d.device_id === currentDeviceId;
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
              {/* Device icon */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "var(--surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {d.device_type === "mobile" ? (
                  <Smartphone size={18} style={{ color: "var(--text-tertiary)" }} />
                ) : d.device_type === "tablet" ? (
                  <Laptop size={18} style={{ color: "var(--text-tertiary)" }} />
                ) : (
                  <Monitor size={18} style={{ color: "var(--text-tertiary)" }} />
                )}
              </div>

              {/* Device info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {isEditing ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="text"
                      value={editDeviceName}
                      onChange={(e) => setEditDeviceName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(d.id);
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
                      onClick={() => handleRename(d.id)}
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
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontWeight: 600,
                      fontSize: 14,
                      color: "var(--text-primary)",
                    }}
                  >
                    {d.device_name}
                    {isCurrent && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#2E7D32",
                          background: "#E8F5E9",
                          padding: "1px 6px",
                          borderRadius: 999,
                          lineHeight: "16px",
                        }}
                      >
                        <CheckCircle2 size={10} />
                        This device
                      </span>
                    )}
                  </div>
                )}

                {!isEditing && (
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-tertiary)",
                      display: "block",
                      marginTop: 2,
                    }}
                  >
                    {d.device_type === "web" ? "Web browser" : d.device_type ?? "Unknown"}
                    {d.last_sync_at
                      ? ` — Last sync: ${formatTime(d.last_sync_at)}`
                      : " — Never synced"}
                  </span>
                )}
              </div>

              {/* Action buttons */}
              {!isEditing && !isConfirmingRemove && (
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
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

              {/* Confirmation dialog */}
              {isConfirmingRemove && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: "#C0392B", whiteSpace: "nowrap" }}>
                    Remove {d.device_name}?
                  </span>
                  <button
                    onClick={() => handleRemove(d.id)}
                    style={{
                      background: "#C0392B",
                      color: "#fff",
                      border: "none",
                      borderRadius: 999,
                      padding: "3px 12px",
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
              )}
            </div>
          );
        })}
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
