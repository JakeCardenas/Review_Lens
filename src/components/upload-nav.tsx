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

/** Upload sections: tabs under the title on wider screens, a tab bar at the bottom on phones. */
export function UploadNav({ uploadId }: { uploadId: string }) {
  const pathname = usePathname();
  const base = `/uploads/${uploadId}`;
  const isActive = (href: string) => (href ? pathname.startsWith(base + href) : pathname === base);

  return (
    <>
      <nav aria-label="Upload sections" className="no-print hidden sm:block">
        <ul className="inline-flex gap-1 rounded-2xl border-[1.5px] border-line bg-surface p-1">
          {TABS.map((tab) => {
            const active = isActive(tab.href);
            return (
              <li key={tab.label}>
                <Link
                  href={base + tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`press flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold ${
                    active ? "bg-brand-soft text-brand-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  <tab.icon aria-hidden className="size-4" />
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
        className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <ul className="gutter grid grid-cols-4">
          {TABS.map((tab) => {
            const active = isActive(tab.href);
            return (
              <li key={tab.label}>
                <Link
                  href={base + tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`press flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-bold ${
                    active ? "text-brand-ink" : "text-ink-2"
                  }`}
                >
                  <span className={`grid h-7 w-12 place-items-center rounded-full ${active ? "bg-brand-soft" : ""}`}>
                    <tab.icon aria-hidden className="size-5" />
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
