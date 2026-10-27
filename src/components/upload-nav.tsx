"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, FileText, LayoutDashboard, MessageSquareText } from "lucide-react";

const TABS = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/reviews", label: "Reviews", icon: MessageSquareText },
  { href: "/issues", label: "Issues", icon: AlertTriangle },
  { href: "/report", label: "Report", icon: FileText },
];

/** Upload sections: a glass segmented control on wide screens, a glass tab bar at the bottom on phones. */
export function UploadNav({ uploadId }: { uploadId: string }) {
  const pathname = usePathname();
  const base = `/uploads/${uploadId}`;
  const isActive = (href: string) => (href ? pathname.startsWith(base + href) : pathname === base);

  return (
    <>
      <nav aria-label="Upload sections" className="no-print hidden sm:block">
        <ul className="glass inline-flex gap-1 rounded-full border p-1 shadow-float">
          {TABS.map((tab) => (
            <li key={tab.label}>
              <Link
                href={base + tab.href}
                aria-current={isActive(tab.href) ? "page" : undefined}
                className={`press flex min-h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ${
                  isActive(tab.href) ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink"
                }`}
              >
                <tab.icon aria-hidden className="size-4" />
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav
        aria-label="Upload sections"
        className="glass no-print fixed inset-x-0 bottom-0 z-30 border-t sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <ul className="gutter grid grid-cols-4">
          {TABS.map((tab) => (
            <li key={tab.label}>
              <Link
                href={base + tab.href}
                aria-current={isActive(tab.href) ? "page" : undefined}
                className={`press flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                  isActive(tab.href) ? "text-brand-ink" : "text-ink-2"
                }`}
              >
                <tab.icon aria-hidden className="size-5" />
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
