import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  saveLedgerStateAtomic,
  hasSavepoint,
  recoverFromSavepoint,
  SAVEPOINT_KEY,
  LEDGER_STORAGE_KEY,
  createDemoLedgerState,
} from "../persistence";

// Create a mock storage for testing
function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { store.set(key, value); }),
    removeItem: vi.fn((key: string) => { store.delete(key); }),
    clear: vi.fn(() => store.clear()),
    get length() { return store.size; },
    key: vi.fn((index: number) => [...store.keys()][index] ?? null),
  };
}

describe("crash recovery", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMockStorage();
  });

  it("writes savepoint then main key on atomic save", () => {
    const state = createDemoLedgerState();
    saveLedgerStateAtomic(storage, state);

    // Savepoint should be cleared
    expect(storage.getItem(SAVEPOINT_KEY)).toBeNull();
    // Main key should be set
    expect(storage.getItem(LEDGER_STORAGE_KEY)).not.toBeNull();
  });

  it("detects savepoint on crash", () => {
    // Simulate crash: savepoint exists but main key doesn't
    storage.setItem(SAVEPOINT_KEY, JSON.stringify(createDemoLedgerState()));
    expect(hasSavepoint(storage)).toBe(true);
  });

  it("recovers from savepoint", () => {
    const demo = { ...createDemoLedgerState(), savedAt: new Date().toISOString() };
    storage.setItem(SAVEPOINT_KEY, JSON.stringify(demo));

    const result = recoverFromSavepoint(storage);
    expect(result.ok).toBe(true);
    // Savepoint should be cleared, data promoted to main key
    expect(storage.getItem(SAVEPOINT_KEY)).toBeNull();
    expect(storage.getItem(LEDGER_STORAGE_KEY)).not.toBeNull();
  });

  it("returns warning when no savepoint exists", () => {
    const result = recoverFromSavepoint(storage);
    expect(result.ok).toBe(false);
  });

  it("handles corrupted savepoint gracefully", () => {
    storage.setItem(SAVEPOINT_KEY, "not-valid-json{{{");
    const result = recoverFromSavepoint(storage);
    expect(result.ok).toBe(false);
    expect(storage.getItem(SAVEPOINT_KEY)).toBeNull();
  });
});
