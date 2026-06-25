import type { LearnedCategory } from "./types";

export const CATEGORY_HIERARCHY: Record<string, string[]> = {
  Food: ["Groceries", "Restaurants", "Coffee", "Delivery"],
  Housing: ["Rent", "Utilities", "Internet", "Phone", "Insurance"],
  Transport: ["Fuel", "Transit", "Taxi"],
  Income: ["Payroll", "Transfer", "Interest", "Refund"],
  Subscriptions: ["Streaming", "Software", "Cloud"],
  Shopping: ["Online", "Retail", "Clothing", "Electronics"],
  Health: ["Pharmacy", "Medical", "Fitness"],
  Debt: ["Loan", "Credit Card"],
  Misc: ["Other"],
};

export const PARENT_LABELS = Object.keys(CATEGORY_HIERARCHY);

export type CategorySummary = { parent: string; child: string; display: string };

export type CategoryKeywordEntry = {
  parent: string;
  child: string;
  patterns: string[];
};

export const CATEGORY_KEYWORDS: CategoryKeywordEntry[] = [
  // Food
  { parent: "Food", child: "Groceries", patterns: ["loblaws", "metro", "costco", "superstore", "no frills", "walmart", "safeway", "freshco", "food basics", "save on foods"] },
  { parent: "Food", child: "Restaurants", patterns: ["mcdonald", "burger king", "wendy", "subway", "pizza", "sushi", "kfc", "taco bell", "diner", "restaurant"] },
  { parent: "Food", child: "Coffee", patterns: ["starbucks", "tim hortons", "second cup", "coffee"] },
  { parent: "Food", child: "Delivery", patterns: ["uber eats", "doordash", "skip", "takeout"] },
  // Housing
  { parent: "Housing", child: "Rent", patterns: ["rent", "landlord"] },
  { parent: "Housing", child: "Utilities", patterns: ["hydro", "enbridge", "water", "utility"] },
  { parent: "Housing", child: "Internet", patterns: ["internet", "bell internet", "rogers internet", "telus internet"] },
  { parent: "Housing", child: "Phone", patterns: ["mobile", "phone", "bell mobility", "rogers wireless", "telus mobility"] },
  // Transport
  { parent: "Transport", child: "Fuel", patterns: ["gas", "fuel", "shell", "esso", "petro canada"] },
  { parent: "Transport", child: "Transit", patterns: ["presto", "ttc", "transit", "bus", "train", "go transit"] },
  { parent: "Transport", child: "Taxi", patterns: ["uber", "lyft", "taxi"] },
  // Income
  { parent: "Income", child: "Payroll", patterns: ["salary", "payroll", "deposit", "paycheque", "direct dep", "direct deposit"] },
  { parent: "Income", child: "Transfer", patterns: ["etransfer", "transfer", "interac"] },
  // Subscriptions
  { parent: "Subscriptions", child: "Streaming", patterns: ["netflix", "spotify", "apple music", "disney"] },
  { parent: "Subscriptions", child: "Software", patterns: ["adobe", "microsoft 365", "google storage", "icloud"] },
  // Shopping
  { parent: "Shopping", child: "Online", patterns: ["amazon", "ebay", "etsy"] },
  { parent: "Shopping", child: "Retail", patterns: ["ikea", "homedepot", "canadian tire"] },
  // Health
  { parent: "Health", child: "Pharmacy", patterns: ["shoppers", "pharmacy", "drug mart", "rexall"] },
  { parent: "Health", child: "Medical", patterns: ["clinic", "doctor", "dental", "optometrist"] },
  // Debt
  { parent: "Debt", child: "Loan", patterns: ["loan", "student loan"] },
  { parent: "Debt", child: "Credit Card", patterns: ["credit card payment", "credit card pmt"] },
];

export function autoCategorize(
  description: string,
  learnings: LearnedCategory[],
): { parent: string; child: string } | null {
  const normalized = description.toLowerCase().trim();

  // 1. Check learned patterns first
  for (const l of learnings) {
    if (normalized.includes(l.pattern)) {
      return { parent: l.parent, child: l.child };
    }
  }

  // 2. Fall back to keyword map
  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.patterns.some((p) => normalized.includes(p))) {
      return { parent: entry.parent, child: entry.child };
    }
  }

  return null;
}
