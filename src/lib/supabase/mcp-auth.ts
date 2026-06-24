/**
 * MCP Auth — token validation for the hosted MCP endpoint.
 *
 * Uses the service-role admin client to look up SHA-256 hashed tokens
 * in the openledger_mcp_tokens table. The raw token is never stored.
 */
import { createAdminClient } from "@/lib/supabase/admin";

export type Client = ReturnType<typeof createAdminClient>;

/**
 * Validates an MCP access token by SHA-256 hashing it and looking up
 * the hash in openledger_mcp_tokens.
 *
 * @returns The authenticated user's Supabase auth ID.
 */
export async function authenticateToken(
  rawToken: string,
): Promise<{ userId: string }> {
  const hashHex = await sha256Hex(rawToken);
  const admin = createAdminClient();

  const { data: records, error: lookupError } = await admin
    .from("openledger_mcp_tokens")
    .select("user_id, id, revoked_at")
    .eq("token_hash", hashHex);

  if (lookupError || !records || records.length === 0) {
    throw new Error(
      "Invalid access token. Generate a new one from OpenLedger Settings → MCP Access.",
    );
  }

  const record = records[0] as {
    user_id: string;
    id: string;
    revoked_at: string | null;
  };

  if (record.revoked_at) {
    throw new Error(
      "This access token has been revoked. Generate a new one from Settings → MCP Access.",
    );
  }

  // Update last_used_at (fire and forget)
  void (admin
    .from("openledger_mcp_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", record.id));

  return { userId: record.user_id };
}

/**
 * Creates a service-role Supabase client for MCP data queries.
 * The client bypasses RLS — every query must filter by user_id.
 */
export function createServiceClient(): Client {
  return createAdminClient();
}

async function sha256Hex(input: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
