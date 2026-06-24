"use client";

/**
 * DeviceListView — Lists all registered devices for the current user.
 * Used in the Privacy/Settings section.
 *
 * Shows device_name, device_type, last_sync_at, and marks the current
 * browser as the "current device" with a subtle indicator.
 */

import { useEffect, useState } from "react";
import { Monitor, Smartphone, Laptop, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/auth-hook";

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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      {devices.map((d) => {
        const isCurrent = d.device_id === currentDeviceId;
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
                {isCurrent ? (
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
                ) : null}
              </div>
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
            </div>
          </div>
        );
      })}
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
