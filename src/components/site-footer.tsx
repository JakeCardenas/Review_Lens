import { SpupSeal } from "@/components/brand";

/** Full-width Eager Green band, like the Refero footer: where ReviewLens comes from, without implying SPUP endorses it. */
export function SiteFooter() {
  return (
    <footer className="no-print mt-auto bg-brand text-night">
      <div className="gutter mx-auto flex max-w-[75rem] flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:py-12">
        <div className="flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-surface">
            <SpupSeal size={52} />
          </span>
          <p className="max-w-lg text-[15px] font-bold leading-snug">
            Made by students of St. Paul University Philippines for a class project. ReviewLens isn&apos;t an official SPUP service.
          </p>
        </div>
        <p className="nav-label">Your uploads stay private</p>
      </div>
    </footer>
  );
}
