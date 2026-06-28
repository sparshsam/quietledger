"use client";

import { useEffect, useState, useRef } from "react";

const UPDATE_CHECK_INTERVAL = 60_000; // 60 seconds

export function PwaRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;

    const register = async () => {
      const registration = await navigator.serviceWorker.register("/sw.js").catch(() => null);
      if (!registration) return;

      registrationRef.current = registration;

      // If a new SW is already waiting, show the update banner
      if (registration.waiting) {
        setUpdateAvailable(true);
      }

      // Listen for new SW installations
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
          }
        });
      });
    };

    register();

    // Periodically check for SW updates
    const interval = setInterval(async () => {
      if (registrationRef.current) {
        try {
          await registrationRef.current.update();
        } catch {
          // Update check failed silently
        }
      }
    }, UPDATE_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const applyUpdate = () => {
    setUpdateAvailable(false);
    setDismissed(false);
    navigator.serviceWorker.ready.then((registration) => {
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
    });
    // Reload when new SW takes over
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  };

  const dismissUpdate = () => {
    setUpdateAvailable(false);
    setDismissed(true);
  };

  return (
    <>
      {updateAvailable && !dismissed ? (
        <div className="sw-update-banner">
          <span>A new version of OpenLedger is available.</span>
          <button onClick={applyUpdate} className="sw-update-btn">
            Reload
          </button>
          <button onClick={dismissUpdate} className="sw-update-btn" style={{ background: "transparent", opacity: 0.7 }}>
            Later
          </button>
        </div>
      ) : null}
    </>
  );
}
