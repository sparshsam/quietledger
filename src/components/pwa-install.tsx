"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * PWA install prompt component.
 * Shows an install button when the app is installable (beforeinstallprompt)
 * or shows instructions for iOS Safari where the event is not supported.
 */
export function PwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone] = useState(() =>
    typeof window !== "undefined" && (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    ),
  );
  const [showIOSHint, setShowIOSHint] = useState(() => {
    if (typeof window === "undefined") return false;
    const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (!iOS) return false;
    return !localStorage.getItem("openledger_install_dismissed");
  });

  useEffect(() => {
    if (isStandalone) return;
    const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (iOS) return; // Already handled by lazy state init

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isStandalone]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const dismissIOSHint = () => {
    localStorage.setItem("openledger_install_dismissed", "true");
    setShowIOSHint(false);
  };

  if (isStandalone || (!deferredPrompt && !showIOSHint)) return null;

  if (showIOSHint) {
    return (
      <div className="sw-update-banner" style={{ bottom: 140, top: "auto", left: "50%", transform: "translateX(-50%)" }}>
        <span>Install OpenLedger: tap Share → Add to Home Screen</span>
        <button onClick={dismissIOSHint} className="sw-update-btn" style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", padding: "6px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleInstall}
      className="navbar-search-btn"
      aria-label="Install app"
      title="Install app"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px" }}
    >
      <Download size={16} />
    </button>
  );
}
