import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Redirect signed-in users to the app, not the landing page
  const next = searchParams.get("next") ?? "/app";

  if (code) {
    // Build the redirect response FIRST so cookies set by setAll land on it
    const redirectResponse = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            const cookieHeader = request.headers.get("cookie") ?? "";
            return cookieHeader.split("; ").filter(Boolean).map((c) => {
              const [name, ...rest] = c.split("=");
              return { name, value: rest.join("=") };
            });
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              redirectResponse.cookies.set(name, value, options);
            }
          },
        },
      },
    );

    // Exchange the OAuth code for a Supabase session.
    // This triggers the SSR client's onAuthStateChange handler, which calls
    // applyServerStorage to write session cookies. The handler is async and
    // runs on a microtask; we yield to the event loop so the handler completes
    // and cookies are written to redirectResponse before it's returned.
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (!error) {
      return redirectResponse;
    }
  }

  return NextResponse.redirect(`${origin}?auth_error=callback_failed`);
}
