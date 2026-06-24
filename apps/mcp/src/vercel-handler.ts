/**
 * Vercel Serverless Handler for OpenLedger MCP Server.
 *
 * Uses Streamable HTTP transport so AI agents connect via URL + token.
 * No service role key needed on the client — it stays in Vercel env vars.
 *
 * Usage in AI agent config:
 *   URL: https://openledgerbysparsh.vercel.app/api/mcp
 *   Auth: Authorization: Bearer <personal-access-token>
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateToken } from "./supabase.js";
import { registerAllTools } from "./register-tools.js";

/**
 * Handles an incoming MCP-over-HTTP request.
 *
 * 1. Extracts the bearer token from the Authorization header
 * 2. Validates it against the DB (SHA-256 hash lookup)
 * 3. Creates a fresh McpServer with tools scoped to the authenticated user
 * 4. Processes the JSON-RPC message and returns the response
 */
export async function handleMcpRequest(request: Request): Promise<Response> {
  // ── Auth ────────────────────────────────────────
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message:
            "Authentication required. Include an Authorization: Bearer <token> header " +
            "with a valid MCP access token from your OpenLedger Settings page.",
        },
        id: null,
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  let userId: string;
  try {
    const result = await authenticateToken(token);
    userId = result.userId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid access token";
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: `Authentication failed: ${msg}` },
        id: null,
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // ── Server setup (per-request — fresh transport per request) ──
  const client = (await authenticateToken(token)).client;

  const server = new McpServer({
    name: "openledger",
    version: "0.1.0",
    description:
      "OpenLedger personal finance tools — accounts, transactions, budgets, goals, and financial insights.",
  });

  registerAllTools(server, () => client, userId);

  // ── Stateless transport (one request per transport) ──
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);
  return transport.handleRequest(request);
}
