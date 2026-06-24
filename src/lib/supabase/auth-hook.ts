"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { registerDevice } from "@/lib/supabase/device";
import type { User } from "@supabase/supabase-js";

type AuthState = {
  user: User | null;
  session: unknown;
  loading: boolean;
  profile: { display_name: string | null; email: string | null; avatar_url: string | null } | null;
};

export type AuthMode = "guest" | "signed-in";

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    profile: null,
  });

  useEffect(() => {
    const supabase = createClient();

    const getInitialSession = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      let profile = null;

      if (user) {
        profile = await fetchProfile(supabase, user.id);

        // Register device silently on sign-in
        registerDevice().catch(() => {});
      }

      setState({ user, session: data.session, loading: false, profile });
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      let profile = null;

      if (user) {
        profile = await fetchProfile(
          supabase,
          user.id,
          user.user_metadata?.full_name as string | undefined,
          user.email as string | undefined,
          user.user_metadata?.avatar_url as string | undefined,
        );

        // Register device silently on sign-in
        registerDevice().catch(() => {});
      }

      setState({ user, session, loading: false, profile });
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

  // Create profile on first sign-in
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
