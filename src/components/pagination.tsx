import Link from "next/link";
import { buttonClasses } from "@/components/ui";

/** Previous/next links that keep the current filters. */
export function Pagination({ page, pageCount, makeHref }: { page: number; pageCount: number; makeHref: (page: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pages" className="no-print flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={makeHref(page - 1)} className={buttonClasses("secondary", "sm")}>
          Previous
        </Link>
      ) : (
        <span />
      )}
      <p className="text-sm text-ink-2 tabular">
        Page {page} of {pageCount}
      </p>
      {page < pageCount ? (
        <Link href={makeHref(page + 1)} className={buttonClasses("secondary", "sm")}>
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
