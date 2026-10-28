import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { EagleMark } from "@/components/brand";
import type { UploadStatus } from "@/lib/types";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

// Primary, secondary and danger buttons sit on a solid bottom edge that compresses on press (.edge).
const VARIANTS: Record<Variant, string> = {
  primary: "edge border-transparent bg-brand text-on-brand hover:bg-brand-hover [--edge:var(--brand-edge)]",
  secondary: "edge border-line-strong bg-surface text-ink hover:bg-surface-2 [--edge:var(--line-strong)]",
  ghost: "press border-transparent bg-transparent text-brand-ink hover:bg-brand-soft",
  danger: "edge border-line-strong bg-surface text-danger hover:border-danger/40 hover:bg-danger-soft [--edge:var(--line-strong)]",
};

const SIZES: Record<Size, string> = {
  sm: "min-h-10 px-3.5 text-sm gap-1.5",
  md: "min-h-12 px-5 text-[15px] gap-2",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", extra = ""): string {
  return [
    "inline-flex items-center justify-center rounded-control border-2 font-display font-extrabold whitespace-nowrap",
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

/** Inline text link in the brand color. */
export const linkClasses = "font-bold text-brand-ink underline decoration-brand-ink/30 decoration-2 underline-offset-[3px] hover:decoration-brand-ink";

/** Page title with an optional line of context and actions on the right. */
export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 max-w-2xl">
        <h1 className="font-display text-[1.75rem] font-black leading-tight tracking-[-0.02em] sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 text-[15px] text-ink-2 sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
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
    <section id={id} className={`min-w-0 rounded-card border-[1.5px] border-line bg-surface p-5 sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-prose">
            {title && <h2 className="font-display text-lg font-extrabold leading-snug tracking-[-0.01em]">{title}</h2>}
            {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

const STATUS: Record<UploadStatus, { label: string; tone: string }> = {
  importing: { label: "Importing", tone: "bg-warn-soft text-warn-ink" },
  analyzing: { label: "Analyzing", tone: "bg-warn-soft text-warn-ink" },
  done: { label: "Ready", tone: "bg-brand-soft text-brand-ink" },
  done_with_issues: { label: "Ready, with issues", tone: "bg-brand-soft text-brand-ink" },
  failed: { label: "Failed", tone: "bg-danger-soft text-danger" },
};

export function StatusPill({ status, paused = false }: { status: UploadStatus; paused?: boolean }) {
  const { label, tone } = paused ? { label: "Paused", tone: "bg-warn-soft text-warn-ink" } : STATUS[status];
  return <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-bold ${tone}`}>{label}</span>;
}

const NOTICE = {
  info: { icon: Info, tone: "border-line bg-surface", iconTone: "text-brand-ink" },
  success: { icon: CheckCircle2, tone: "border-brand-soft bg-brand-tint", iconTone: "text-brand-ink" },
  warning: { icon: AlertTriangle, tone: "border-[#f5e2b0] bg-warn-soft", iconTone: "text-warn-ink" },
  error: { icon: XCircle, tone: "border-[#f6d1cd] bg-danger-soft", iconTone: "text-danger" },
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
      className={`flex flex-wrap items-start gap-3 rounded-2xl border-[1.5px] px-4 py-3.5 sm:px-5 ${toneClass}`}
    >
      <Icon aria-hidden className={`mt-0.5 size-5 shrink-0 ${iconTone}`} />
      <div className="min-w-0 flex-1 basis-56">
        <p className="font-bold text-ink">{title}</p>
        {children && <div className="mt-0.5 text-sm text-ink-2">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** A friendly "nothing here yet" panel. The eagle appears where a person is about to get started. */
export function EmptyState({
  icon,
  mascot = false,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  mascot?: boolean;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-card border-[1.5px] border-line bg-surface px-6 py-12 text-center sm:py-14">
      {mascot ? (
        <EagleMark size={72} className="mb-4" />
      ) : (
        icon && <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-surface-2 text-ink-2">{icon}</div>
      )}
      <h2 className="font-display text-xl font-extrabold tracking-[-0.01em]">{title}</h2>
      {children && <div className="mt-2 max-w-md text-[15px] text-ink-2">{children}</div>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-control bg-surface-3 ${className}`} />;
}
