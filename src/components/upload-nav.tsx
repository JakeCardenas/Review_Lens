"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LayoutDashboard, MessageSquareText, TriangleAlert } from "lucide-react";

const TABS = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/reviews", label: "Reviews", icon: MessageSquareText },
  { href: "/issues", label: "Data issues", short: "Issues", icon: TriangleAlert },
  { href: "/report", label: "Report", icon: FileText },
];

/** Upload sections: uppercase pills under the title on wider screens, a tab bar at the bottom on phones. */
export function UploadNav({ uploadId }: { uploadId: string }) {
  const pathname = usePathname();
  const base = `/uploads/${uploadId}`;
  const isActive = (href: string) => (href ? pathname.startsWith(base + href) : pathname === base);

  return (
    <>
      <nav aria-label="Upload sections" className="no-print hidden sm:block">
        <ul className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const active = isActive(tab.href);
            return (
              <li key={tab.label}>
                <Link
                  href={base + tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`press nav-label flex min-h-12 items-center gap-2.5 rounded-control border-2 px-4 ${
                    active ? "border-accent bg-accent-soft text-accent-ink" : "border-transparent text-ink-2 hover:bg-surface-2"
                  }`}
                >
                  <tab.icon aria-hidden className="size-5" strokeWidth={2.5} />
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav
        aria-label="Upload sections"
        data-bottom-tabs
        className="no-print fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-surface sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <ul className="gutter grid grid-cols-4 gap-1 py-1.5">
          {TABS.map((tab) => {
            const active = isActive(tab.href);
            return (
              <li key={tab.label}>
                <Link
                  href={base + tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`press flex min-h-14 flex-col items-center justify-center gap-1 text-[12px] font-extrabold uppercase tracking-[0.04em] ${
                    active ? "text-accent-ink" : "text-ink-2"
                  }`}
                >
                  <span
                    className={`grid h-8 w-14 place-items-center rounded-control border-2 ${
                      active ? "border-accent bg-accent-soft" : "border-transparent"
                    }`}
                  >
                    <tab.icon aria-hidden className="size-5" strokeWidth={2.5} />
                  </span>
                  {tab.short ?? tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
