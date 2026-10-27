"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Native modal sheet. Closing it returns to the list URL without the `review` parameter. */
export function ReviewDialog({ closeHref, title, children }: { closeHref: string; title: string; children: ReactNode }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function close() {
    router.replace(closeHref, { scroll: false });
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="review-dialog-title"
      onClose={close}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-0 mt-auto max-h-[88dvh] w-full max-w-none overflow-hidden rounded-t-sheet border border-line bg-surface p-0 text-ink shadow-float sm:m-auto sm:max-h-[85dvh] sm:max-w-2xl sm:rounded-sheet"
    >
      <div className="glass sticky top-0 flex items-center justify-between gap-3 border-b px-5 py-3">
        <h2 id="review-dialog-title" className="font-display text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          className="press grid size-10 place-items-center rounded-full text-ink-2 hover:bg-surface-2"
          aria-label="Close review"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>
      <div
        className="max-h-[calc(88dvh-4rem)] overflow-y-auto overscroll-contain px-5 pt-4 sm:max-h-[calc(85dvh-4rem)]"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {children}
      </div>
    </dialog>
  );
}
