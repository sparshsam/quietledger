"use client";

import type { Account, Transaction } from "@/lib/data/types";
import { accountEffectiveBalance } from "@/lib/finance/totals";

const currency = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

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

/** Returns true if this account type normally carries a liability balance. */
function isLiability(kind: string): boolean {
  return kind === "credit-card" || kind === "credit" || kind === "loan";
}

type AccountsViewProps = {
  accounts: Account[];
  transactions: Transaction[];
  activeAccountId: string | null;
  onSelectAccount: (id: string | null) => void;
};

export function AccountsView({ accounts, transactions, activeAccountId, onSelectAccount }: AccountsViewProps) {
  const active = accounts.filter((a) => !a.archivedAt);
  const totalNet = active.reduce((s, a) => s + accountEffectiveBalance(a, transactions), 0);

  return (
    <div>
      <div className="accounts-list">
        {/* "All accounts" summary card */}
        <button
          className={"account-card" + (activeAccountId === null ? " active" : "")}
          onClick={() => onSelectAccount(null)}
        >
          <div>
            <span className="account-card-name">All accounts</span>
            <span className="account-card-sub">{active.length} account{active.length !== 1 ? "s" : ""}</span>
          </div>
          <span className={"account-card-balance " + (totalNet >= 0 ? "positive" : "negative")}>
            {currency.format(totalNet)}
          </span>
        </button>

        {active.length === 0 && (
          <p className="empty-state" style={{ textAlign: "center", padding: "var(--space-xl) 0", color: "var(--text-secondary)", fontSize: 14 }}>
            No accounts yet. Add one to start tracking your finances.
          </p>
        )}

        {active.map((a) => {
          const balance = accountEffectiveBalance(a, transactions);
          // For liability accounts (credit cards, loans) the "normal" state is
          // a negative balance (you owe money). We still apply the CSS class
          // directly so negative = red, positive = green, but the meaning
          // is context-aware: a credit card with -$500 is "normal" debt.
          return (
            <button
              key={a.id}
              className={"account-card" + (activeAccountId === a.id ? " active" : "")}
              onClick={() => onSelectAccount(activeAccountId === a.id ? null : a.id)}
            >
              <div className="account-card-info">
                <span className="account-card-name">{a.name}</span>
                <span className={`account-kind-badge ${kindBadgeClass[normalizeKind(a.kind)] ?? "badge-misc"}`}>
                  {kindLabels[normalizeKind(a.kind)] ?? a.subtitle}
                </span>
              </div>
              <span className={"account-card-balance " + (balance >= 0 ? "positive" : "negative")}>
                {currency.format(balance)}
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
