import type { ReactNode } from "react";
import { linkClasses } from "@/components/ui";

/** The account pages: one calm, centered column with a title, the form and the links around it. The welcome page carries the mascots. */
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
    <div data-public-page className="mx-auto grid w-full max-w-md gap-8 sm:pt-6">
      <div className="grid gap-2 text-center">
        <h1 className="font-display text-[2rem] font-black leading-tight text-ink sm:text-[2.5rem]">{title}</h1>
        {intro && <div className="text-body text-ink-2">{intro}</div>}
      </div>
      <section className="grid gap-6">{children}</section>
      {footer && <div className="grid gap-3 text-center text-[15px] text-ink-2">{footer}</div>}
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
