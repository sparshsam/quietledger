"use client";

import type { Account, Transaction } from "@/lib/data/types";
import { accountEffectiveBalance } from "@/lib/finance/totals";

const currency = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

type AccountsViewProps = {
  accounts: Account[];
  transactions: Transaction[];
  activeAccountId: string | null;
  onSelectAccount: (id: string | null) => void;
};

export function AccountsView({ accounts, transactions, activeAccountId, onSelectAccount }: AccountsViewProps) {
  const active = accounts.filter((a) => !a.archivedAt);

  return (
    <div>
      <h2 className="section-title" style={{ marginBottom: "var(--space-md)" }}>Accounts</h2>
      <div className="accounts-list">
        {/* "All accounts" option */}
        <button
          className={"account-card" + (activeAccountId === null ? " active" : "")}
          onClick={() => onSelectAccount(null)}
        >
          <div>
            <span className="account-card-name">All accounts</span>
            <span className="account-card-sub">{active.length} accounts</span>
          </div>
          <span className="account-card-balance">
            {currency.format(active.reduce((s, a) => s + a.balance, 0))}
          </span>
        </button>

        {active.map((a) => (
          <button
            key={a.id}
            className={"account-card" + (activeAccountId === a.id ? " active" : "")}
            onClick={() => onSelectAccount(activeAccountId === a.id ? null : a.id)}
          >
            <div>
              <span className="account-card-name">{a.name}</span>
              <span className="account-card-sub">{a.subtitle}</span>
            </div>
            <span className={"account-card-balance " + (a.balance >= 0 ? "positive" : "negative")}>
              {currency.format(accountEffectiveBalance(a, transactions))}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
