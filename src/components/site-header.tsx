import Link from "next/link";
import { LogOut, Plus } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { AccountMenu, menuItemClasses } from "@/components/account-menu";
import { BrandMark } from "@/components/brand";
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

/** White top bar: the eagle mark and green wordmark, then Upload reviews and the account pill when signed in. */
export async function SiteHeader() {
  const user = await signedInUser();
  return (
    <header className="no-print sticky top-0 z-30 border-b-2 border-line bg-surface" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="gutter mx-auto flex h-[72px] max-w-[75rem] items-center justify-between gap-2">
        <Link
          href="/"
          className="press -ml-1 flex min-w-0 items-center gap-2.5 rounded-control px-1 py-1 font-display text-[22px] font-black tracking-[-0.02em] text-brand sm:gap-3 sm:text-[28px]"
        >
          <BrandMark height={52} priority className="-my-1 -ml-3" />
          ReviewLens
        </Link>
        {user && (
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ButtonLink href="/upload" size="sm" className="max-[420px]:px-3" data-header-upload>
              <Plus aria-hidden className="size-4" strokeWidth={3} />
              <span className="max-[420px]:sr-only">Upload reviews</span>
            </ButtonLink>
            <AccountMenu email={user.email}>
              <form action={signOut}>
                <button type="submit" className={menuItemClasses}>
                  <LogOut aria-hidden className="size-5" strokeWidth={2.5} />
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
