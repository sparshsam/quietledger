import { describe, it, expect } from "vitest";
import {
  detectBankFormat,
  getBankFormat,
  getFormatsForCountry,
  getFormatCountries,
  detectCurrencyFromHeaders,
} from "../bank-formats";

describe("detectBankFormat", () => {
  it("detects North American format", () => {
    const format = detectBankFormat(["Date", "Description", "Amount", "Type"]);
    expect(format.region).toBe("North America");
    expect(format.decimalSeparator).toBe(".");
  });

  it("detects European format", () => {
    const format = detectBankFormat(["Date", "Description", "Money Out", "Money In"]);
    expect(format.decimalSeparator).toBe(",");
  });

  it("detects French format", () => {
    const format = detectBankFormat(["Date", "Libellé", "Débit", "Crédit"]);
    expect(format.id).toBe("fr-standard");
  });

  it("detects German format", () => {
    const format = detectBankFormat(["Buchungstag", "Verwendungszweck", "Umsatz"]);
    expect(format.id).toBe("de-standard");
  });

  it("detects Indian format", () => {
    const format = detectBankFormat(["Date", "Narration", "Chq/Ref No", "Withdrawal", "Deposit", "Balance"]);
    expect(format.id).toBe("in-standard");
  });

  it("detects Japanese format", () => {
    const format = detectBankFormat(["日付", "内容", "金額"]);
    expect(format.id).toBe("jp-standard");
  });

  it("detects Chinese format", () => {
    const format = detectBankFormat(["交易日期", "摘要", "金额"]);
    expect(format.id).toBe("cn-standard");
  });

  it("falls back to generic CSV for unknown formats", () => {
    const format = detectBankFormat(["Col1", "Col2", "Col3"]);
    expect(format.id).toBe("generic-csv");
  });

  it("handles lowercase headers", () => {
    const format = detectBankFormat(["date", "description", "amount"]);
    // Lowercase "date", "description", "amount" match NA format too
    expect(format.region).toBe("North America");
  });

  it("scores format by number of matching headers", () => {
    // This has strong DE signals
    const format = detectBankFormat(["Buchungstag", "Verwendungszweck", "Umsatz", "Saldo"]);
    expect(format.id).toBe("de-standard");
  });
});

describe("getBankFormat", () => {
  it("returns format by ID", () => {
    const format = getBankFormat("na-generic");
    expect(format).toBeDefined();
  });

  it("returns undefined for unknown ID", () => {
    const format = getBankFormat("nonexistent");
    expect(format).toBeUndefined();
  });
});

describe("getFormatsForCountry", () => {
  it("returns formats for a country", () => {
    const formats = getFormatsForCountry("US");
    expect(formats.length).toBeGreaterThan(0);
    expect(formats[0].country).toBe("US");
  });

  it("returns empty for unsupported country", () => {
    const formats = getFormatsForCountry("ZZ");
    expect(formats).toHaveLength(0);
  });
});

describe("getFormatCountries", () => {
  it("returns list of country codes", () => {
    const countries = getFormatCountries();
    expect(countries).toContain("US");
    expect(countries).toContain("GB");
    expect(countries).toContain("DE");
    expect(countries).toContain("JP");
  });
});

describe("detectCurrencyFromHeaders", () => {
  it("detects currency code in headers", () => {
    expect(detectCurrencyFromHeaders(["Date", "Description", "EUR"])).toBe("EUR");
    expect(detectCurrencyFromHeaders(["Date", "Description", "USD"])).toBe("USD");
  });

  it("returns null when no currency found", () => {
    expect(detectCurrencyFromHeaders(["Date", "Description", "Amount"])).toBeNull();
  });
});
