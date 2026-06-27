"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { registerDevice } from "@/lib/supabase/device";
import type { User } from "@supabase/supabase-js";

const EXPECTED_PROJECT_REF = "qoxmibmbyjmkntzrckyr";

/** Enable verbose auth logging. Set localStorage DEBUG_AUTH=true. */
function isDebugAuth(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("DEBUG_AUTH") === "true";
  } catch {
    return false;
  }
}

type AuthState = {
  user: User | null;
  session: unknown;
  loading: boolean;
  profile: { display_name: string | null; email: string | null; avatar_url: string | null } | null;
};

export type AuthMode = "guest" | "signed-in";

/**
 * Clears all Supabase session cookies whose project ref does NOT match
 * the expected OpenLedger project. Prevents stale sessions from other apps
 * (e.g. OpenSprout on the same localhost domain) from being treated as valid.
 */
function clearWrongProjectCookies() {
  const expectedPrefix = `sb-${EXPECTED_PROJECT_REF}-auth-token`;
  const cookies = document.cookie.split("; ").filter(Boolean);
  let cleared = 0;

  for (const cookie of cookies) {
    const name = cookie.split("=")[0];
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
    clearWrongProjectCookies();

    const supabase = createClient();
    const debug = isDebugAuth();

    const init = async () => {
      if (debug) console.log("[AUTH] Calling getSession()");
      const { data, error } = await supabase.auth.getSession();

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      const urlMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
      const activeRef = urlMatch?.[1] ?? "unknown";

      if (debug) {
        console.log("[AUTH] getSession():", {
          supabaseUrlRef: activeRef,
          expectedRef: EXPECTED_PROJECT_REF,
          refsMatch: activeRef === EXPECTED_PROJECT_REF,
          hasSession: !!data.session,
          hasUser: !!data.session?.user,
        });
      }

      if (activeRef !== EXPECTED_PROJECT_REF) {
        console.error(
          `[AUTH] CRITICAL: SUPABASE_URL ref "${activeRef}" != expected "${EXPECTED_PROJECT_REF}". Auth will not work.`,
        );
      }

      const user = data.session?.user ?? null;
      let profile = null;

      if (user) {
        if (debug) console.log("[AUTH] User found, fetching profile");
        profile = await fetchProfile(supabase, user.id);
        registerDevice().catch(() => {});
      }

      setState({ user, session: data.session, loading: false, profile });
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (debug) {
        console.log("[AUTH] Event:", event, "| Session:", !!session, "| User:", session?.user?.id?.substring(0, 12));
      }

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
