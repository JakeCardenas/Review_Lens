import { SpupSeal } from "@/components/brand";

/** Quiet footer: where ReviewLens comes from, without implying SPUP endorses it. */
export function SiteFooter() {
  return (
    <footer className="no-print mt-auto border-t border-line">
      <div className="gutter mx-auto flex max-w-6xl flex-col gap-3 py-7 text-[13px] text-ink-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <SpupSeal size={32} />
          <p className="max-w-md">
            Made by students of St. Paul University Philippines for a class project. ReviewLens isn&apos;t an official SPUP service.
          </p>
        </div>
        <p>Your uploads are private to your account.</p>
      </div>
    </footer>
  );
}
