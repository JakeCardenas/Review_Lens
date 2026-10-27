import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { UploadStatus } from "@/lib/types";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-on-brand hover:bg-brand-hover border-transparent",
  secondary: "bg-surface text-ink border-line-strong hover:bg-surface-2",
  ghost: "bg-transparent text-brand-ink border-transparent hover:bg-brand-soft",
  danger: "bg-surface text-neg-ink border-line-strong hover:bg-neg-soft",
};

const SIZES: Record<Size, string> = {
  sm: "min-h-10 px-3.5 text-sm gap-1.5",
  md: "min-h-11 px-5 text-[15px] gap-2",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", extra = ""): string {
  return [
    "press inline-flex items-center justify-center rounded-control border font-semibold whitespace-nowrap",
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
    <section id={id} className={`min-w-0 rounded-card border border-line bg-surface p-5 sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>}
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
  failed: { label: "Failed", tone: "bg-neg-soft text-neg-ink" },
};

export function StatusPill({ status, paused = false }: { status: UploadStatus; paused?: boolean }) {
  const { label, tone } = paused ? { label: "Paused", tone: "bg-warn-soft text-warn-ink" } : STATUS[status];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>;
}

const NOTICE = {
  info: { icon: Info, tone: "border-line bg-surface text-ink", iconTone: "text-brand-ink" },
  success: { icon: CheckCircle2, tone: "border-transparent bg-brand-soft text-ink", iconTone: "text-brand-ink" },
  warning: { icon: AlertTriangle, tone: "border-transparent bg-warn-soft text-ink", iconTone: "text-warn-ink" },
  error: { icon: XCircle, tone: "border-transparent bg-neg-soft text-ink", iconTone: "text-neg-ink" },
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
      className={`flex flex-wrap items-start gap-3 rounded-card border px-4 py-3.5 ${toneClass}`}
    >
      <Icon aria-hidden className={`mt-0.5 size-5 shrink-0 ${iconTone}`} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-0.5 text-sm text-ink-2">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-ink">{icon}</div>
      <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      {children && <div className="mt-1.5 max-w-md text-sm text-ink-2">{children}</div>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-control bg-line/70 ${className}`} />;
}
