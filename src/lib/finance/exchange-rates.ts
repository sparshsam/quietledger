// ─── Exchange Rate System ───────────────────────────────────────────────────
// Provider abstraction, local cache, background refresh.
// Default provider: CoinGecko for crypto/USD, Frankfurter for fiat cross rates.
// Rates refresh every 3 days. App works offline with stale rates.

import { getCurrency } from "./currency";

// ─── Types ─────────────────────────────────────────────────────────────────

export type ExchangeRateRecord = {
  from: string;
  to: string;
  rate: number;
  provider: string;
  fetchedAt: string; // ISO 8601
  expiresAt: string; // ISO 8601 — 3 days after fetch
};

export type ExchangeRateProvider = {
  name: string;
  /** Fetch a single rate: 1 from → X to */
  getRate(from: string, to: string): Promise<number | null>;
  /** Fetch multiple rates in one call (same base currency) */
  getBatchRates(
    base: string,
    targets: string[],
  ): Promise<Record<string, number | null>>;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const RATE_STORAGE_KEY = "openledger.exchangeRates";
const REFRESH_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const LAST_REFRESH_KEY = "openledger.exchangeRateLastRefresh";

// ─── Default Provider: CoinGecko + Frankfurter ─────────────────────────────

/**
 * Combined provider:
 * - CoinGecko `/simple/price` for crypto and USD pairs
 * - Frankfurter for fiat cross rates (EUR-based)
 */
const DEFAULT_PROVIDER: ExchangeRateProvider = {
  name: "coingecko+frankfurter",

  async getRate(from: string, to: string): Promise<number | null> {
    if (from.toUpperCase() === to.toUpperCase()) return 1;

    const batch = await this.getBatchRates(from, [to]);
    return batch[to.toUpperCase()] ?? null;
  },

  async getBatchRates(
    base: string,
    targets: string[],
  ): Promise<Record<string, number | null>> {
    const normalizedBase = base.toUpperCase();
    const normalizedTargets = targets.map((t) => t.toUpperCase());
    const baseCurrency = getCurrency(normalizedBase);
    const result: Record<string, number | null> = {};

    // If base is USDC, treat as USD for rate lookups (1:1 peg)
    const lookupBase = normalizedBase === "USDC" ? "USD" : normalizedBase;

    // Separate crypto and fiat targets
    const cryptoTargets: string[] = [];
    const fiatTargets: string[] = [];

    for (const t of normalizedTargets) {
      const tc = getCurrency(t);
      if (tc.type === "crypto" || tc.type === "stablecoin") {
        cryptoTargets.push(t === "USDC" ? "USD" : t);
      } else {
        fiatTargets.push(t);
      }
    }

    try {
      // Fetch crypto rates via CoinGecko
      if (cryptoTargets.length > 0) {
        const cgRates = await fetchCoinGecko(lookupBase, cryptoTargets);
        for (const [k, v] of Object.entries(cgRates)) {
          result[k] = v;
        }
      }
    } catch {
      // CoinGecko failed — continue with fiat fallback
    }

    try {
      // Fetch fiat rates via Frankfurter (or CoinGecko as fallback)
      if (fiatTargets.length > 0) {
        const fiatRates = await fetchFiatRates(lookupBase, fiatTargets);
        for (const [k, v] of Object.entries(fiatRates)) {
          result[k] = v;
        }
      }
    } catch {
      // Frankfurter failed — continue with what we have
    }

    // Apply USDC→USD mapping for remaining targets
    for (const t of normalizedTargets) {
      if (t === "USDC" && result["USD"] !== undefined) {
        result["USDC"] = result["USD"];
      }
      if (t === "USD" && result["USDC"] !== undefined) {
        result["USD"] = result["USDC"];
      }
    }

    return result;
  },
};

async function fetchCoinGecko(
  base: string,
  targets: string[],
): Promise<Record<string, number | null>> {
  // CoinGecko needs coin IDs, not tickers. Map common ones.
  const coinIdMap: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    SOL: "solana",
    XRP: "ripple",
    ADA: "cardano",
    DOT: "polkadot",
    AVAX: "avalanche-2",
    MATIC: "matic-network",
    ARB: "arbitrum",
    OP: "optimism",
    LINK: "chainlink",
    ATOM: "cosmos",
    NEAR: "near",
    DOGE: "dogecoin",
    APT: "aptos",
    USDC: "usd-coin",
    USDT: "tether",
    DAI: "dai",
    FRAX: "frax",
    PYUSD: "paypal-usd",
    FDUSD: "first-digital-usd",
    USD: "usd",
  };

  const coinId = coinIdMap[base];
  if (!coinId || coinId === "usd") {
    // If base is USD/USDC, just fetch crypto prices directly
    const cryptoIds = targets
      .map((t) => coinIdMap[t])
      .filter(Boolean)
      .join(",");

    if (!cryptoIds) return {};

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds}&vs_currencies=usd`;
    const response = await fetchWithTimeout(url, 5000);
    const json = await response.json();

    const result: Record<string, number | null> = {};
    for (const [id, rates] of Object.entries(json)) {
      const ticker = Object.keys(coinIdMap).find((k) => coinIdMap[k] === id);
      if (ticker && typeof (rates as Record<string, number>).usd === "number") {
        result[ticker] = (rates as Record<string, number>).usd;
      }
    }
    return result;
  }

  // Base is a crypto — fetch its USD price, then derive rates
  const cryptoIds = [...new Set([coinId, ...targets.map((t) => coinIdMap[t]).filter(Boolean)])].join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds}&vs_currencies=usd`;
  const response = await fetchWithTimeout(url, 5000);
  const json = await response.json();

  const baseUsdRate = json[coinId]?.usd;
  if (!baseUsdRate) return {};

  const result: Record<string, number | null> = {};
  for (const t of targets) {
    const id = coinIdMap[t];
    if (t === base) {
      result[t] = 1;
    } else if (id && json[id]?.usd) {
      // crypto → base: baseUsd / targetUsd
      result[t] = baseUsdRate / json[id].usd;
    } else if (!id) {
      // Unknown — leave null
      result[t] = null;
    }
  }
  return result;
}

