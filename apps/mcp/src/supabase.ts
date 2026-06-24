/**
 * Supabase auth and client creation for the MCP server.
 *
 * Uses SHA-256 hashed token authentication stored in the openledger_mcp_tokens
 * table. The raw token is shown to the user once at creation; only the hash
 * persists in the database.
 *
 * IMPORTANT: This creates a service-role client that BYPASSES RLS. Every query
 * must explicitly filter by user_id to maintain data isolation.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types.js";

export type Client = SupabaseClient<Database>;

function env(key: string): string {
  return process.env[key] ?? "";
}

/**
 * Computes the SHA-256 hex digest of a string.
 */
export async function sha256Hex(input: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Authenticates an access token by SHA-256 hashing it and looking up the hash
 * in the openledger_mcp_tokens table. Returns a service-role Supabase client
 * and the authenticated user's ID.
 *
 * @throws Error if credentials are missing, the token is invalid, or revoked.
 */
export async function authenticateToken(
  rawToken: string,
): Promise<{ client: Client; userId: string }> {
  const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey =
    env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || env("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  if (!serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY for token validation. " +
      "This is required because the MCP server uses the service role to bypass RLS " +
      "and enforce user isolation in application code.",
    );
  }

  const tokenHash = await sha256Hex(rawToken);

  // Service-role client for auth queries (can read mcp_tokens)
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: records, error: lookupError } = await admin
    .from("openledger_mcp_tokens")
    .select("user_id, id, revoked_at")
    .eq("token_hash", tokenHash);

  if (lookupError) {
    throw new Error(
      `Token validation failed: unable to verify access token. ${lookupError.message}`,
    );
  }

  if (!records || records.length === 0) {
    throw new Error(
      "Authentication failed: Invalid access token. " +
      "The token provided does not match any active token. " +
      "Generate a new token from the OpenLedger settings page.",
    );
  }

  const record = records[0] as {
    user_id: string;
    id: string;
    revoked_at: string | null;
  };

  if (record.revoked_at) {
    throw new Error(
      "Authentication failed: This access token has been revoked. " +
      "Generate a new token from the OpenLedger settings page.",
    );
  }

  // Update last_used_at — fire-and-forget (non-critical)
  await admin
    .from("openledger_mcp_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", record.id);

  // Return a fresh service-role client for data queries
  const client = createClient<Database>(supabaseUrl, serviceKey);
  return { client, userId: record.user_id };
}

/**
 * Generates a cryptographically random MCP access token.
 * Format: `ol_<32-random-hex-chars>`
 */
export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `ol_${hex}`;
}
