"use client";

import type { CurrencySettings } from "@/lib/data/types";
import { getAllCurrencies, formatCurrency } from "@/lib/finance/currency";
import { getLastRefreshTimestamp, isRateStale, getCachedRate } from "@/lib/finance/exchange-rates";
import { Select } from "@/components/select";

const LOCALE_OPTIONS = [
  { value: "en-US", label: "English (US)" },
  { value: "en-CA", label: "English (Canada)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "en-AU", label: "English (Australia)" },
  { value: "en-IN", label: "English (India)" },
  { value: "fr-FR", label: "Français (France)" },
  { value: "de-DE", label: "Deutsch (Deutschland)" },
  { value: "es-ES", label: "Español (España)" },
  { value: "it-IT", label: "Italiano (Italia)" },
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "nl-NL", label: "Nederlands (Nederland)" },
  { value: "sv-SE", label: "Svenska (Sverige)" },
  { value: "ja-JP", label: "日本語 (日本)" },
  { value: "zh-CN", label: "中文 (中国)" },
  { value: "tr-TR", label: "Türkçe (Türkiye)" },
  { value: "pl-PL", label: "Polski (Polska)" },
  { value: "ar-AE", label: "العربية (الإمارات)" },
];

type CurrencySettingsPanelProps = {
  settings: CurrencySettings;
  onChange: (settings: CurrencySettings) => void;
};

export function CurrencySettingsPanel({ settings, onChange }: CurrencySettingsPanelProps) {
  const allCurrencies = getAllCurrencies();

  // Rate freshness info
  const lastRefresh = getLastRefreshTimestamp();
  const baseRateFresh = settings.baseCurrency === "USDC"
    ? true
    : !isRateStale({ from: "USD", to: settings.baseCurrency });

  function updateField<K extends keyof CurrencySettings>(
    field: K,
    value: CurrencySettings[K],
  ) {
    onChange({ ...settings, [field]: value });
  }

  return (
    <div className="settings-panel-content">
      <div className="settings-panel-section">
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
          Choose your base currency and display preferences. All amounts will be converted to your base currency for reporting.
        </p>

        {/* Base currency */}
        <div className="settings-field">
          <label className="settings-field-label">Base currency</label>
          <p className="gentle-help" style={{ marginBottom: 4 }}>
            Your home currency for reports, budgets, and net worth.
          </p>
          <Select
            value={settings.baseCurrency}
            onChange={(v) => updateField("baseCurrency", v)}
            options={allCurrencies.map((c) => ({
              value: c.code,
              label: `${c.code} — ${c.name} (${c.symbol}) [${c.type === "stablecoin" ? "Stablecoin" : c.type === "crypto" ? "Crypto" : "Fiat"}]`,
            }))}
            className="settings-select"
          />
        </div>

        {/* Import currency */}
        <div className="settings-field" style={{ marginTop: 16 }}>
          <label className="settings-field-label">Import default currency</label>
          <p className="gentle-help" style={{ marginBottom: 4 }}>
            Default currency applied to imports that don&apos;t include a currency column.
          </p>
          <Select
            value={settings.importCurrency}
            onChange={(v) => updateField("importCurrency", v)}
            options={allCurrencies.map((c) => ({
              value: c.code,
              label: `${c.code} — ${c.name}`,
            }))}
            className="settings-select"
          />
        </div>

        {/* Locale */}
        <div className="settings-field" style={{ marginTop: 16 }}>
          <label className="settings-field-label">Number format</label>
          <p className="gentle-help" style={{ marginBottom: 4 }}>
            How numbers and dates are displayed (e.g., $1,234.56 or 1.234,56 €).
          </p>
          <Select
            value={settings.locale}
            onChange={(v) => updateField("locale", v)}
            options={LOCALE_OPTIONS}
            className="settings-select"
          />
        </div>

        {/* Sample display */}
        <div className="settings-field" style={{ marginTop: 16 }}>
          <label className="settings-field-label">Preview</label>
          <div className="settings-sample-row">
            <span className="settings-sample-value">
              {formatCurrency(123456.78, settings.baseCurrency, settings.locale)}
            </span>
            <span className="settings-sample-label">123,456.78 in {settings.baseCurrency}</span>
          </div>
          <div className="settings-sample-row">
            <span className="settings-sample-value">
              {formatCurrency(-42.5, settings.baseCurrency, settings.locale)}
            </span>
            <span className="settings-sample-label">-42.50 in {settings.baseCurrency}</span>
          </div>
        </div>
      </div>

      {/* Exchange rates status */}
      <div className="settings-panel-section" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div className="settings-panel-heading">Exchange Rates</div>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
          {lastRefresh
            ? `Last updated: ${new Date(lastRefresh).toLocaleDateString(settings.locale, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : "Rates not yet fetched. They will be fetched automatically when needed."}
          <br />
          {baseRateFresh
            ? "Base currency rates are current."
            : "Rates may be stale — check back later."}
          <br />
          <span style={{ opacity: 0.7 }}>
            Rates update automatically every 3 days. The app works fully offline with cached rates.
          </span>
        </p>
      </div>
    </div>
  );
}
