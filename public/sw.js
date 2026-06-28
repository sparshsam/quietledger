// ── PWA Service Worker for OpenLedger ──
//
// This SW uses:
//   NETWORK-FIRST for HTML pages — always fetch fresh content, fall back to cache when offline
//   CACHE-FIRST for static assets — fast offline-capable loading from cache
//
// The VERSION constant is bumped with each deploy so the browser detects the SW
// changed and downloads the new version immediately.

const CACHE_NAME = "openledger-shell-v8";
const SHELL_ASSETS = ["/", "/manifest.webmanifest", "/icons/icon.svg"];

// Bump this with every deploy that includes SW changes so the browser
// detects the updated script and activates the new SW.
const VERSION = "2026-06-28";

// ── Message Handler ─────────────────────────────────────────────────────────
// Handles SKIP_WAITING from the PwaRegister component so the user's "Reload"
// button can activate the new SW immediately.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── Install ──────────────────────────────────────────────────────────────
// Cache shell assets and take control immediately — no waiting state.
self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        SHELL_ASSETS.map((url) =>
          fetch(url)
            .then((response) => {
              if (!response.ok)
                throw new Error(`Failed to cache ${url}: ${response.status}`);
              return cache.put(url, response);
            })
            .catch(() => {
              // Asset unavailable during install — app still works for online visits
            }),
        ),
      ),
    ),
  );
});

// ── Activate ──────────────────────────────────────────────────────────────
// Delete stale caches, claim all clients, and proactively refresh shell
// assets from the network so the cache has fresh content.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Remove caches from older SW versions
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );

      // Proactively refresh shell assets from network
      caches
        .open(CACHE_NAME)
        .then((cache) =>
          Promise.allSettled(
            SHELL_ASSETS.map((url) =>
              fetch(url + "?v=" + VERSION)
                .then((res) => {
                  if (res.ok) cache.put(url, res);
                })
                .catch(() => {}),
            ),
          ),
        )
        .catch(() => {});

      // Take control of all open clients immediately
      await self.clients.claim();
    })(),
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // For navigation (HTML) requests: try network first, fall back to cache
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // For Google avatar/profile images: network-only, never cache
  const url = new URL(event.request.url);
  if (url.hostname === "lh3.googleusercontent.com") {
    return;
  }

  // For static assets: cache-first for speed and offline support
  event.respondWith(cacheFirst(event.request));
});

/**
 * Network-first strategy for HTML pages.
 * Always tries the network first for fresh content. If offline or the
 * network fails, falls back to the cached version.
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const copy = response.clone();
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, copy);
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response("Offline — OpenLedger", { status: 503 });
  }
}

/**
 * Cache-first strategy for static assets.
 * Returns from cache instantly, falling back to network if not cached.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    const copy = response.clone();
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, copy);
  }
  return response;
}
