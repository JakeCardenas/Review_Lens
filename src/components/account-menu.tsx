"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, LayoutList } from "lucide-react";

export const menuItemClasses =
  "nav-label flex min-h-12 w-full items-center gap-3 rounded-control px-3 text-left text-ink-2 hover:bg-surface-2 hover:text-ink";

/** Account pill and its menu: the signed-in email, a link home and the sign-out form (passed in as children). */
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
        className={`press flex min-h-10 items-center gap-2 rounded-full border px-1.5 sm:pr-3 ${
          open ? "border-brand-soft bg-brand-soft" : "border-line-strong bg-surface hover:bg-surface-2"
        }`}
      >
        <span aria-hidden className="grid size-7 place-items-center rounded-full bg-brand-soft font-display text-sm font-black text-night">
          {initial}
        </span>
        <span className="sr-only">Account menu for {email}</span>
        <span aria-hidden className="nav-label hidden text-[13px] text-ink-2 md:inline">
          Account
        </span>
        <ChevronDown aria-hidden className={`size-4 text-ink-2 transition-transform duration-150 ${open ? "rotate-180" : ""}`} strokeWidth={3} />
      </button>
      {open && (
        <div
          id={panelId}
          className="pop-in absolute right-0 top-full z-40 mt-3 w-72 max-w-[calc(100vw-2rem)] rounded-card border border-line bg-surface p-2 shadow-float"
        >
          <p className="px-3 pb-3 pt-2 text-[15px] text-ink-2">
            Signed in as
            <span className="block truncate font-extrabold text-ink" title={email}>
              {email}
            </span>
          </p>
          <div className="grid gap-1 border-t border-line pt-2">
            <Link href="/" onClick={() => setOpen(false)} className={menuItemClasses}>
              <LayoutList aria-hidden className="size-5" strokeWidth={2.5} />
              Your uploads
            </Link>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
