"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, LayoutList } from "lucide-react";

export const menuItemClasses =
  "flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[15px] font-semibold text-ink hover:bg-surface-2";

/** Account disclosure menu: the signed-in email, a link home and the sign-out form (passed in as children). */
export function AccountMenu({ email, children }: { email: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

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

  const initial = email.trim().charAt(0).toUpperCase() || "?";

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="press flex min-h-11 items-center gap-2 rounded-control px-1.5 hover:bg-surface-2"
      >
        <span aria-hidden className="grid size-8 place-items-center rounded-full bg-brand-soft font-display text-sm font-black text-brand-ink">
          {initial}
        </span>
        <span className="sr-only">Account menu for {email}</span>
        <span aria-hidden className="hidden max-w-52 truncate text-sm font-semibold text-ink-2 md:inline">
          {email}
        </span>
        <ChevronDown aria-hidden className={`size-4 text-ink-2 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          id={panelId}
          className="pop-in absolute right-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border-[1.5px] border-line bg-surface p-2 shadow-float"
        >
          <p className="px-3 pb-2.5 pt-1.5 text-sm text-ink-2">
            Signed in as
            <span className="block truncate font-bold text-ink" title={email}>
              {email}
            </span>
          </p>
          <div className="grid gap-0.5 border-t border-line pt-1.5">
            <Link href="/" onClick={() => setOpen(false)} className={menuItemClasses}>
              <LayoutList aria-hidden className="size-4 text-ink-2" />
              Your uploads
            </Link>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
