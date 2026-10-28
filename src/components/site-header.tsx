import Link from "next/link";
import { LogOut, Plus } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { AccountMenu, menuItemClasses } from "@/components/account-menu";
import { EagleMark } from "@/components/brand";
import { getCurrentUser, type SessionUser } from "@/lib/server/auth";
import { ButtonLink } from "./ui";

/** The signed-in account, or null, including when sign-in isn't set up yet (the pages explain that). */
async function signedInUser(): Promise<SessionUser | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

/** Sticky white top bar: the eagle and wordmark, then New upload and the account menu when signed in. */
export async function SiteHeader() {
  const user = await signedInUser();
  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-surface" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="gutter mx-auto flex h-16 max-w-6xl items-center justify-between gap-3">
        <Link
          href="/"
          className="press -ml-1 flex items-center gap-2.5 rounded-control px-1 py-1 font-display text-xl font-black tracking-[-0.02em]"
        >
          <EagleMark size={36} />
          ReviewLens
        </Link>
        {user && (
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
            <ButtonLink href="/upload" size="sm">
              <Plus aria-hidden className="size-4" strokeWidth={2.75} />
              <span className="max-[420px]:sr-only">New upload</span>
            </ButtonLink>
            <AccountMenu email={user.email}>
              <form action={signOut}>
                <button type="submit" className={menuItemClasses}>
                  <LogOut aria-hidden className="size-4 text-ink-2" />
                  Sign out
                </button>
              </form>
            </AccountMenu>
          </div>
        )}
      </div>
    </header>
  );
}
