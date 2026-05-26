import type { ImportMetadata, LedgerData, Transaction } from "./types";

export function createLedgerExport(
  data: LedgerData,
  importedTransactions: Transaction[] = data.transactions.filter((transaction) => transaction.source === "csv"),
  importMetadata: ImportMetadata[] = data.importMetadata ?? [],
) {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    accounts: data.accounts,
    transactions: data.transactions,
    importedTransactions,
    importMetadata,
    monthlySnapshots: data.monthlySnapshots,
    memories: data.memories,
    forecastItems: data.forecastItems,
  };
}

export function downloadLedgerExport(
  data: LedgerData,
  importedTransactions?: Transaction[],
  importMetadata?: ImportMetadata[],
) {
  const payload = JSON.stringify(createLedgerExport(data, importedTransactions, importMetadata), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "quietledger-export.json";
  anchor.click();
  URL.revokeObjectURL(url);
}