async function fetchFiatRates(
  base: string,
  targets: string[],
): Promise<Record<string, number | null>> {
  // Use Frankfurter API (EUR-based, free, no key required)
  // https://api.frankfurter.dev/latest?base=EUR
  if (base === "USD" || base === "USDC") {
    const url = `https://api.frankfurter.dev/latest?base=USD`;
    const response = await fetchWithTimeout(url, 5000);
    const json = await response.json();
    const rates = json.rates as Record<string, number> | undefined;
    if (!rates) return {};

    const result: Record<string, number | null> = {};
    for (const t of targets) {
      if (t === base) {
        result[t] = 1;
      } else if (t === "USD") {
        result[t] = 1;
      } else if (rates[t]) {
        result[t] = rates[t];
      } else {
        result[t] = null;
      }
    }
    return result;
  }

  // For non-USD bases, get EUR rates for both and derive
  const allCurrencies = [...new Set([base, ...targets])].join(",");
  const url = `https://api.frankfurter.dev/latest?base=EUR&symbols=${allCurrencies}`;
  const response = await fetchWithTimeout(url, 5000);
  const json = await response.json();
  const rates = json.rates as Record<string, number> | undefined;
  if (!rates) return {};

  const baseToEur = rates[base];
  if (!baseToEur) return {};

  const result: Record<string, number | null> = {};
  for (const t of targets) {
    if (t === base) {
      result[t] = 1;
    } else if (rates[t]) {
      // 1 base = (rates[t] / baseToEur) target
      result[t] = rates[t] / baseToEur;
    } else {
      result[t] = null;
    }
  }
  return result;
}

// ─── Local Cache ───────────────────────────────────────────────────────────

