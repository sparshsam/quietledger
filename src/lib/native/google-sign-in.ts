// ─── Native Google Sign-In ────────────────────────────────────────────────
// Primary: @capacitor/browser (Chrome Custom Tab) — stays in-app, works with
//   Capacitor 8 out of the box. No additional setup needed.
//
// Optional: Native Android account picker — requires a Capacitor 8-compatible
//   Google Auth plugin (e.g. @codetrix-studio/capacitor-google-auth, which
//   currently supports Capacitor 6 only). Install it, set clientId in
//   capacitor.config.ts, and the code below will try it first.
//
// Manual steps for the account picker (future):
//   1. npm install <capacitor-8-compatible-google-auth-plugin>
//   2. Add clientId to capacitor.config.ts under plugins.GoogleAuth.clientId
//   3. Add 'openledger://auth/callback' to Supabase Auth allowed redirect URLs
//   4. Do NOT add the custom scheme to Google Cloud OAuth (Google only accepts https://)

import { getPlatformInfo } from "./platform";

/**
 * Sign in with Google using the in-app browser (Chrome Custom Tab).
 * This is the primary path — it works with Capacitor 8 and requires no
 * additional plugin setup.
 */
export async function signInWithGoogleNative(): Promise<{ success: boolean; method: "browser" | "none" }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) return { success: false, method: "none" };

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { flowType: "pkce", detectSessionInUrl: false, autoRefreshToken: true },
    });

    const info = getPlatformInfo();
    const redirectTo = `${info.appScheme}://auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    });

    if (error || !data?.url) return { success: false, method: "none" };

    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: data.url });

    return { success: true, method: "browser" };
  } catch {
    return { success: false, method: "none" };
  }
}

/**
 * Listen for the browser-based OAuth callback and exchange the PKCE code.
 */
export async function listenForAuthCallback(
  onSuccess?: () => void,
  onError?: (message: string) => void,
): Promise<() => void> {
  try {
    const { App } = await import("@capacitor/app");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) return () => {};

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { flowType: "pkce", detectSessionInUrl: false, autoRefreshToken: true },
    });

    const handler = await App.addListener("appUrlOpen", async (data: { url: string }) => {
      const url = data.url;
      if (!url?.includes("auth/callback")) return;

      let code: string | null = null;
      try { code = new URL(url).searchParams.get("code"); }
      catch { code = url.match(/[?&]code=([^&]+)/)?.[1] ?? null; }

      if (!code) { onError?.("No auth code received."); return; }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) { onError?.(error.message); return; }

      onSuccess?.();
    });

    return () => { handler.remove(); };
  } catch {
    return () => {};
  }
}
