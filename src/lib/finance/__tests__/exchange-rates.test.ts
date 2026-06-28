import { describe, it, expect, beforeEach } from "vitest";
import {
  getCachedRate,
  setCachedRate,
  isRateStale,
  loadCachedRates,
  createLocalRateStore,
  createRateFetcher,
  convertAmount,
} from "../exchange-rates";

// Mock localStorage for tests
function setupLocalStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    },
    writable: true,
  });
  return store;
}

describe("Exchange Rate Cache", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = setupLocalStorage();
  });

  it("stores and retrieves rates", () => {
    setCachedRate("EUR", "USDC", 1.0805, "coingecko+frankfurter");
    const cached = getCachedRate("EUR", "USDC");
    expect(cached).not.toBeNull();
    expect(cached!.rate).toBe(1.0805);
    expect(cached!.from).toBe("EUR");
    expect(cached!.to).toBe("USDC");
  });

  it("returns inverted rate when direct pair not found", () => {
    setCachedRate("USDC", "EUR", 0.9255, "test");
    const cached = getCachedRate("EUR", "USDC");
    expect(cached).not.toBeNull();
    expect(cached!.rate).toBeCloseTo(1 / 0.9255, 4);
  });

  it("returns same-currency rate of 1", () => {
    // If we ask for same currency, convertAmount handles it before cache lookup
    const result = convertAmount(100, "USDC", "USDC");
    expect(result).toBe(100);
  });

  it("returns null for missing rate", () => {
    const cached = getCachedRate("XYZ", "ABC");
    expect(cached).toBeNull();
  });

  it("case-insensitive lookup", () => {
    setCachedRate("eur", "usdc", 1.08, "test");
    const cached = getCachedRate("EUR", "USDC");
    expect(cached?.rate).toBe(1.08);
  });
});

describe("isRateStale", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = setupLocalStorage();
  });

  it("returns true when no rate exists", () => {
    expect(isRateStale({ from: "EUR", to: "USDC" })).toBe(true);
  });

  it("returns false for recently cached rates", () => {
    setCachedRate("EUR", "USDC", 1.08, "test");
    expect(isRateStale({ from: "EUR", to: "USDC" })).toBe(false);
  });
});

describe("convertAmount", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = setupLocalStorage();
  });

  it("returns null when no rate is available", () => {
    const result = convertAmount(100, "EUR", "USDC");
    expect(result).toBeNull();
  });

  it("converts when rate is cached", () => {
    setCachedRate("EUR", "USDC", 1.0805, "test");
    const result = convertAmount(42.5, "EUR", "USDC");
    expect(result).toBeCloseTo(45.92, 1);
  });

  it("returns same amount for same currency", () => {
    const result = convertAmount(100, "EUR", "EUR");
    expect(result).toBe(100);
  });
});

describe("createLocalRateStore", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = setupLocalStorage();
  });

  it("implements RateStore interface", () => {
    const rateStore = createLocalRateStore();

    expect(rateStore.getRate("EUR", "USDC")).toBeNull();

    rateStore.setRate("EUR", "USDC", 1.08, "test");
    expect(rateStore.getRate("EUR", "USDC")).toBe(1.08);

    const all = rateStore.getAllRates();
    expect(all).toHaveLength(1);
  });
});

describe("createRateFetcher", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = setupLocalStorage();
  });

  it("creates a fetcher with mock provider", async () => {
    const mockProvider = {
      name: "mock",
      getRate: async () => 1.5,
      getBatchRates: async () => ({ USDC: 1.5 }),
    };

    const store = createLocalRateStore();
    const fetcher = createRateFetcher(mockProvider, store);

    await fetcher.ensureFreshRates([{ from: "EUR", to: "USDC" }]);
    expect(store.getRate("EUR", "USDC")).toBe(1.5);
  });

  it("handles provider failure gracefully", async () => {
    const failingProvider = {
      name: "failing",
      getRate: async () => { throw new Error("API down"); },
      getBatchRates: async () => { throw new Error("API down"); },
    };

    const store = createLocalRateStore();
    const fetcher = createRateFetcher(failingProvider, store);

    // Should not throw
    await fetcher.ensureFreshRates([{ from: "EUR", to: "USDC" }]);
    expect(store.getRate("EUR", "USDC")).toBeNull();
  });
});
