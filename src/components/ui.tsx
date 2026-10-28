import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { BrandMark } from "@/components/brand";
import type { UploadStatus } from "@/lib/types";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

// Primary: Eager Green with a darker lip. Secondary: white with a 2px Faded Gray outline and blue text.
const VARIANTS: Record<Variant, string> = {
  primary: "lip border-transparent bg-brand text-on-brand hover:bg-brand-hover [--edge:var(--brand-edge)]",
  secondary: "lip border-line-strong bg-surface text-accent-ink hover:bg-surface-2 [--edge:var(--line-strong)] [--lip:3px]",
  ghost: "press border-transparent bg-transparent text-accent-ink hover:bg-accent-soft",
  danger: "lip border-line-strong bg-surface text-danger hover:border-danger-line hover:bg-danger-soft [--edge:var(--line-strong)] [--lip:3px]",
};

const SIZES: Record<Size, string> = {
  sm: "min-h-10 px-4 text-[13px] gap-1.5",
  md: "min-h-12 px-6 text-[15px] gap-2",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", extra = ""): string {
  return [
    "inline-flex items-center justify-center rounded-control border-2 font-extrabold uppercase tracking-[0.053em] whitespace-nowrap",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    extra,
  ].join(" ");
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size };

export function Button({ variant, size, className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function ButtonLink({ variant, size, className = "", ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}

/** Inline text link in Spark Blue (darkened for readability). */
export const linkClasses = "font-bold text-accent-ink underline decoration-accent/50 decoration-2 underline-offset-[3px] hover:decoration-accent-ink";

/** Page title with a line of context, actions, and optionally the eagle beside it. */
export function PageHeader({
  title,
  description,
  actions,
  art,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  art?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
      <div className="flex min-w-0 items-center gap-6">
        {art && <BrandMark height={112} className="hidden md:block" />}
        <div className="min-w-0 max-w-2xl">
          <h1 className="font-display text-[1.75rem] font-black leading-tight text-ink sm:text-heading-sm">{title}</h1>
          {description && <p className="mt-2 text-body text-ink-2">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
  className = "",
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`min-w-0 ${className}`}>
      {(title || actions) && (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 max-w-prose">
            {title && <h2 className="text-subheading font-extrabold text-ink">{title}</h2>}
            {description && <p className="mt-1 text-[15px] text-ink-2">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** Small rounded tag on a soft fill, in sentence case. */
export const tagClasses = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-bold whitespace-nowrap";

const STATUS: Record<UploadStatus, { label: string; tone: string }> = {
  importing: { label: "Importing", tone: "bg-warn-soft text-warn-ink" },
  analyzing: { label: "Analyzing", tone: "bg-warn-soft text-warn-ink" },
  done: { label: "Ready", tone: "bg-brand-soft text-brand-ink" },
  done_with_issues: { label: "Ready, with issues", tone: "bg-brand-soft text-brand-ink" },
  failed: { label: "Failed", tone: "bg-danger-soft text-danger" },
};

export function StatusPill({ status, paused = false }: { status: UploadStatus; paused?: boolean }) {
  const { label, tone } = paused ? { label: "Paused", tone: "bg-warn-soft text-warn-ink" } : STATUS[status];
  return <span className={`${tagClasses} ${tone}`}>{label}</span>;
}

// Soft fills instead of outlines, so a notice reads as one calm block.
const NOTICE = {
  info: { icon: Info, tone: "bg-surface-2", iconTone: "text-accent-ink" },
  success: { icon: CheckCircle2, tone: "bg-brand-tint", iconTone: "text-brand-ink" },
  warning: { icon: AlertTriangle, tone: "bg-warn-soft", iconTone: "text-warn-ink" },
  error: { icon: XCircle, tone: "bg-danger-soft", iconTone: "text-danger" },
} as const;

export function Notice({
  tone = "info",
  title,
  children,
  action,
  live = false,
}: {
  tone?: keyof typeof NOTICE;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  live?: boolean;
}) {
  const { icon: Icon, tone: toneClass, iconTone } = NOTICE[tone];
  return (
    <div
      role={tone === "error" ? "alert" : live ? "status" : undefined}
      className={`flex flex-wrap items-start gap-3 rounded-card px-4 py-4 sm:px-5 ${toneClass}`}
    >
      <Icon aria-hidden className={`mt-0.5 size-6 shrink-0 ${iconTone}`} strokeWidth={2.5} />
      <div className="min-w-0 flex-1 basis-56">
        <p className="font-extrabold text-ink">{title}</p>
        {children && <div className="mt-1 text-[15px] text-ink">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** A friendly "nothing here yet" moment: an icon or the eagle, a short headline and the next step. */
export function EmptyState({
  icon,
  mascot = false,
  title,
  children,
  action,
  heading: Heading = "h2",
}: {
  icon?: ReactNode;
  mascot?: boolean;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  /** h1 when the empty state is the whole page, such as "not found". */
  heading?: "h1" | "h2";
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center sm:py-16">
      {mascot ? (
        <BrandMark height={120} className="mb-5" />
      ) : (
        icon && <div className="mb-5 grid size-14 place-items-center rounded-full bg-surface-2 text-ink-2">{icon}</div>
      )}
      <Heading className="text-2xl font-extrabold text-ink">{title}</Heading>
      {children && <div className="mt-2 max-w-md text-body text-ink-2">{children}</div>}
      {action && <div className="mt-8 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-control bg-surface-3 ${className}`} />;
}
