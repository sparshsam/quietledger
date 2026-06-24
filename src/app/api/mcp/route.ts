/**
 * OpenLedger MCP Server — Vercel HTTP Endpoint (Streamable HTTP)
 *
 * AI agents connect here with their personal access token.
 * The service role key stays server-side in Vercel env vars.
 *
 * Configure your AI agent with:
 *   url: https://openledgerbysparsh.vercel.app/api/mcp
 *   headers: { Authorization: "Bearer <your-token>" }
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { NextRequest } from "next/server";
import { authenticateToken, createServiceClient } from "@/lib/supabase/mcp-auth";
import { registerAllTools } from "@/lib/mcp/register-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creates a transport and connects a fresh MCP server for this request.
 * Stateless mode — one transport per request, no session persistence.
 */
async function createMcpResponse(request: Request): Promise<Response> {
  // ── Auth from Authorization header ──────────────
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return jsonError(401, "Authentication required. Include an Authorization: Bearer <token> header with an MCP access token from OpenLedger Settings → MCP Access.");
  }

  let userId: string;
  try {
    const result = await authenticateToken(token);
    userId = result.userId;
  } catch (err) {
    return jsonError(401, `Authentication failed: ${err instanceof Error ? err.message : "Invalid token"}`);
  }

  // ── Build server & transport ──
  const client = createServiceClient();
  const server = new McpServer({ name: "openledger", version: "0.1.0" });
  registerAllTools(server, () => client, userId);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });

  await server.connect(transport);
  return transport.handleRequest(request);
}

/**
 * POST — Handle JSON-RPC messages (the primary MCP transport method).
 */
export async function POST(request: NextRequest) {
  return createMcpResponse(request);
}

/**
 * GET — Some MCP clients use GET to establish SSE streams.
 */
export async function GET(request: NextRequest) {
  return createMcpResponse(request);
}

/**
 * Shared JSON error helper.
 */
function jsonError(status: number, message: string): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message },
      id: null,
    }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}
