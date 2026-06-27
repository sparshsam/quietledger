import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // ── PKCE auth code catch ──
  // If the request has a ?code= in the query string (PKCE auth code from OAuth)
  // but is NOT already at /auth/callback, redirect to the callback route so
  // the code gets exchanged for a session. This handles the case where Supabase
  // Auth redirects to the Site URL (root path) instead of /auth/callback.
  const { pathname, searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  if (code && pathname !== "/auth/callback") {
    const callbackUrl = new URL("/auth/callback", request.url);
    // Preserve the code and any other params (like next)
    callbackUrl.search = searchParams.toString();
    return NextResponse.redirect(callbackUrl);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  await supabase.auth.getUser();

  // Prevent CDN from caching HTML pages — ensures users always see the latest
  // build. Without this, Vercel's CDN can serve stale HTML for up to a year.
  supabaseResponse.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, max-age=0, must-revalidate",
  );

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
