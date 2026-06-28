"use client";

import type { Account, Transaction } from "@/lib/data/types";
import { accountEffectiveBalance } from "@/lib/finance/totals";
import { formatCurrency, getCurrency } from "@/lib/finance/currency";
import { DEFAULT_CURRENCY_SETTINGS } from "@/lib/data/types";

const kindLabels: Record<string, string> = {
  chequing: "Checking",
  savings: "Savings",
  cash: "Cash",
  crypto: "Investment",
  credit: "Credit",
  "credit-card": "Credit",
  loan: "Loan",
  investment: "Investment",
  other: "Other",
};

const kindBadgeClass: Record<string, string> = {
  chequing: "badge-chq",
  "credit-card": "badge-cc",
  savings: "badge-sav",
  loan: "badge-loan",
  crypto: "badge-crypto",
  investment: "badge-crypto",
  cash: "badge-chq",
  other: "badge-misc",
};

function isLiability(kind: string): boolean {
  return kind === "credit-card" || kind === "credit" || kind === "loan";
}

type AccountsViewProps = {
  accounts: Account[];
  transactions: Transaction[];
  activeAccountId: string | null;
  onSelectAccount: (id: string | null) => void;
  baseCurrency?: string;
  locale?: string;
};

export function AccountsView({
  accounts,
  transactions,
  activeAccountId,
  onSelectAccount,
  baseCurrency = DEFAULT_CURRENCY_SETTINGS.baseCurrency,
  locale = DEFAULT_CURRENCY_SETTINGS.locale,
}: AccountsViewProps) {
  const active = accounts.filter((a) => !a.archivedAt);
  const totalNet = active.reduce((s, a) => s + accountEffectiveBalance(a, transactions), 0);

  function fmt(amount: number, currency?: string) {
    return formatCurrency(amount, currency ?? baseCurrency, locale);
  }

  return (
    <div>
      <div className="accounts-list">
        <button
          className={"account-card" + (activeAccountId === null ? " active" : "")}
          onClick={() => onSelectAccount(null)}
        >
          <div>
            <span className="account-card-name">All accounts</span>
            <span className="account-card-sub">{active.length} account{active.length !== 1 ? "s" : ""}</span>
          </div>
          <span className={"account-card-balance " + (totalNet >= 0 ? "positive" : "negative")}>
            {fmt(totalNet)}
          </span>
        </button>

        {active.length === 0 && (
          <p className="empty-state" style={{ textAlign: "center", padding: "var(--space-xl) 0", color: "var(--text-secondary)", fontSize: 14 }}>
            No accounts yet. Add one to start tracking your finances.
          </p>
        )}

        {active.map((a) => {
          const balance = accountEffectiveBalance(a, transactions);
          return (
            <button
              key={a.id}
              className={"account-card" + (activeAccountId === a.id ? " active" : "")}
              onClick={() => onSelectAccount(activeAccountId === a.id ? null : a.id)}
            >
              <div className="account-card-info">
                <span className="account-card-name">
                  {a.name}
                  {a.currency && a.currency !== baseCurrency && (
                    <span className="account-currency-badge">{a.currency}</span>
                  )}
                </span>
                <span className={`account-kind-badge ${kindBadgeClass[normalizeKind(a.kind)] ?? "badge-misc"}`}>
                  {kindLabels[normalizeKind(a.kind)] ?? a.subtitle}
                </span>
              </div>
              <span className={"account-card-balance " + (balance >= 0 ? "positive" : "negative")}>
                {fmt(balance, a.currency || baseCurrency)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function normalizeKind(kind: string): string {
  return kind === "credit" ? "credit-card" : kind;
}
