import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AppError } from "@/lib/server/errors";

/** The project URL and publishable key. Both are public by design; the database tables grant browsers nothing. */
export function supabaseSettings(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

/** A Supabase client for Server Components, Server Actions and Route Handlers, reading the session from cookies. */
export async function createSupabaseServerClient() {
  // Reading cookies first marks the page as per-request, so it is never prerendered at build time,
  // even where the settings are missing.
  const cookieStore = await cookies();
  const settings = supabaseSettings();
  if (!settings) {
    throw new AppError(
      "AUTH_NOT_CONFIGURED",
      "Sign-in isn't set up: add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to the environment.",
      500,
    );
  }
  return createServerClient(settings.url, settings.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components can't set cookies. The proxy refreshes the session before they render.
        }
      },
    },
  });
}
