import "server-only";
import { notFound as pageNotFound, redirect } from "next/navigation";
import { cache } from "react";
import { safeNextPath } from "@/lib/auth/paths";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDb } from "./db";
import { AppError } from "./errors";
import { getOwnedUpload, isUploadId, type OwnedUpload } from "./uploads";

export type SessionUser = { id: string; email: string };

/**
 * The signed-in account, or null. `getClaims()` verifies the session token's signature, unlike
 * `getSession()`, which trusts whatever the cookie says. Memoized for one request.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims || claims.is_anonymous === true || typeof claims.sub !== "string" || !isUploadId(claims.sub)) {
    return null;
  }
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
});

/** For pages: the signed-in account, or a redirect to sign in that comes back to `next` afterwards. */
export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/sign-in?next=${encodeURIComponent(safeNextPath(next))}` : "/sign-in");
  return user;
}

/** Memoized for one request, so an upload's layout and page share one lookup. */
const ownedUpload = cache((ownerId: string, id: string) => getOwnedUpload(getDb(), ownerId, id));

/**
 * For upload pages: the signed-in account and its upload. Signed-out visitors go to sign in, and
 * another account's upload shows the same "not found" page as a missing one.
 */
export async function requireOwnedUpload(id: string, next: string): Promise<{ user: SessionUser; upload: OwnedUpload }> {
  const user = await requireUser(next);
  const upload = await ownedUpload(user.id, id);
  if (!upload) pageNotFound();
  return { user, upload };
}

/**
 * For route handlers: the signed-in account, or a 401. Requests that change something must also come
 * from this site, which adds to the SameSite cookie protection against cross-site requests.
 */
export async function requireApiUser(request: Request): Promise<SessionUser> {
  if (request.method !== "GET" && request.method !== "HEAD") assertSameOrigin(request);
  const user = await getCurrentUser();
  if (!user) throw new AppError("SIGN_IN_REQUIRED", "Sign in to continue.", 401);
  return user;
}

/** Throws a 403 when the request's Origin header names another site. Requests without one are allowed. */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin === null) return;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    originHost = null;
  }
  if (!host || originHost !== host) {
    throw new AppError("CROSS_SITE_REQUEST", "This request came from another site, so it was blocked.", 403);
  }
}
