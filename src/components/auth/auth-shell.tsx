import type { ReactNode } from "react";
import { LogoMark } from "@/components/site-header";

/** The centered card the account pages share. */
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
    <div className="mx-auto grid w-full max-w-md gap-6 pt-2 sm:pt-6">
      <div className="grid justify-items-center gap-3 text-center">
        <LogoMark className="size-12" />
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        {intro && <div className="text-ink-2">{intro}</div>}
      </div>
      <section className="grid gap-5 rounded-card border border-line bg-surface p-5 shadow-float sm:p-6">{children}</section>
      {footer && <div className="grid gap-2 text-center text-sm text-ink-2">{footer}</div>}
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="font-semibold text-brand-ink underline-offset-2 hover:underline">
      {children}
    </a>
  );
}
