import type { RecurringEntry } from "@/lib/data/types";

/**
 * Calculate the next occurrence date based on frequency and current nextDate.
 */
export function calculateNextDate(entry: {
  frequency: string;
  nextDate: string;
  intervalDays?: number;
}): string {
  const d = new Date(entry.nextDate + "T12:00:00");

  switch (entry.frequency) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "custom": {
      const days = entry.intervalDays ?? 30;
      d.setDate(d.getDate() + days);
      break;
    }
    default:
      d.setDate(d.getDate() + 7);
  }

  return d.toISOString().slice(0, 10);
}

/**
 * Generate upcoming entries for the next N days.
 * Returns a sorted list of { entry, dueDate } pairs.
 * Only active entries are included.
 */
export function generateUpcomingEntries(
  entries: RecurringEntry[],
  days: number,
): Array<{ entry: RecurringEntry; dueDate: string }> {
  const results: Array<{ entry: RecurringEntry; dueDate: string }> = [];
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const horizon = new Date(today.getTime() + days * 86_400_000);
  const horizonStr = horizon.toISOString().slice(0, 10);

  for (const entry of entries) {
    if (entry.status !== "active") continue;
    if (entry.endDate && entry.endDate < todayStr) continue;

    let currentDate = entry.nextDate;
    let guard = 0;

    while (currentDate <= horizonStr && guard < 365) {
      guard += 1;
      if (entry.endDate && currentDate > entry.endDate) break;

      if (currentDate >= todayStr) {
        results.push({ entry, dueDate: currentDate });
      }

      const next = calculateNextDate({
        frequency: entry.frequency,
        nextDate: currentDate,
        intervalDays: entry.intervalDays,
      });

      if (next <= currentDate) break;
      currentDate = next;
    }
  }

  results.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return results;
}

/**
 * Check if an entry is due today or overdue.
 * An entry is due when it is active and its nextDate is today or earlier.
 */
export function isDue(entry: RecurringEntry): boolean {
  if (entry.status !== "active") return false;
  const today = new Date().toISOString().slice(0, 10);
  return entry.nextDate <= today;
}

/**
 * Skip to the next occurrence without creating a transaction.
 * Advances the nextDate based on the entry's frequency.
 */
export function skipOccurrence(entry: RecurringEntry): RecurringEntry {
  return {
    ...entry,
    nextDate: calculateNextDate(entry),
  };
}
