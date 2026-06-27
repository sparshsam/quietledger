import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const redirectResponse = NextResponse.redirect(`${origin}/app`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              redirectResponse.cookies.set(name, value, options);
            }
          },
        },
      },
    );

    await supabase.auth.exchangeCodeForSession(code);
    return redirectResponse;
  }

  return NextResponse.redirect(`${origin}/?auth_error=callback_failed`);
}
