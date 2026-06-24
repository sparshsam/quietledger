/**
 * MCP Token Management — Single Token Operations
 *
 * DELETE /api/mcp/tokens/[id] — Revoke a token
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DELETE: Revoke an MCP access token by setting its revoked_at timestamp.
 * Revoked tokens cannot be used for authentication.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const { id } = await params;

    // Verify the token belongs to the current user
    const admin = createAdminClient();
    const { data: existing, error: checkError } = await admin
      .from("openledger_mcp_tokens")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { error: "Token not found." },
        { status: 404 },
      );
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { error: "Access denied. You can only revoke your own tokens." },
        { status: 403 },
      );
    }

    const { error: updateError } = await admin
      .from("openledger_mcp_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to revoke token: ${updateError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Token revoked successfully." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
