"use client";

import { WalletCards, ReceiptText, BarChart3, LogIn, Cloud } from "lucide-react";

export function NoAccounts() {
  return (
    <div className="empty-state" role="status">
      <WalletCards size={32} aria-hidden />
      <strong>No accounts yet</strong>
      <p>Create an account to start tracking your finances.</p>
    </div>
  );
}

export function NoTransactions() {
  return (
    <div className="empty-state" role="status">
      <ReceiptText size={32} aria-hidden />
      <strong>No transactions found</strong>
      <p>Add a transaction or import a CSV to get started.</p>
    </div>
  );
}

export function NoChartData({ message }: { message?: string }) {
  return (
    <div className="chart-empty" role="status">
      <BarChart3 size={28} aria-hidden />
      <p>{message ?? "Not enough data for this chart yet."}</p>
    </div>
  );
}

export function GuestModeGuidance() {
  return (
    <div className="empty-state guidance-banner" role="status">
      <LogIn size={20} aria-hidden />
      <div>
        <strong>Guest mode</strong>
        <p>You&rsquo;re using OpenLedger without an account. Your data stays on this device.</p>
      </div>
    </div>
  );
}

export function CloudBackupGuidance() {
  return (
    <div className="empty-state guidance-banner" role="status">
      <Cloud size={20} aria-hidden />
      <div>
        <strong>Cloud backup available</strong>
        <p>Your data is saved locally. Use the Cloud Backup panel to manually back up or restore from the cloud.</p>
      </div>
    </div>
  );
}
