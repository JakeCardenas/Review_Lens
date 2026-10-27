import Link from "next/link";
import { Plus } from "lucide-react";
import { ButtonLink } from "./ui";

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
export function SiteHeader() {
  return (
    <header className="glass no-print sticky top-0 z-30 border-b" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="gutter mx-auto flex h-14 max-w-6xl items-center justify-between gap-3">
        <Link href="/" className="press flex items-center gap-2 rounded-control font-display text-[19px] font-semibold tracking-tight">
          <LogoMark />
          ReviewLens
        </Link>
        <ButtonLink href="/upload" size="sm">
          <Plus aria-hidden className="size-4" />
          New upload
        </ButtonLink>
      </div>
    </header>
  );
}
