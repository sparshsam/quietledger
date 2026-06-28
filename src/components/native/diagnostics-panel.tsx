"use client";

import { useState, useEffect, useRef } from "react";
import { usePlatform } from "@/lib/native/use-platform";

interface CapacitorInfo {
  platform: string;
  isNative: boolean | undefined;
  plugins: string[];
}

/**
 * Diagnostics panel for APK/Electron debugging.
 * Shows platform detection, origin, API URL resolution.
 */
export function DiagnosticsPanel() {
  const platform = usePlatform();
  const [show] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return platform.isNative || params.has("diagnostics");
  });
  const [sessionStatus, setSessionStatus] = useState<string>("Checking...");
  const [capacitorInfo] = useState<CapacitorInfo | null>(() => {
    const cap = (window as unknown as Record<string, unknown>).Capacitor as
      | { getPlatform: () => string; isNativePlatform?: () => boolean; Plugins?: Record<string, unknown> }
      | undefined;
    if (!cap) return null;
    return {
      platform: cap.getPlatform(),
      isNative: cap.isNativePlatform?.(),
      plugins: Object.keys(cap.Plugins ?? {}),
    };
  });

  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
        if (!url || !key) { setSessionStatus("No Supabase credentials"); return; }
        const supabase = createClient(url, key);
        const { data } = await supabase.auth.getSession();
        setSessionStatus(data.session ? `Signed in (${data.session.user.email ?? "unknown"})` : "Guest");
      } catch { setSessionStatus("Error checking session"); }
    })();
  }, []);

  if (!show) return null;

  return (
    <details className="settings-section">
      <summary>Diagnostics</summary>
      <div className="settings-section-content">
        <div className="settings-panel-content" style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}>
          <div className="settings-panel-section">
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "4px 12px" }}>
              <span style={{ color: "var(--text-tertiary)" }}>Platform:</span>
              <span><strong>{platform.platform}</strong></span>

              <span style={{ color: "var(--text-tertiary)" }}>Is native:</span>
              <span>{String(platform.isNative)}</span>

              <span style={{ color: "var(--text-tertiary)" }}>Origin:</span>
              <span>{typeof window !== "undefined" ? window.location.origin : "N/A"}</span>

              <span style={{ color: "var(--text-tertiary)" }}>Protocol:</span>
              <span>{typeof window !== "undefined" ? window.location.protocol : "N/A"}</span>

              <span style={{ color: "var(--text-tertiary)" }}>API base:</span>
              <span>{platform.apiBase}</span>

              <span style={{ color: "var(--text-tertiary)" }}>App scheme:</span>
              <span>{platform.appScheme}://</span>

              <span style={{ color: "var(--text-tertiary)" }}>UA:</span>
              <span style={{ wordBreak: "break-all", fontSize: 11 }}>{typeof navigator !== "undefined" ? navigator.userAgent : "N/A"}</span>

              <span style={{ color: "var(--text-tertiary)" }}>Capacitor:</span>
              <span>{capacitorInfo ? JSON.stringify(capacitorInfo) : "Not detected"}</span>

              <span style={{ color: "var(--text-tertiary)" }}>Supabase:</span>
              <span>{sessionStatus}</span>
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}
