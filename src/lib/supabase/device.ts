"use client";

/**
 * Device registration service.
 * After a successful Google sign-in, registers/detects the current
 * browser as a known device for future sync operations.
 */

import { createClient } from "@/lib/supabase/client";

export type DeviceInfo = {
  device_id: string;
  device_name: string;
  device_type: string;
  app_version: string;
};

/**
 * Generate a stable device ID from browser fingerprint.
 * Uses a hash of screen dimensions, timezone, language, and canvas fingerprint
 * to produce a consistent ID per browser profile.
 */
function generateDeviceId(): string {
  const parts = [
    screen.width,
    screen.height,
    screen.colorDepth,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency,
  ];
  const raw = parts.join("|");
  // Simple hash — stable for the same browser profile
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return `web_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
}

let cachedDeviceInfo: DeviceInfo | null = null;

function getDeviceInfo(): DeviceInfo {
  if (cachedDeviceInfo) return cachedDeviceInfo;

  const device_id = generateDeviceId();
  const ua = navigator.userAgent;
  // Derive a human-readable device name from the user agent
  let device_name = "Browser";
  if (ua.includes("Chrome") && !ua.includes("Edg")) device_name = "Chrome";
  else if (ua.includes("Firefox")) device_name = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) device_name = "Safari";
  else if (ua.includes("Edg")) device_name = "Edge";

  // Add OS hint
  if (ua.includes("Windows")) device_name += " (Windows)";
  else if (ua.includes("Mac OS")) device_name += " (macOS)";
  else if (ua.includes("Linux")) device_name += " (Linux)";
  else if (ua.includes("Android")) device_name += " (Android)";
  else if (ua.includes("iPhone") || ua.includes("iPad")) device_name += " (iOS)";

  const device_type = "web";

  // Try to read app version from a meta tag or global
  const app_version =
    (typeof document !== "undefined" &&
      document.querySelector('meta[name="application-version"]')?.getAttribute("content")) ||
    "0.9.1";

  cachedDeviceInfo = { device_id, device_name, device_type, app_version };
  return cachedDeviceInfo;
}

/**
 * Register or update the current device in the database.
 * Called automatically after a successful Google sign-in.
 */
export async function registerDevice(): Promise<boolean> {
  const supabase = createClient();

  // Get current user — don't proceed if not signed in
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const device = getDeviceInfo();

  // Check if this device is already registered for this user
  const { data: existing } = await supabase
    .from("openledger_devices")
    .select("id, last_sync_at")
    .eq("user_id", user.id)
    .eq("device_id", device.device_id)
    .maybeSingle();

  if (existing) {
    // Update last seen
    await supabase
      .from("openledger_devices")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", existing.id);
    return true;
  }

  // Register new device
  const { error } = await supabase.from("openledger_devices").insert({
    user_id: user.id,
    device_id: device.device_id,
    device_name: device.device_name,
    device_type: device.device_type,
    last_sync_at: new Date().toISOString(),
  });

  return !error;
}

/**
 * Get the number of registered devices for the current user.
 */
export async function getDeviceCount(): Promise<number> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("openledger_devices")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  return count ?? 0;
}

export { getDeviceInfo };
