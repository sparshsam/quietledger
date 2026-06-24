"use client";

import Link from "next/link";

export function PublicHeader() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "var(--bg)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 var(--space-lg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 56,
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--text-primary)",
            textDecoration: "none",
            letterSpacing: "-0.02em",
          }}
        >
          OpenLedger
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <NavLink href="/about">About</NavLink>
          <Link
            href="/account"
            style={{
              marginLeft: 8,
              padding: "8px 20px",
              borderRadius: 999,
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 500,
        color: "var(--text-secondary)",
        textDecoration: "none",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-secondary)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </Link>
  );
}