export function loadCachedRates(): ExchangeRateRecord[] {
  try {
    const raw = localStorage.getItem(RATE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCachedRates(rates: ExchangeRateRecord[]): void {
  try {
    localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify(rates));
  } catch {
    // Cache write failures are non-critical
  }
}

export function getCachedRate(from: string, to: string): ExchangeRateRecord | null {
  const rates = loadCachedRates();
  const normalizedFrom = from.toUpperCase();
  const normalizedTo = to.toUpperCase();

  // Check direct pair
  const direct = rates.find(
    (r) => r.from === normalizedFrom && r.to === normalizedTo,
  );
  if (direct) return direct;

  // Check inverted pair and invert
  const inverted = rates.find(
    (r) => r.from === normalizedTo && r.to === normalizedFrom,
  );
  if (inverted) {
    return {
      from: normalizedFrom,
      to: normalizedTo,
      rate: 1 / inverted.rate,
      provider: inverted.provider,
      fetchedAt: inverted.fetchedAt,
      expiresAt: inverted.expiresAt,
    };
  }

  return null;
}

export function setCachedRate(
  from: string,
  to: string,
  rate: number,
  provider: string,
): void {
  const rates = loadCachedRates();
  const normalizedFrom = from.toUpperCase();
  const normalizedTo = to.toUpperCase();
  const now = new Date();

  const existing = rates.findIndex(
    (r) => r.from === normalizedFrom && r.to === normalizedTo,
  );

  const record: ExchangeRateRecord = {
    from: normalizedFrom,
    to: normalizedTo,
    rate,
    provider,
    fetchedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + REFRESH_INTERVAL_MS).toISOString(),
  };

  if (existing >= 0) {
    rates[existing] = record;
  } else {
    rates.push(record);
  }

  saveCachedRates(rates);
}

export function isRateStale(pair: { from: string; to: string }): boolean {
  const cached = getCachedRate(pair.from, pair.to);
  if (!cached) return true;
  return new Date(cached.expiresAt) < new Date();
}

export function getLastRefreshTimestamp(): string | null {
  try {
    return localStorage.getItem(LAST_REFRESH_KEY);
  } catch {
    return null;
  }
}

function setLastRefreshTimestamp(): void {
  try {
    localStorage.setItem(LAST_REFRESH_KEY, new Date().toISOString());
  } catch {
    // Non-critical
  }
}

// ─── Rate Store ────────────────────────────────────────────────────────────

export type RateStore = {
  getRate(from: string, to: string): number | null;
  getAllRates(): ExchangeRateRecord[];
  setRate(from: string, to: string, rate: number, provider: string): void;
  getLastRefresh(): string | null;
};

export function createLocalRateStore(): RateStore {
  return {
    getRate(from: string, to: string): number | null {
      const cached = getCachedRate(from, to);
      return cached?.rate ?? null;
    },

    getAllRates(): ExchangeRateRecord[] {
      return loadCachedRates();
    },

    setRate(from: string, to: string, rate: number, provider: string): void {
      setCachedRate(from, to, rate, provider);
    },

    getLastRefresh(): string | null {
      return getLastRefreshTimestamp();
    },
  };
}

// ─── Rate Fetcher ──────────────────────────────────────────────────────────

export type RateFetcher = {
  ensureFreshRates(
    pairs: Array<{ from: string; to: string }>,
    signal?: AbortSignal,
  ): Promise<void>;
  refreshAll(signal?: AbortSignal): Promise<void>;
};

/**
 * High-level rate fetcher that checks cache freshness, fetches stale rates,
 * and stores results locally.
 */
export function createRateFetcher(
  provider: ExchangeRateProvider = DEFAULT_PROVIDER,
  store: RateStore = createLocalRateStore(),
): RateFetcher {
  async function ensureFreshRates(
    pairs: Array<{ from: string; to: string }>,
    signal?: AbortSignal,
  ): Promise<void> {
    // Group by base currency for batch fetching
    const groups = new Map<string, Set<string>>();

    for (const pair of pairs) {
      const cached = getCachedRate(pair.from, pair.to);
      if (cached && !isRateStale(pair)) {
        continue; // Fresh enough
      }

      if (!groups.has(pair.from)) {
        groups.set(pair.from, new Set());
      }
      groups.get(pair.from)!.add(pair.to);
    }

    if (groups.size === 0) return;

    for (const [base, targets] of groups) {
      if (signal?.aborted) return;

      try {
        const rates = await provider.getBatchRates(base, [...targets]);
        for (const [target, rate] of Object.entries(rates)) {
          if (rate !== null) {
            store.setRate(base, target, rate, provider.name);
          }
        }
      } catch {
        // Silently fail — stale rates are acceptable
      }
    }

    setLastRefreshTimestamp();
  }

  async function refreshAll(signal?: AbortSignal): Promise<void> {
    const cached = loadCachedRates();
    const uniquePairs = new Set<string>();

    // Collect all unique pairs from cache
    for (const r of cached) {
      if (isRateStale(r)) {
        uniquePairs.add(`${r.from}:${r.to}`);
      }
    }

    // Always ensure the key pairs are fresh
    uniquePairs.add("USD:USDC");
    uniquePairs.add("USDC:USD");

    const pairs = [...uniquePairs].map((p) => {
      const [from, to] = p.split(":");
      return { from, to };
    });

    await ensureFreshRates(pairs, signal);
  }

  return { ensureFreshRates, refreshAll };
}

// ─── Background Refresh ────────────────────────────────────────────────────

/**
 * Schedule background refresh of exchange rates.
 * Checks if rates are stale on page load and refreshes if needed.
 * Returns a cleanup function.
 */
export function scheduleBackgroundRefresh(): () => void {
  const intervalId = setInterval(
    () => {
      const fetcher = createRateFetcher();
      fetcher.refreshAll().catch(() => {
        // Silent — stale rates are acceptable
      });
    },
    REFRESH_INTERVAL_MS,
  );

  // Do an initial check
  const fetcher = createRateFetcher();
  fetcher.refreshAll().catch(() => {});

  return () => clearInterval(intervalId);
}

/**
 * Single-shot refresh — call on app load or navigation.
 * Only refreshes if rates are stale.
 */
export function refreshRatesIfStale(): void {
  const lastRefresh = getLastRefreshTimestamp();
  if (!lastRefresh) {
    // Never refreshed — do initial fetch
    const fetcher = createRateFetcher();
    fetcher.refreshAll().catch(() => {});
    return;
  }

  const elapsed = Date.now() - new Date(lastRefresh).getTime();
  if (elapsed >= REFRESH_INTERVAL_MS) {
    const fetcher = createRateFetcher();
    fetcher.refreshAll().catch(() => {});
  }
}

// ─── Public Convenience API ─────────────────────────────────────────────────

/**
 * Get an exchange rate, trying cache first then fetching.
 * Returns null if both fail.
 */
export async function getExchangeRate(
  from: string,
  to: string,
): Promise<number | null> {
  if (from.toUpperCase() === to.toUpperCase()) return 1;

  // Try cache first
  const cached = getCachedRate(from, to);
  if (cached) return cached.rate;

  // Fetch from provider
  try {
    const rate = await DEFAULT_PROVIDER.getRate(from, to);
    if (rate !== null) {
      setCachedRate(from, to, rate, DEFAULT_PROVIDER.name);
    }
    return rate;
  } catch {
    return null;
  }
}

/**
 * Convert an amount from one currency to another using cached rates.
 * Returns null if no rate is available.
 */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
): number | null {
  if (from.toUpperCase() === to.toUpperCase()) return amount;

  const cached = getCachedRate(from, to);
  if (!cached) return null;

  return amount * cached.rate;
}

/**
 * Format a rate for display: "1 EUR = 1.0805 USDC"
 */
export function formatRateLine(
  from: string,
  to: string,
  rate: number,
): string {
  return `1 ${from.toUpperCase()} = ${rate.toFixed(4)} ${to.toUpperCase()}`;
}

// ─── Utility ───────────────────────────────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  ms: number,
  signal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  // Combine signals if both provided
  const combinedSignal = signal
    ? combineAbortSignals(signal, controller.signal)
    : controller.signal;

  try {
    return await fetch(url, { signal: combinedSignal });
  } finally {
    clearTimeout(timeout);
  }
}

function combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), {
      once: true,
    });
  }

  return controller.signal;
}
