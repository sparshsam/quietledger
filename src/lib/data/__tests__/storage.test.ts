import { describe, it, expect, vi, beforeEach } from "vitest";
import { getStorageBackend, getStorageInfo, StorageBackend } from "../storage";

describe("getStorageBackend", () => {
  it("returns a valid backend", () => {
    const backend = getStorageBackend();
    expect(["indexeddb", "localstorage", "none"]).toContain(backend);
  });
});

describe("getStorageInfo", () => {
  it("returns storage info object", async () => {
    const info = await getStorageInfo();
    expect(info).toHaveProperty("backend");
    expect(info).toHaveProperty("keyCount");
    expect(info).toHaveProperty("estimatedBytes");
    expect(["indexeddb", "localstorage", "none"]).toContain(info.backend);
  });
});
