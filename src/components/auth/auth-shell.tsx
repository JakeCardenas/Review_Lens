import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { linkClasses } from "@/components/ui";

const POINTS = [
  "Upload a CSV of customer reviews, one review per row.",
  "See how many are positive, neutral and negative, and how sure each label is.",
  "Find the topics customers mention most and the reviews worth reading first.",
  "Your uploads stay private to your account.",
];

/** The account pages: the eagle and what ReviewLens does beside the form, like a storybook spread. */
export function AuthShell({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2 lg:gap-20 lg:pt-4">
      <aside className="hidden lg:block" aria-label="About ReviewLens">
        <BrandMark height={220} label="ReviewLens eagle mark" className="-ml-10" />
        <p className="mt-10 text-heading-sm font-extrabold text-ink">See what your customers are saying, without reading every review.</p>
        <ul className="mt-8 grid gap-4">
          {POINTS.map((point) => (
            <li key={point} className="flex gap-3 text-body text-ink-2">
              <span aria-hidden className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand text-on-brand">
                <Check className="size-4" strokeWidth={3.5} />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </aside>

      <div className="mx-auto grid w-full max-w-md gap-8 lg:max-w-none">
        <div className="grid justify-items-center gap-4 text-center lg:justify-items-start lg:text-left">
          <BrandMark height={110} className="lg:hidden" />
          <h1 className="font-display text-heading-sm font-black text-brand-display sm:text-heading">{title}</h1>
          {intro && <div className="text-body text-ink-2">{intro}</div>}
        </div>
        <section className="grid gap-6 rounded-card border-2 border-line bg-surface p-6 sm:p-8">{children}</section>
        {footer && <div className="grid gap-3 text-center text-[15px] text-ink-2 lg:text-left">{footer}</div>}
      </div>
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className={linkClasses}>
      {children}
    </a>
  );
}
