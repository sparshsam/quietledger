// ─── Native Google Sign-In ────────────────────────────────────────────────
// Two paths, tried in order:
//   1. Native Google Auth plugin (phone account picker) — primary when configured
//   2. @capacitor/browser (Chrome Custom Tab) — fallback / in-app browser
//
// Manual setup needed for the account picker (you, the app owner):
//   1. Go to Google Cloud Console → APIs & Services → Credentials
//   2. Create OAuth 2.0 Client ID → "Android" → enter your app's
//      signing certificate SHA-1 fingerprint + package name "org.kovina.ledger"
//   3. Copy the WEB client ID (not Android) and set it in capacitor.config.ts
//      under plugins.GoogleAuth.clientId (the native plugin uses the web client ID)
//   4. If you skip this step, the app falls back to in-app browser sign-in

import { getPlatformInfo } from "./platform";

/**
 * Sign in with Google using the native Android account picker first,
 * falling back to in-app browser if the native plugin isn't available.
 */
export async function signInWithGoogleNative(): Promise<{ success: boolean; method: "picker" | "browser" | "none" }> {
  // --- Path 1: Native account picker (phone account selector) ---
  try {
    const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
    const user = await GoogleAuth.signIn();

    if (user?.authentication?.idToken) {
      // Exchange the Google idToken with Supabase to create a session
      const exchanged = await exchangeGoogleIdToken(user.authentication.idToken);
      if (exchanged) return { success: true, method: "picker" };
    }
  } catch (err) {
    console.warn("[nativeSignIn] Native picker failed, falling back to browser:", err);
  }

  // --- Path 2: In-app browser (Chrome Custom Tab) ---
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
 * Exchange a Google idToken with Supabase to create a session.
 */
async function exchangeGoogleIdToken(idToken: string): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) return false;

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { flowType: "pkce", detectSessionInUrl: false, autoRefreshToken: true },
    });

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error) {
      console.error("[nativeSignIn] Supabase token exchange failed:", error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Listen for the browser-based OAuth callback and exchange the PKCE code.
 * Only needed for the browser path — the native picker exchanges via idToken directly.
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
