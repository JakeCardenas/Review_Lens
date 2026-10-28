import Link from "next/link";
import { LogOut, Plus } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { getCurrentUser, type SessionUser } from "@/lib/server/auth";
import { Button, ButtonLink } from "./ui";

/** The signed-in account, or null, including when sign-in isn't set up yet (the pages explain that). */
async function signedInUser(): Promise<SessionUser | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <rect width="64" height="64" rx="16" fill="var(--brand)" />
      <circle cx="28" cy="28" r="13" fill="none" stroke="var(--on-brand)" strokeWidth="5" />
      <path d="M38 38 L49 49" stroke="var(--on-brand)" strokeWidth="6" strokeLinecap="round" />
      <path
        d="M22.5 30c1.6 2.4 3.4 3.5 5.5 3.5s3.9-1.1 5.5-3.5"
        fill="none"
        stroke="var(--on-brand)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Sticky translucent top bar. The page scrolls underneath it. */
export async function SiteHeader() {
  const user = await signedInUser();
  return (
    <header className="glass no-print sticky top-0 z-30 border-b" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="gutter mx-auto flex h-14 max-w-6xl items-center justify-between gap-3">
        <Link href="/" className="press flex items-center gap-2 rounded-control font-display text-[19px] font-semibold tracking-tight">
          <LogoMark />
          ReviewLens
        </Link>
        {user ? (
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <span className="hidden max-w-64 truncate text-sm text-ink-2 md:inline" title={user.email}>
              {user.email}
            </span>
            <ButtonLink href="/upload" size="sm">
              <Plus aria-hidden className="size-4" />
              New upload
            </ButtonLink>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm" aria-label="Sign out" title="Sign out">
                <LogOut aria-hidden className="size-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </div>
        ) : (
          <ButtonLink href="/sign-in" variant="secondary" size="sm">
            Sign in
          </ButtonLink>
        )}
      </div>
    </header>
  );
}
