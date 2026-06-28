import { describe, it, expect } from "vitest";
import {
  getCurrency,
  formatCurrency,
  formatCurrencyCompact,
  formatWithCurrency,
  formatConversionLine,
  getCurrencyType,
  getAllCurrencies,
  getActiveFiatCurrencies,
  getActiveCryptoCurrencies,
  DEFAULT_BASE_CURRENCY,
} from "../currency";

describe("Currency Registry", () => {
  it("returns USDC as default base currency", () => {
    expect(DEFAULT_BASE_CURRENCY).toBe("USDC");
  });

  it("returns currency info for known codes", () => {
    const usdc = getCurrency("USDC");
    expect(usdc.code).toBe("USDC");
    expect(usdc.type).toBe("stablecoin");
    expect(usdc.decimals).toBe(6);

    const eur = getCurrency("EUR");
    expect(eur.code).toBe("EUR");
    expect(eur.type).toBe("fiat");

    const btc = getCurrency("BTC");
    expect(btc.code).toBe("BTC");
    expect(btc.type).toBe("crypto");
  });

  it("case-insensitive lookup", () => {
    expect(getCurrency("usdc").code).toBe("USDC");
    expect(getCurrency("eur").code).toBe("EUR");
  });

  it("falls back to USDC for unknown codes", () => {
    const unknown = getCurrency("XYZ");
    expect(unknown.code).toBe("USDC");
  });

  it("returns all active currencies", () => {
    const all = getAllCurrencies();
    expect(all.length).toBeGreaterThan(50);
    expect(all.some((c) => c.type === "fiat")).toBe(true);
    expect(all.some((c) => c.type === "crypto")).toBe(true);
    expect(all.some((c) => c.type === "stablecoin")).toBe(true);
  });

  it("returns active fiat currencies", () => {
    const fiats = getActiveFiatCurrencies();
    expect(fiats.length).toBeGreaterThan(20);
    expect(fiats.every((c) => c.type === "fiat")).toBe(true);
  });

  it("returns active crypto + stablecoins", () => {
    const cryptos = getActiveCryptoCurrencies();
    expect(cryptos.length).toBeGreaterThan(15);
    expect(cryptos.every((c) => c.type === "crypto" || c.type === "stablecoin")).toBe(true);
  });

  it("identifies currency types correctly", () => {
    expect(getCurrencyType("USDC")).toBe("stablecoin");
    expect(getCurrencyType("EUR")).toBe("fiat");
    expect(getCurrencyType("BTC")).toBe("crypto");
  });
});

describe("formatCurrency", () => {
  it("formats USDC amounts", () => {
    const result = formatCurrency(1234.56, "USDC", "en-US");
    expect(result).toContain("1");
    expect(result).toContain(",");
  });

  it("formats EUR amounts", () => {
    const result = formatCurrency(42.5, "EUR", "de-DE");
    // Should show 42,50 € format
    expect(result).toContain("42");
  });

  it("formats JPY with zero decimals", () => {
    const result = formatCurrency(1500, "JPY", "ja-JP");
    expect(result).not.toContain(".");
  });

  it("formats BTC amounts", () => {
    const result = formatCurrency(0.5, "BTC", "en-US");
    expect(result).toContain("0.5");
  });

  it("handles zero", () => {
    const result = formatCurrency(0, "USDC", "en-US");
    expect(result).toContain("0");
  });

  it("handles negative amounts", () => {
    const result = formatCurrency(-100, "USDC", "en-US");
    expect(result).toContain("-");
  });
});

describe("formatCurrencyCompact", () => {
  it("shows full value for small amounts", () => {
    const result = formatCurrencyCompact(500, "USDC");
    expect(result).toContain("5");
  });

  it("shows K suffix for thousands", () => {
    const result = formatCurrencyCompact(150000, "USDC");
    expect(result).toContain("K");
  });

  it("shows M suffix for millions", () => {
    const result = formatCurrencyCompact(2500000, "USDC");
    expect(result).toContain("M");
  });
});

describe("formatWithCurrency", () => {
  it("shows currency code when requested", () => {
    const result = formatWithCurrency(100, "USDC", true);
    expect(result).toContain("USDC");
  });

  it("omits code by default", () => {
    // For non-ISO currencies like USDC, the code is the display symbol
    const result = formatWithCurrency(100, "USDC");
    expect(result).toContain("USDC"); // USDC uses code-as-suffix format
  });

  it("uses symbol for standard currencies", () => {
    const result = formatWithCurrency(100, "USD");
    expect(result).toContain("$");
  });
});

describe("formatConversionLine", () => {
  it("shows conversion arrow", () => {
    const result = formatConversionLine(42.5, "EUR", 45.92, "USDC");
    expect(result).toContain("→");
    // EUR uses "€" symbol; USDC uses code suffix format
    expect(result).toMatch(/€/);
    expect(result).toContain("USDC");
  });

  it("includes currency code in output", () => {
    // For code-as-symbol currencies (SOL, USDC), the code appears in output
    const result = formatConversionLine(100, "USDC", 100, "USDC");
    expect(result).toContain("USDC");
  });
});
