// ─── Currency System ────────────────────────────────────────────────────────
// ISO fiat, crypto, and stablecoin registry + formatting utilities.
// USDC is the default base currency per v0.10.3 spec.

export type CurrencyType = "fiat" | "crypto" | "stablecoin";

export type CurrencyInfo = {
  code: string;
  name: string;
  symbol: string;
  type: CurrencyType;
  decimals: number;
  displayPrecision: number;
  active: boolean;
};

// ─── Currency Registry ──────────────────────────────────────────────────────

// Default base currency for OpenLedger
export const DEFAULT_BASE_CURRENCY = "USDC";

const CURRENCIES: Record<string, CurrencyInfo> = {
  // ── Stablecoins ──
  USDC: {
    code: "USDC",
    name: "USD Coin",
    symbol: "USDC",
    type: "stablecoin",
    decimals: 6,
    displayPrecision: 2,
    active: true,
  },
  USDT: {
    code: "USDT",
    name: "Tether",
    symbol: "USDT",
    type: "stablecoin",
    decimals: 6,
    displayPrecision: 2,
    active: true,
  },
  DAI: {
    code: "DAI",
    name: "Dai",
    symbol: "DAI",
    type: "stablecoin",
    decimals: 18,
    displayPrecision: 2,
    active: true,
  },
  FRAX: {
    code: "FRAX",
    name: "Frax",
    symbol: "FRAX",
    type: "stablecoin",
    decimals: 18,
    displayPrecision: 2,
    active: true,
  },

  // ── Major Fiat ──
  USD: {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  EUR: {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  GBP: {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  CAD: {
    code: "CAD",
    name: "Canadian Dollar",
    symbol: "CA$",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  AUD: {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "A$",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  JPY: {
    code: "JPY",
    name: "Japanese Yen",
    symbol: "¥",
    type: "fiat",
    decimals: 0,
    displayPrecision: 0,
    active: true,
  },
  CNY: {
    code: "CNY",
    name: "Chinese Yuan",
    symbol: "¥",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  INR: {
    code: "INR",
    name: "Indian Rupee",
    symbol: "₹",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  BRL: {
    code: "BRL",
    name: "Brazilian Real",
    symbol: "R$",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  MXN: {
    code: "MXN",
    name: "Mexican Peso",
    symbol: "MX$",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  CHF: {
    code: "CHF",
    name: "Swiss Franc",
    symbol: "CHF",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  SEK: {
    code: "SEK",
    name: "Swedish Krona",
    symbol: "SEK",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  NOK: {
    code: "NOK",
    name: "Norwegian Krone",
    symbol: "NOK",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  DKK: {
    code: "DKK",
    name: "Danish Krone",
    symbol: "DKK",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  NZD: {
    code: "NZD",
    name: "New Zealand Dollar",
    symbol: "NZ$",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  SGD: {
    code: "SGD",
    name: "Singapore Dollar",
    symbol: "S$",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  HKD: {
    code: "HKD",
    name: "Hong Kong Dollar",
    symbol: "HK$",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  KRW: {
    code: "KRW",
    name: "South Korean Won",
    symbol: "₩",
    type: "fiat",
    decimals: 0,
    displayPrecision: 0,
    active: true,
  },
  TRY: {
    code: "TRY",
    name: "Turkish Lira",
    symbol: "₺",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  ZAR: {
    code: "ZAR",
    name: "South African Rand",
    symbol: "R",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  PLN: {
    code: "PLN",
    name: "Polish Zloty",
    symbol: "zł",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  THB: {
    code: "THB",
    name: "Thai Baht",
    symbol: "฿",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  IDR: {
    code: "IDR",
    name: "Indonesian Rupiah",
    symbol: "Rp",
    type: "fiat",
    decimals: 0,
    displayPrecision: 0,
    active: true,
  },
  MYR: {
    code: "MYR",
    name: "Malaysian Ringgit",
    symbol: "RM",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  PHP: {
    code: "PHP",
    name: "Philippine Peso",
    symbol: "₱",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  RUB: {
    code: "RUB",
    name: "Russian Ruble",
    symbol: "₽",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: false,
  },
  AED: {
    code: "AED",
    name: "UAE Dirham",
    symbol: "د.إ",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  SAR: {
    code: "SAR",
    name: "Saudi Riyal",
    symbol: "﷼",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  ARS: {
    code: "ARS",
    name: "Argentine Peso",
    symbol: "$",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  CLP: {
    code: "CLP",
    name: "Chilean Peso",
    symbol: "$",
    type: "fiat",
    decimals: 0,
    displayPrecision: 0,
    active: true,
  },
  COP: {
    code: "COP",
    name: "Colombian Peso",
    symbol: "$",
    type: "fiat",
    decimals: 0,
    displayPrecision: 0,
    active: true,
  },
  NGN: {
    code: "NGN",
    name: "Nigerian Naira",
    symbol: "₦",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  KES: {
    code: "KES",
    name: "Kenyan Shilling",
    symbol: "KSh",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  ILS: {
    code: "ILS",
    name: "Israeli Shekel",
    symbol: "₪",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  CZK: {
    code: "CZK",
    name: "Czech Koruna",
    symbol: "Kč",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  HUF: {
    code: "HUF",
    name: "Hungarian Forint",
    symbol: "Ft",
    type: "fiat",
    decimals: 0,
    displayPrecision: 0,
    active: true,
  },
  RON: {
    code: "RON",
    name: "Romanian Leu",
    symbol: "lei",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  BGN: {
    code: "BGN",
    name: "Bulgarian Lev",
    symbol: "лв",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  VND: {
    code: "VND",
    name: "Vietnamese Dong",
    symbol: "₫",
    type: "fiat",
    decimals: 0,
    displayPrecision: 0,
    active: true,
  },
  PKR: {
    code: "PKR",
    name: "Pakistani Rupee",
    symbol: "₨",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  EGP: {
    code: "EGP",
    name: "Egyptian Pound",
    symbol: "E£",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  UAH: {
    code: "UAH",
    name: "Ukrainian Hryvnia",
    symbol: "₴",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  TWD: {
    code: "TWD",
    name: "New Taiwan Dollar",
    symbol: "NT$",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },
  // ── Additional Fiat ──
  PEN: {
    code: "PEN",
    name: "Peruvian Sol",
    symbol: "S/",
    type: "fiat",
    decimals: 2,
    displayPrecision: 2,
    active: true,
  },

  // ── Major Crypto ──
  BTC: {
    code: "BTC",
    name: "Bitcoin",
    symbol: "₿",
    type: "crypto",
    decimals: 8,
    displayPrecision: 6,
    active: true,
  },
  ETH: {
    code: "ETH",
    name: "Ethereum",
    symbol: "Ξ",
    type: "crypto",
    decimals: 18,
    displayPrecision: 6,
    active: true,
  },
  SOL: {
    code: "SOL",
    name: "Solana",
    symbol: "SOL",
    type: "crypto",
    decimals: 9,
    displayPrecision: 4,
    active: true,
  },
  XRP: {
    code: "XRP",
    name: "XRP",
    symbol: "XRP",
    type: "crypto",
    decimals: 6,
    displayPrecision: 4,
    active: true,
  },
  ADA: {
    code: "ADA",
    name: "Cardano",
    symbol: "ADA",
    type: "crypto",
    decimals: 6,
    displayPrecision: 4,
    active: true,
  },
  DOT: {
    code: "DOT",
    name: "Polkadot",
    symbol: "DOT",
    type: "crypto",
    decimals: 10,
    displayPrecision: 4,
    active: true,
  },
  AVAX: {
    code: "AVAX",
    name: "Avalanche",
    symbol: "AVAX",
    type: "crypto",
    decimals: 18,
    displayPrecision: 4,
    active: true,
  },
  MATIC: {
    code: "MATIC",
    name: "Polygon",
    symbol: "MATIC",
    type: "crypto",
    decimals: 18,
    displayPrecision: 4,
    active: true,
  },
  ARB: {
    code: "ARB",
    name: "Arbitrum",
    symbol: "ARB",
    type: "crypto",
    decimals: 18,
    displayPrecision: 4,
    active: true,
  },
  OP: {
    code: "OP",
    name: "Optimism",
    symbol: "OP",
    type: "crypto",
    decimals: 18,
    displayPrecision: 4,
    active: true,
  },
  LINK: {
    code: "LINK",
    name: "Chainlink",
    symbol: "LINK",
    type: "crypto",
    decimals: 18,
    displayPrecision: 4,
    active: true,
  },
  ATOM: {
    code: "ATOM",
    name: "Cosmos",
    symbol: "ATOM",
    type: "crypto",
    decimals: 6,
    displayPrecision: 4,
    active: true,
  },
  NEAR: {
    code: "NEAR",
    name: "NEAR Protocol",
    symbol: "NEAR",
    type: "crypto",
    decimals: 24,
    displayPrecision: 4,
    active: true,
  },
  DOGE: {
    code: "DOGE",
    name: "Dogecoin",
    symbol: "Ð",
    type: "crypto",
    decimals: 8,
    displayPrecision: 4,
    active: true,
  },
  APT: {
    code: "APT",
    name: "Aptos",
    symbol: "APT",
    type: "crypto",
    decimals: 8,
    displayPrecision: 4,
    active: true,
  },

  // ── Additional stablecoins ──
  PYUSD: {
    code: "PYUSD",
    name: "PayPal USD",
    symbol: "PYUSD",
    type: "stablecoin",
    decimals: 18,
    displayPrecision: 2,
    active: true,
  },
  FDUSD: {
    code: "FDUSD",
    name: "First Digital USD",
    symbol: "FDUSD",
    type: "stablecoin",
    decimals: 18,
    displayPrecision: 2,
    active: true,
  },
};

// ─── Lookups ────────────────────────────────────────────────────────────────

export function getCurrency(code: string): CurrencyInfo {
  // Return active currency, or fall back to USDC
  const found = CURRENCIES[code.toUpperCase()];
  if (found?.active) return found;
  return CURRENCIES[DEFAULT_BASE_CURRENCY];
}

export function isCurrencyActive(code: string): boolean {
  return CURRENCIES[code.toUpperCase()]?.active ?? false;
}

export function getCurrencyType(code: string): CurrencyType {
  return CURRENCIES[code.toUpperCase()]?.type ?? "fiat";
}

export function getAllCurrencies(): CurrencyInfo[] {
  return Object.values(CURRENCIES).filter((c) => c.active);
}

export function getActiveFiatCurrencies(): CurrencyInfo[] {
  return Object.values(CURRENCIES).filter((c) => c.active && c.type === "fiat");
}

export function getActiveCryptoCurrencies(): CurrencyInfo[] {
  return Object.values(CURRENCIES).filter((c) => c.active && (c.type === "crypto" || c.type === "stablecoin"));
}

export function formatCurrencyCode(code: string): string {
  return code.toUpperCase();
}

// ─── Formatting ─────────────────────────────────────────────────────────────

export function formatCurrency(
  amount: number,
  currencyCode: string,
  locale = "en-US",
): string {
  const info = getCurrency(currencyCode);
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  const formatted = abs.toFixed(info.displayPrecision);

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: info.displayPrecision,
      maximumFractionDigits: info.displayPrecision,
    }).format(amount);
  } catch {
    // Non-ISO currency (e.g., USDC, SOL). Format with code as suffix.
    const localizedNum = new Intl.NumberFormat(locale, {
      minimumFractionDigits: info.displayPrecision,
      maximumFractionDigits: info.displayPrecision,
    }).format(abs);

    // If the symbol is the same as the code (e.g., "SOL", "USDC"), use code as suffix
    if (info.symbol === info.code) {
      return `${sign}${localizedNum} ${info.code}`;
    }

    // Otherwise use symbol as prefix (e.g., "₿")
    return `${sign}${info.symbol}${localizedNum}`;
  }
}

/**
 * Format a currency amount compactly for display
 * e.g. 1500 → "$1.5K", 2500000 → "$2.5M"
 */
export function formatCurrencyCompact(
  amount: number,
  currencyCode: string,
  locale = "en-US",
): string {
  const info = getCurrency(currencyCode);
  const abs = Math.abs(amount);
  let compact: number;
  let suffix: string;

  if (abs >= 1_000_000) {
    compact = amount / 1_000_000;
    suffix = "M";
  } else if (abs >= 1_000) {
    compact = amount / 1_000;
    suffix = "K";
  } else {
    return formatCurrency(amount, currencyCode, locale);
  }

  const formatted = compact.toFixed(compact % 1 === 0 ? 0 : 1);
  try {
    const symbol = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })
      .format(0)
      .replace(/[0\s]/g, "")
      .trim();
    return `${symbol}${formatted}${suffix}`;
  } catch {
    if (info.symbol === info.code) {
      return `${formatted}${suffix} ${info.code}`;
    }
    return `${info.symbol}${formatted}${suffix}`;
  }
}

// ─── Conversion Result ──────────────────────────────────────────────────────

export type ConversionResult = {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  targetCurrency: string;
  rate: number;
  rateDate: string;
};

export function buildConversionResult(
  originalAmount: number,
  originalCurrency: string,
  targetCurrency: string,
  rate: number,
  rateDate: string,
): ConversionResult {
  return {
    originalAmount,
    originalCurrency: originalCurrency.toUpperCase(),
    convertedAmount: originalAmount * rate,
    targetCurrency: targetCurrency.toUpperCase(),
    rate,
    rateDate,
  };
}

// ─── Currency Display Helpers ───────────────────────────────────────────────

export function formatWithCurrency(
  amount: number,
  currencyCode: string,
  showCode = false,
  locale = "en-US",
): string {
  const formatted = formatCurrency(amount, currencyCode, locale);
  if (showCode) return `${formatted} ${currencyCode.toUpperCase()}`;
  return formatted;
}

export function formatConversionLine(
  originalAmount: number,
  originalCurrency: string,
  convertedAmount: number,
  targetCurrency: string,
): string {
  const src = formatCurrency(originalAmount, originalCurrency);
  const dst = formatCurrency(convertedAmount, targetCurrency);
  return `${src} → ${dst}`;
}
