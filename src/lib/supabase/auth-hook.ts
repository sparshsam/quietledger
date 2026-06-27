"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { registerDevice } from "@/lib/supabase/device";
import type { User } from "@supabase/supabase-js";

/** The expected Supabase project ref for OpenLedger. */
const EXPECTED_PROJECT_REF = "qoxmibmbyjmkntzrckyr";

type AuthState = {
  user: User | null;
  session: unknown;
  loading: boolean;
  profile: { display_name: string | null; email: string | null; avatar_url: string | null } | null;
};

export type AuthMode = "guest" | "signed-in";

/**
 * Clears all Supabase session cookies whose project ref does NOT match
 * the expected OpenLedger project. This prevents stale sessions from other
 * apps (e.g. OpenSprout running on the same localhost domain) from being
 * treated as valid OpenLedger sessions.
 */
function clearWrongProjectCookies() {
  const expectedPrefix = `sb-${EXPECTED_PROJECT_REF}-auth-token`;
  const cookies = document.cookie.split("; ").filter(Boolean);
  let cleared = 0;

  for (const cookie of cookies) {
    const name = cookie.split("=")[0];
    // Clear any sb-* cookie that isn't for our project
    if (name.startsWith("sb-") && !name.startsWith(expectedPrefix)) {
      document.cookie = `${name}=; path=/; max-age=0; sameSite=lax`;
      cleared++;
    }
  }

  if (cleared > 0) {
    console.warn(`[AUTH] Cleared ${cleared} stale Supabase cookie(s) from other projects`);
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    profile: null,
  });

  useEffect(() => {
    // Dev guard: clear any Supabase cookies from OTHER projects
    // (e.g., OpenSprout's sb-rbdyrymtgfqqkdemicdo-auth-token on localhost)
    clearWrongProjectCookies();

    const supabase = createClient();

    const init = async () => {
      console.log("[AUTH] Calling getSession() from init");
      const { data, error } = await supabase.auth.getSession();

      // Verify the session cookie matches our project
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      const urlMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
      const activeRef = urlMatch?.[1] ?? "unknown";

      console.log("[AUTH] getSession() result:", {
        supabaseUrlRef: activeRef,
        expectedRef: EXPECTED_PROJECT_REF,
        refsMatch: activeRef === EXPECTED_PROJECT_REF,
        hasSession: !!data.session,
        hasUser: !!data.session?.user,
        userId: data.session?.user?.id?.substring(0, 12),
        hasAccessToken: !!data.session?.access_token,
        hasRefreshToken: !!data.session?.refresh_token,
        error: error?.message,
      });

      // If the Supabase URL doesn't match our project, something is wrong
      if (activeRef !== EXPECTED_PROJECT_REF) {
        console.error(
          `[AUTH] CRITICAL: NEXT_PUBLIC_SUPABASE_URL project ref "${activeRef}" ` +
          `does not match expected "${EXPECTED_PROJECT_REF}". Sign-in will not work.`,
        );
      }

      const user = data.session?.user ?? null;
      let profile = null;

      if (user) {
        console.log("[AUTH] User found, fetching profile");
        profile = await fetchProfile(supabase, user.id);
        registerDevice().catch(() => {});
      }

      console.log("[AUTH] Setting state:", { hasUser: !!user, loading: false });
      setState({ user, session: data.session, loading: false, profile });
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[AUTH] onAuthStateChange ────────────────────");
      console.log("[AUTH] Event:", event);
      console.log("[AUTH] Session exists:", !!session);
      console.log("[AUTH] User ID:", session?.user?.id?.substring(0, 12) ?? null);
      console.log("[AUTH] Access token present:", !!session?.access_token);
      console.log("[AUTH] Refresh token present:", !!session?.refresh_token);

      // Log the cookie prefix summary (not full values)
      const cookies = document.cookie.split("; ").filter(Boolean);
      const sbCookies = cookies.filter((c) => c.startsWith("sb-"));
      console.log("[AUTH] Supabase cookies found:", sbCookies.length > 0 ? sbCookies.map((c) => c.split("=")[0]).join(", ") : "none");

      const user = session?.user ?? null;
      let profile = null;

      if (user) {
        fetchProfile(
          supabase,
          user.id,
          user.user_metadata?.full_name as string | undefined,
          user.email as string | undefined,
          user.user_metadata?.avatar_url as string | undefined,
        ).then((p) => {
          profile = p;
          registerDevice().catch(() => {});
          setState({ user, session, loading: false, profile: p });
        });
      } else {
        setState({ user, session, loading: false, profile });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return state;
}

async function fetchProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  displayName?: string,
  email?: string,
  avatarUrl?: string,
) {
  const { data: existing } = await supabase
    .from("openledger_profiles")
    .select("display_name, email, avatar_url")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing;

  const { data: created } = await supabase
    .from("openledger_profiles")
    .insert({
      user_id: userId,
      display_name: displayName ?? null,
      email: email ?? null,
      avatar_url: avatarUrl ?? null,
    })
    .select("display_name, email, avatar_url")
    .single();

  return created ?? null;
}

export function getAuthMode(user: User | null): AuthMode {
  return user ? "signed-in" : "guest";
}
