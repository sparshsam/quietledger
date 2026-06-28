// ─── IndexedDB Storage Engine ──────────────────────────────────────────────
// Provides async get/set/delete for the primary ledger store with
// automatic localStorage fallback when IndexedDB is unavailable.
//
// The app uses a single-object-per-key model (not normalized) to maintain
// compatibility with the existing persistence layer. The advantage over
// plain localStorage is:
//   - No 5MB size limit
//   - Async operations (non-blocking main thread)
//   - Transactional writes (partial updates without full re-serialize)
//   - Better performance for large datasets

const DB_NAME = "openledger";
const DB_VERSION = 1;
const STORE_NAME = "ledger";

type StorageValue = Record<string, unknown>;

let dbInstance: IDBDatabase | null = null;
let dbSupported: boolean | null = null;

/**
 * Check if IndexedDB is available in this environment.
 */
function isSupported(): boolean {
  if (dbSupported !== null) return dbSupported;
  try {
    dbSupported = typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    dbSupported = false;
  }
  return dbSupported;
}

/**
 * Open the IndexedDB database and create the object store if needed.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);

    if (!isSupported()) {
      return reject(new Error("IndexedDB not supported"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      // Handle unexpected close
      dbInstance.onclose = () => {
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Get a value from IndexedDB by key.
 */
async function dbGet(key: string): Promise<StorageValue | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result ?? undefined);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Set a value in IndexedDB by key.
 */
async function dbSet(key: string, value: StorageValue): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Delete a key from IndexedDB.
 */
async function dbDelete(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all keys in the store.
 */
async function dbKeys(): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAllKeys();

    request.onsuccess = () => {
      resolve(request.result as string[]);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

// ─── Public API ────────────────────────────────────────────────────────────

export type StorageBackend = "indexeddb" | "localstorage" | "none";

/**
 * Detect which storage backend is available.
 */
export function getStorageBackend(): StorageBackend {
  if (isSupported()) return "indexeddb";

  try {
    if (typeof localStorage !== "undefined") return "localstorage";
  } catch {
    // localStorage not available
  }

  return "none";
}

/**
 * Load a value from storage using IndexedDB with localStorage fallback.
 */
export async function storageGet<T>(
  key: string,
  fallback?: (key: string) => T | null,
): Promise<T | null> {
  if (isSupported()) {
    try {
      const value = await dbGet(key);
      if (value !== undefined) return value as unknown as T;
    } catch {
      // IndexedDB failed, fall through to localStorage
    }
  }

  // Fallback to localStorage
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      // localStorage failed too
    }
  }

  return fallback?.(key) ?? null;
}

/**
 * Save a value to storage using IndexedDB with localStorage fallback.
 */
export async function storageSet<T>(
  key: string,
  value: T,
): Promise<boolean> {
  const serialized = value as unknown as StorageValue;

  if (isSupported()) {
    try {
      await dbSet(key, serialized);
      return true;
    } catch {
      // IndexedDB failed, fall through to localStorage
    }
  }

  // Fallback to localStorage
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      // Storage failed
    }
  }

  return false;
}

/**
 * Delete a key from storage.
 */
export async function storageDelete(key: string): Promise<boolean> {
  if (isSupported()) {
    try {
      await dbDelete(key);
      return true;
    } catch {
      // Fall through
    }
  }

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      // Fall through
    }
  }

  return false;
}

/**
 * Get approximate storage usage info.
 */
export async function getStorageInfo(): Promise<{
  backend: StorageBackend;
  keyCount: number;
  estimatedBytes: number;
}> {
  const backend = getStorageBackend();
  let keyCount = 0;
  let estimatedBytes = 0;

  if (backend === "indexeddb") {
    try {
      const keys = await dbKeys();
      keyCount = keys.length;
      // Estimate size by reading each value
      for (const k of keys) {
        const val = await dbGet(k);
        if (val) {
          estimatedBytes += JSON.stringify(val).length * 2; // UTF-16 rough estimate
        }
      }
    } catch {
      // Can't estimate
    }
  } else if (typeof localStorage !== "undefined") {
    keyCount = localStorage.length;
    estimatedBytes = new Blob([JSON.stringify(localStorage)]).size;
  }

  return { backend, keyCount, estimatedBytes };
}

/**
 * Check if storage is getting close to limits.
 */
export async function isStorageLow(): Promise<boolean> {
  const info = await getStorageInfo();
  if (info.backend === "localstorage") {
    // localStorage limit is ~5MB, warn at 4MB
    return info.estimatedBytes > 4_000_000;
  }
  // IndexedDB has no practical limit for our use case
  return false;
}

/**
 * Migrate data from localStorage to IndexedDB.
 * Returns the keys that were migrated.
 */
export async function migrateFromLocalStorage(): Promise<string[]> {
  if (!isSupported()) return [];

  const migrated: string[] = [];
  const keys = [
    "openledger.localLedger.v2",
    "openledger.currencySettings",
    "openledger.importSessions",
    "openledger_category_learnings",
    "openledger_categorization_rules",
    "openledger_merchant_aliases",
  ];

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        await dbSet(key, parsed);
        migrated.push(key);
      }
    } catch {
      // Skip this key — migration failure is non-fatal
    }
  }

  return migrated;
}

/**
 * Get detailed storage stats for diagnostics.
 */
export async function getStorageDiagnostics(): Promise<{
  backend: StorageBackend;
  keys: string[];
  totalSizeKB: number;
  low: boolean;
}> {
  const backend = getStorageBackend();
  let keys: string[] = [];
  let totalSizeKB = 0;

  if (backend === "indexeddb") {
    try {
      keys = await dbKeys();
      let totalBytes = 0;
      for (const k of keys) {
        const val = await dbGet(k);
        if (val) {
          totalBytes += JSON.stringify(val).length * 2;
        }
      }
      totalSizeKB = Math.round(totalBytes / 1024);
    } catch {
      // Can't diagnose
    }
  } else if (typeof localStorage !== "undefined") {
    keys = Object.keys(localStorage).filter((k) => k.startsWith("openledger"));
    totalSizeKB = Math.round(new Blob([JSON.stringify(localStorage)]).size / 1024);
  }

  return { backend, keys, totalSizeKB, low: totalSizeKB > 4000 };
}
