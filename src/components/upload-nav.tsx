"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, ChevronDown, FileText, LayoutDashboard, MessageSquareText, MoreHorizontal, Tags, TriangleAlert } from "lucide-react";

type Section = { href: string; label: string; icon: LucideIcon };

// The three places people work in, always in view.
const MAIN: Section[] = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/reviews", label: "Reviews", icon: MessageSquareText },
  { href: "/topics", label: "Topics", icon: Tags },
];

// Tools people reach for now and then, kept one tap away under More.
const MORE: Section[] = [
  { href: "/accuracy", label: "Accuracy check", icon: BadgeCheck },
  { href: "/report", label: "Export report", icon: FileText },
  { href: "/issues", label: "Data issues", icon: TriangleAlert },
];

/** The More button and its menu, which opens below the tabs on wider screens and above the bar on phones. */
function MoreMenu({ base, isActive, placement }: { base: string; isActive: (href: string) => boolean; placement: "below" | "above" }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const current = MORE.find((item) => isActive(item.href));

  // Close on Escape and on a tap outside; choosing an item closes it too.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const phone = placement === "above";
  return (
    <div ref={root} className={`relative ${phone ? "h-full" : ""}`}>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={
          phone
            ? `press flex h-full min-h-14 w-full flex-col items-center justify-center gap-1 text-[12px] font-bold ${current ? "text-brand-ink" : "text-ink-2"}`
            : `press nav-label flex min-h-11 items-center gap-2 rounded-control px-4 ${
                current ? "bg-brand-soft text-brand-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              }`
        }
      >
        {phone ? (
          <>
            <span className={`grid h-8 w-14 place-items-center rounded-tag ${current ? "bg-brand-soft" : ""}`}>
              <MoreHorizontal aria-hidden className="size-5" strokeWidth={2.25} />
            </span>
            More
          </>
        ) : (
          <>
            <MoreHorizontal aria-hidden className="size-5" strokeWidth={2.25} />
            {current ? current.label : "More"}
            <ChevronDown aria-hidden className={`size-4 transition-transform duration-150 ${open ? "rotate-180" : ""}`} strokeWidth={2.5} />
          </>
        )}
      </button>
      {open && (
        <ul
          id={menuId}
          className={`pop-in absolute z-40 grid w-64 gap-1 rounded-card border border-line bg-surface p-2 shadow-float ${
            phone ? "bottom-full right-2 mb-2 origin-bottom-right" : "left-0 top-full mt-2 origin-top-left"
          }`}
        >
          {MORE.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={base + item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-12 items-center gap-3 rounded-control px-3 text-[15px] font-bold ${
                    active ? "bg-brand-soft text-brand-ink" : "text-ink hover:bg-surface-2"
                  }`}
                >
                  <item.icon aria-hidden className="size-5 shrink-0" strokeWidth={2.25} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Upload sections: Overview, Reviews and Topics always in view, with Accuracy, the report and data issues
 * under More. Tabs sit under the title on wider screens; on phones they become a four-item bar at the bottom.
 * The selected section takes the pale green fill with dark green text.
 */
export function UploadNav({ uploadId }: { uploadId: string }) {
  const pathname = usePathname();
  const base = `/uploads/${uploadId}`;
  const isActive = (href: string) => (href ? pathname.startsWith(base + href) : pathname === base);

  return (
    <>
      <nav aria-label="Upload sections" className="no-print hidden sm:block">
        <ul className="flex flex-wrap items-center gap-1.5">
          {MAIN.map((tab) => {
            const active = isActive(tab.href);
            return (
              <li key={tab.label}>
                <Link
                  href={base + tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`press nav-label flex min-h-11 items-center gap-2 rounded-control px-4 ${
                    active ? "bg-brand-soft text-brand-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  <tab.icon aria-hidden className="size-5" strokeWidth={2.25} />
                  {tab.label}
                </Link>
              </li>
            );
          })}
          <li>
            <MoreMenu base={base} isActive={isActive} placement="below" />
          </li>
        </ul>
      </nav>

      <nav
        aria-label="Upload sections"
        data-bottom-tabs
        className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <ul className="grid grid-cols-4 px-1 py-1.5">
          {MAIN.map((tab) => {
            const active = isActive(tab.href);
            return (
              <li key={tab.label}>
                <Link
                  href={base + tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`press flex min-h-14 flex-col items-center justify-center gap-1 text-[12px] font-bold ${
                    active ? "text-brand-ink" : "text-ink-2"
                  }`}
                >
                  <span className={`grid h-8 w-14 place-items-center rounded-tag ${active ? "bg-brand-soft" : ""}`}>
                    <tab.icon aria-hidden className="size-5" strokeWidth={2.25} />
                  </span>
                  {tab.label}
                </Link>
              </li>
            );
          })}
          <li>
            <MoreMenu base={base} isActive={isActive} placement="above" />
          </li>
        </ul>
      </nav>
    </>
  );
}
