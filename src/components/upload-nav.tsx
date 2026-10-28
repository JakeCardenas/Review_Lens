"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, FileText, LayoutDashboard, MessageSquareText, Tags } from "lucide-react";

const TABS = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/reviews", label: "Reviews", icon: MessageSquareText },
  { href: "/topics", label: "Topics", icon: Tags },
  { href: "/accuracy", label: "Accuracy", icon: BadgeCheck },
  { href: "/report", label: "Report", icon: FileText },
];

/** Upload sections: tabs under the title on wider screens, a compact tab bar at the bottom on phones. The selected tab is green. */
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
                  className={`press nav-label flex min-h-11 items-center gap-2 rounded-control border-2 px-3.5 text-[14px] ${
                    active ? "border-fresh-leaf bg-brand-soft text-brand-ink" : "border-transparent text-ink-2 hover:bg-surface-2 hover:text-ink"
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
        <ul className="grid grid-cols-5 px-1 py-1.5">
          {TABS.map((tab) => {
            const active = isActive(tab.href);
            return (
              <li key={tab.label}>
                <Link
                  href={base + tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`press flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-extrabold uppercase tracking-[0.03em] ${
                    active ? "text-brand-ink" : "text-ink-2"
                  }`}
                >
                  <span
                    className={`grid h-8 w-14 place-items-center rounded-full ${active ? "bg-brand-soft" : ""}`}
                  >
                    <tab.icon aria-hidden className="size-5" strokeWidth={2.5} />
                  </span>
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
