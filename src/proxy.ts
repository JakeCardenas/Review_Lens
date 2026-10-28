import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isApiPath, isPublicPath } from "@/lib/auth/paths";

/**
 * Runs before every page and API route. It keeps the Supabase session fresh (as Supabase's Next.js
 * guide requires) and turns signed-out visitors away early. This is only the first check: every page,
 * route handler and query checks the account again on the server.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // Without the settings, pages and routes report that sign-in isn't set up.
  if (!url || !key) return response;

  let cacheHeaders: Record<string, string> = {};
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        cacheHeaders = headers;
        for (const [header, value] of Object.entries(headers)) response.headers.set(header, value);
      },
    },
  });

  // getClaims() verifies the token and refreshes it when it is about to expire.
  const { data } = await supabase.auth.getClaims();
  const signedIn = typeof data?.claims?.sub === "string" && data.claims.is_anonymous !== true;
  const { pathname, search } = request.nextUrl;

  // A different response must carry the refreshed cookies and cache headers, or the session is lost.
  const keepSession = (next: NextResponse) => {
    for (const cookie of response.cookies.getAll()) next.cookies.set(cookie);
    for (const [header, value] of Object.entries(cacheHeaders)) next.headers.set(header, value);
    return next;
  };

  if (signedIn && (pathname === "/sign-in" || pathname === "/sign-up")) {
    return keepSession(NextResponse.redirect(new URL("/", request.url)));
  }
  if (signedIn || isPublicPath(pathname)) return response;
  if (isApiPath(pathname)) {
    return keepSession(
      NextResponse.json({ error: { code: "SIGN_IN_REQUIRED", message: "Sign in to continue." } }, { status: 401 }),
    );
  }
  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set("next", `${pathname}${search}`);
  return keepSession(NextResponse.redirect(signIn));
}

export const config = {
  // Everything except Next's static files and images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
