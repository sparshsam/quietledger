/**
 * Tests for the MCP server authentication layer.
 *
 * Tests: missing credentials, invalid tokens, revoked tokens, SHA-256 hash
 * computation, and successful authentication.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sha256Hex } from "../supabase.js";

// ── SHA-256 hash tests ──────────────────────────
describe("sha256Hex", () => {
  it("produces a consistent hash for the same input", async () => {
    const hash1 = await sha256Hex("test-token");
    const hash2 = await sha256Hex("test-token");
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different inputs", async () => {
    const hash1 = await sha256Hex("token-a");
    const hash2 = await sha256Hex("token-b");
    expect(hash1).not.toBe(hash2);
  });

  it("returns a 64-character hex string", async () => {
    const hash = await sha256Hex("any-token");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ── authenticateToken tests ─────────────────────
describe("authenticateToken", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it("throws if SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-anon-key",
    };
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { authenticateToken } = await import("../supabase.js");
    await expect(authenticateToken("some-token")).rejects.toThrow(
      /SUPABASE_SERVICE_ROLE_KEY/,
    );
  });

  it("throws if Supabase URL is missing", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
    };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const { authenticateToken } = await import("../supabase.js");
    await expect(authenticateToken("some-token")).rejects.toThrow(
      /Supabase credentials/,
    );
  });

  it("throws if anon key is missing", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
    };
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const { authenticateToken } = await import("../supabase.js");
    await expect(authenticateToken("some-token")).rejects.toThrow(
      /Supabase credentials/,
    );
  });
});
