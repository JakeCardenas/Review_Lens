import type { ReactNode } from "react";
import { BarChart3, FileUp, Lock, Search } from "lucide-react";
import { EagleMark } from "@/components/brand";
import { linkClasses } from "@/components/ui";

const POINTS = [
  { icon: FileUp, text: "Upload a CSV of customer reviews, one review per row." },
  { icon: BarChart3, text: "See how many are positive, neutral and negative, and how sure each label is." },
  { icon: Search, text: "Find the topics customers mention most and the reviews worth reading first." },
  { icon: Lock, text: "Your uploads stay private to your account." },
];

/** The account pages: a warm panel about ReviewLens beside the form on wide screens, the form alone on phones. */
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
    <div className="mx-auto grid w-full max-w-5xl items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-12 lg:pt-4">
      <aside className="hidden rounded-sheet bg-[#fdf7e5] p-10 lg:block" aria-label="About ReviewLens">
        <EagleMark size={112} label="ReviewLens logo: a Philippine eagle looking through a green magnifying glass" />
        <p className="mt-8 max-w-md font-display text-[2rem] font-black leading-[1.15] tracking-[-0.02em]">
          See what your customers are saying, without reading every review.
        </p>
        <ul className="mt-8 grid max-w-md gap-4">
          {POINTS.map((point) => (
            <li key={point.text} className="flex gap-3 text-[15px] text-ink-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-surface text-brand-ink shadow-[0_2px_0_var(--line-strong)]">
                <point.icon aria-hidden className="size-4" />
              </span>
              <span className="pt-1">{point.text}</span>
            </li>
          ))}
        </ul>
      </aside>

      <div className="mx-auto grid w-full max-w-md gap-6 lg:max-w-none">
        <div className="grid justify-items-center gap-3 text-center lg:justify-items-start lg:text-left">
          <EagleMark size={64} className="lg:hidden" />
          <h1 className="font-display text-[1.75rem] font-black tracking-[-0.02em] sm:text-[2rem]">{title}</h1>
          {intro && <div className="text-[15px] text-ink-2">{intro}</div>}
        </div>
        <section className="grid gap-5 rounded-card border-[1.5px] border-line bg-surface p-5 sm:p-7">{children}</section>
        {footer && <div className="grid gap-2 text-center text-sm text-ink-2 lg:text-left">{footer}</div>}
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
