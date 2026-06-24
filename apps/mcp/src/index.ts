#!/usr/bin/env node

/**
 * OpenLedger MCP Server — Entry Point
 *
 * Connects to Supabase via service-role client, authenticates via SHA-256
 * hashed token, and registers domain-specific tools for AI agents.
 *
 * Usage:
 *   OPENLEDGER_ACCESS_TOKEN=<token> node dist/index.js
 *
 * Environment variables required:
 *   OPENLEDGER_ACCESS_TOKEN  — MCP access token (generated from settings page)
 *   NEXT_PUBLIC_SUPABASE_URL — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Service role key (server-only)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { authenticateToken, type Client } from "./supabase.js";
import { registerAllTools } from "./register-tools.js";

async function main() {
  const token = process.env.OPENLEDGER_ACCESS_TOKEN;
  if (!token) {
    console.error(
      "MCP server failed to start: OPENLEDGER_ACCESS_TOKEN is not set.\n" +
      "Generate a token from the OpenLedger Settings → MCP Access Tokens page\n" +
      "and set it as the OPENLEDGER_ACCESS_TOKEN environment variable.",
    );
    process.exit(1);
  }

  let client: Client;
  let userId: string;
  try {
    const result = await authenticateToken(token);
    client = result.client;
    userId = result.userId;
    console.error(
      `OpenLedger MCP server authenticated for user ${userId}. Starting tools...`,
    );
  } catch (authError) {
    console.error(
      "MCP server failed to start: authentication error.\n" +
      "Error details:",
      authError instanceof Error ? authError.message : String(authError),
    );
    process.exit(1);
  }

  const getClient = () => client;

  // ── Server ──────────────────────────────────────
  const server = new McpServer({
    name: "openledger",
    version: "0.1.0",
    description: "OpenLedger personal finance tools — accounts, transactions, budgets, goals, and financial insights.",
  });

  // ── Register all 30 tools ──────────────────────
  registerAllTools(server, getClient, userId);

  // ── Connect ─────────────────────────────────────
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(
    "OpenLedger MCP server encountered a fatal error and will exit.\n" +
    "Error details:",
    err instanceof Error
      ? `${err.name}: ${err.message}\n${err.stack}`
      : String(err),
  );
  process.exit(1);
});
