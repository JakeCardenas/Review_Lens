import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/paths";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const LINK_TYPES: EmailOtpType[] = ["signup", "email", "recovery", "email_change"];

/**
 * Where the links in confirmation and password-reset emails land. It handles both kinds of link:
 * `token_hash` (the recommended email templates; works on any device) and `code` (Supabase's
 * default templates; works in the browser that asked for the email).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const code = params.get("code");
  let next = safeNextPath(params.get("next"));
  let confirmed = false;

  if (tokenHash && type && LINK_TYPES.includes(type)) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    confirmed = !error;
    if (type === "recovery") next = "/reset-password";
  } else if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    confirmed = !error;
  }

  const target = new URL(confirmed ? next : "/sign-in?error=link", request.url);
  // safeNextPath keeps `next` on this site; checking the final address as well costs nothing.
  if (target.origin !== request.nextUrl.origin) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.redirect(target);
}
