import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    // Build response first so we can set cookies on it
    const redirectResponse = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // Read cookies from the incoming request
            const cookieHeader = request.headers.get("cookie") ?? "";
            return cookieHeader.split("; ").filter(Boolean).map((c) => {
              const [name, ...rest] = c.split("=");
              return { name, value: rest.join("=") };
            });
          },
          setAll(cookiesToSet) {
            // Write cookies onto the redirect response so they survive the redirect
            for (const { name, value, options } of cookiesToSet) {
              redirectResponse.cookies.set(name, value, options);
            }
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirectResponse;
    }
  }

  return NextResponse.redirect(`${origin}?auth_error=callback_failed`);
}
