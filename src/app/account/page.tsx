"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";

export default function AccountPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        router.replace("/app");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/app`,
      },
    });
    if (err) {
      setError(err.message);
      setSigningIn(false);
    }
  };

  if (checking) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          color: "var(--text-tertiary)",
          fontSize: 14,
        }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <PublicHeader />

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(40px, 6vh, 64px) var(--space-lg)",
        }}
      >
        <div style={{ maxWidth: 400, width: "100%" }}>
          <h1
            style={{
              textAlign: "center",
              fontSize: 24,
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: "0 0 8px",
              letterSpacing: "-0.02em",
            }}
          >
            OpenLedger
          </h1>
          <p
            style={{
              textAlign: "center",
              fontSize: 14,
              color: "var(--text-tertiary)",
              marginBottom: 40,
              lineHeight: 1.5,
            }}
          >
            Know where your money went.
          </p>

          {/* Google sign-in */}
          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              width: "100%",
              padding: "14px 24px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-primary)",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              minHeight: 48,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-secondary)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface)")}
          >
            <GoogleIcon />
            {signingIn ? "Redirecting…" : "Continue with Google"}
          </button>

          {error ? (
            <p
              style={{
                color: "var(--negative)",
                fontSize: 13,
                textAlign: "center",
                marginTop: 12,
              }}
            >
              {error}
            </p>
          ) : null}

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              margin: "28px 0",
              color: "var(--text-tertiary)",
              fontSize: 12,
            }}
          >
            <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span>or</span>
            <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          {/* Guest entry */}
          <Link
            href="/app"
            style={{
              display: "block",
              textAlign: "center",
              padding: "14px 24px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-secondary)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            Try without account
          </Link>

          <p
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "var(--text-tertiary)",
              marginTop: 24,
              lineHeight: 1.5,
            }}
          >
            No account needed to start. Your data stays on this device until you
            choose to sign in.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
