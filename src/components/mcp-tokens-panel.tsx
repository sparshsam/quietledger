"use client";

/**
 * MCP Tokens Panel — Settings UI for managing MCP access tokens.
 *
 * Allows signed-in users to:
 * - Create new MCP access tokens (shown once)
 * - List all tokens (name, prefix, last used, creation date)
 * - Revoke tokens
 */
import { useState, useEffect, useCallback } from "react";

interface McpToken {
  id: string;
  name: string;
  token_prefix: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

interface ApiError {
  error: string;
}

export function McpTokensPanel() {
  const [tokens, setTokens] = useState<McpToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTokenName, setNewTokenName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/mcp/tokens");
      if (!res.ok) {
        const err: ApiError = await res.json();
        throw new Error(err.error || "Failed to load tokens");
      }
      const data = await res.json();
      setTokens(data.tokens ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tokens");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleCreate = async () => {
    const name = newTokenName.trim();
    if (!name || name.length > 100) return;

    try {
      setCreating(true);
      setError(null);
      setNewToken(null);

      const res = await fetch("/api/mcp/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create token");
      }

      setNewToken(data.token);
      setNewTokenName("");
      await fetchTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create token");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      setRevokingId(id);
      setError(null);

      const res = await fetch(`/api/mcp/tokens/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data: ApiError = await res.json();
        throw new Error(data.error || "Failed to revoke token");
      }

      await fetchTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke token");
    } finally {
      setRevokingId(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback: select the text manually
    }
  };

  const activeTokens = tokens.filter((t) => !t.revoked_at);
  const revokedTokens = tokens.filter((t) => t.revoked_at);

  return (
    <div>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
        MCP access tokens allow AI agents like Claude Code, ChatGPT, and others to read and write your OpenLedger data on your behalf.
        Tokens are stored as SHA-256 hashes — the raw token is shown once at creation.
      </p>

      {/* Create token form */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 20,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          value={newTokenName}
          onChange={(e) => setNewTokenName(e.target.value)}
          placeholder="Token name (e.g. Claude Code)"
          disabled={creating}
          maxLength={100}
          style={{
            flex: 1,
            minWidth: 200,
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid var(--border)",
            fontSize: 14,
            background: "var(--bg)",
            color: "var(--text-primary)",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newTokenName.trim()}
          style={{
            padding: "8px 20px",
            borderRadius: 999,
            border: "none",
            background: "var(--accent)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 500,
            cursor: creating ? "not-allowed" : "pointer",
            opacity: creating || !newTokenName.trim() ? 0.6 : 1,
          }}
        >
          {creating ? "Creating..." : "Create Token"}
        </button>
      </div>

      {/* New token display */}
      {newToken ? (
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: "var(--accent-light, #f5f0e8)",
            border: "1px solid var(--accent)",
            marginBottom: 20,
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: "var(--accent)", display: "block", marginBottom: 8 }}>
            ⚠️ Copy this token now — it will never be shown again
          </strong>
          <code
            style={{
              display: "block",
              padding: 12,
              background: "var(--bg)",
              borderRadius: 8,
              wordBreak: "break-all",
              fontSize: 12,
              fontFamily: "monospace",
              marginBottom: 8,
              userSelect: "all",
            }}
            onClick={() => copyToClipboard(newToken)}
          >
            {newToken}
          </code>
          <button
            onClick={() => {
              copyToClipboard(newToken);
            }}
            style={{
              padding: "6px 16px",
              borderRadius: 999,
              border: "1px solid var(--accent)",
              background: "transparent",
              color: "var(--accent)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Copy to clipboard
          </button>
        </div>
      ) : null}

      {/* Error */}
      {error ? (
        <p style={{ color: "#c87474", fontSize: 13, marginBottom: 12 }}>
          {error}
        </p>
      ) : null}

      {/* Loading */}
      {loading ? (
        <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
          Loading tokens...
        </p>
      ) : null}

      {/* Active tokens list */}
      {!loading && activeTokens.length > 0 ? (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}>
            Active Tokens
          </p>
          {activeTokens.map((token) => (
            <div
              key={token.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                marginBottom: 6,
                fontSize: 13,
              }}
            >
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                  {token.name}
                </span>
                <span style={{ color: "var(--text-tertiary)", marginLeft: 8, fontFamily: "monospace", fontSize: 12 }}>
                  {token.token_prefix}
                </span>
                <span style={{ color: "var(--text-tertiary)", marginLeft: 8, fontSize: 12 }}>
                  {token.last_used_at
                    ? `Last used: ${new Date(token.last_used_at).toLocaleDateString()}`
                    : "Never used"}
                </span>
              </div>
              <button
                onClick={() => handleRevoke(token.id)}
                disabled={revokingId === token.id}
                style={{
                  padding: "4px 12px",
                  borderRadius: 999,
                  border: "1px solid #c87474",
                  background: "transparent",
                  color: "#c87474",
                  fontSize: 12,
                  cursor: revokingId === token.id ? "not-allowed" : "pointer",
                  opacity: revokingId === token.id ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {revokingId === token.id ? "Revoking..." : "Revoke"}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Revoked tokens */}
      {!loading && revokedTokens.length > 0 ? (
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-tertiary)" }}>
            Revoked Tokens
          </p>
          {revokedTokens.map((token) => (
            <div
              key={token.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                marginBottom: 6,
                fontSize: 13,
                opacity: 0.6,
              }}
            >
              <div style={{ flex: 1 }}>
                <span style={{ color: "var(--text-primary)" }}>
                  {token.name}
                </span>
                <span style={{ color: "var(--text-tertiary)", marginLeft: 8, fontFamily: "monospace", fontSize: 12 }}>
                  {token.token_prefix}
                </span>
                <span style={{ color: "var(--text-tertiary)", marginLeft: 8, fontSize: 12 }}>
                  Revoked {new Date(token.revoked_at!).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Empty state */}
      {!loading && activeTokens.length === 0 && revokedTokens.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", fontStyle: "italic" }}>
          No MCP tokens configured. Create one above to connect AI agents to your OpenLedger data.
        </p>
      ) : null}
    </div>
  );
}
