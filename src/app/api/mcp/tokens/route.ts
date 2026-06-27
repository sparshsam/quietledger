/**
 * MCP Token Management API
 *
 * POST /api/mcp/tokens — Create a new MCP access token
 * GET  /api/mcp/tokens — List all tokens for the current user
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST: Create a new MCP access token.
 * Returns the raw token once — it is not stored and cannot be retrieved again.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required. Sign in with Google to manage MCP tokens." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        { error: "Token name is required. Give your token a descriptive name so you can identify it later." },
        { status: 400 },
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: "Token name must be 100 characters or fewer." },
        { status: 400 },
      );
    }

    // Generate token: ol_<32 random hex chars>
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const rawToken = `ol_${hex}`;

    // SHA-256 hash
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(rawToken),
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Store hash + prefix in the database
    const admin = createAdminClient();
    const { error: insertError } = await admin
      .from("openledger_mcp_tokens")
      .insert({
        name,
        user_id: user.id,
        token_hash: tokenHash,
        token_prefix: rawToken.slice(0, 10) + "...",
      });

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to create token: ${insertError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      token: rawToken,
      message:
        "Token created successfully. This is the only time the full token will be shown. " +
        "Save it somewhere safe — you will need it to configure your MCP client.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET: List all MCP tokens for the current user.
 * Never returns the token_hash — only metadata (name, prefix, created, last used, revoked).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    // Use the authenticated client — RLS policy allows users to SELECT
    // their own tokens (auth.uid() = user_id). No need for service role.
    const { data, error } = await supabase
      .from("openledger_mcp_tokens")
      .select("id, name, token_prefix, last_used_at, created_at, revoked_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: `Failed to list tokens: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ tokens: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
