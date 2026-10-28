// Which paths need a signed-in account, and where to send people after signing in. Used by the
// proxy and the account pages, so it imports nothing server-only.

/** Account pages anyone can open. Every other page and API route needs a signed-in account. */
const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/forgot-password", "/check-email", "/auth/confirm"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

const BASE = "https://reviewlens.invalid";

/**
 * A path on this site to go to after signing in, or `fallback`. Anything that could lead to another
 * site (`//host`, `https://…`, backslashes, control characters) or back to an account page is refused.
 */
export function safeNextPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) {
    return fallback;
  }
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE || isPublicPath(url.pathname)) return fallback;
  const path = `${url.pathname}${url.search}${url.hash}`;
  // Parsing drops dot segments, so "/.//evil.example" comes out as "//evil.example", which a browser
  // reads as another site. Check the tidied path too.
  return path.startsWith("//") ? fallback : path;
}
