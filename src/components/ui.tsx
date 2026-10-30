import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Info, PauseCircle, XCircle, type LucideIcon } from "lucide-react";
import { Mascots } from "@/components/brand";
import { Sticker, type StickerName } from "@/components/illustrations";
import type { UploadStatus } from "@/lib/types";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

// Rounded 12px buttons in sentence case, built like keys. Primary: the brand lime with near-black text on
// a 4px edge of the logo's green, one per screen. Secondary: white with a 2px grey outline that thickens
// at the bottom. Ghost: a blue text action. Pressing sinks the button into its edge. Disabled buttons turn
// grey and lose their edge, not just their opacity.
const VARIANTS: Record<Variant, string> = {
  primary: "tactile bg-brand text-on-brand hover:bg-brand-hover [--edge:var(--brand-edge)]",
  secondary: "tactile border-2 border-line bg-surface text-ink hover:bg-surface-2 [--edge-depth:3px]",
  ghost: "press bg-transparent text-accent-ink hover:bg-surface-2",
  danger: "tactile border-2 border-line bg-surface text-danger hover:bg-danger-soft [--edge-depth:3px]",
};

const SIZES: Record<Size, string> = {
  sm: "min-h-11 px-5 text-[15px] gap-2",
  md: "min-h-12 px-6 text-[16px] gap-2.5",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", extra = ""): string {
  return [
    "inline-flex items-center justify-center rounded-control font-extrabold whitespace-nowrap",
    "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-3 disabled:text-ink-2",
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

/** Inline text link: blue text dark enough to read, with a brand-blue underline. */
export const linkClasses = "font-bold text-accent-ink underline decoration-accent decoration-2 underline-offset-[3px] hover:decoration-accent-ink";

/** Page title with a line of context and any actions. */
export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
      <div className="flex min-w-0 items-center gap-5">
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

/** Small round tag on a soft fill, in sentence case. */
export const tagClasses = "inline-flex items-center gap-1.5 rounded-tag px-2.5 py-0.5 text-[13px] font-bold whitespace-nowrap";

// Each status has an icon as well as a colour and a word, so it reads without colour. Work in progress is
// blue like other information; ready is pale lime; only a failure is red.
const STATUS: Record<UploadStatus, { label: string; tone: string; icon: LucideIcon }> = {
  importing: { label: "Importing", tone: "bg-accent-soft text-accent-ink", icon: Clock3 },
  analyzing: { label: "Analyzing", tone: "bg-accent-soft text-accent-ink", icon: Clock3 },
  done: { label: "Ready", tone: "bg-brand-soft text-ink", icon: CheckCircle2 },
  done_with_issues: { label: "Ready, with issues", tone: "bg-brand-soft text-ink", icon: CheckCircle2 },
  failed: { label: "Failed", tone: "bg-danger-soft text-danger", icon: XCircle },
};

export function StatusPill({ status, paused = false }: { status: UploadStatus; paused?: boolean }) {
  const { label, tone, icon: Icon } = paused ? { label: "Paused", tone: "bg-surface-2 text-ink", icon: PauseCircle } : STATUS[status];
  return (
    <span className={`${tagClasses} ${tone}`}>
      <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={2.5} />
      {label}
    </span>
  );
}

// Soft fills instead of outlines, so a notice reads as one calm block: sky for information, pale lime for
// success, and yellow and red only for warnings and errors.
const NOTICE = {
  info: { icon: Info, tone: "bg-accent-soft", iconTone: "text-accent-ink" },
  success: { icon: CheckCircle2, tone: "bg-brand-soft", iconTone: "text-ink" },
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
      className={`fade-in flex flex-wrap items-start gap-2.5 rounded-card p-5 ${toneClass}`}
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

/** A friendly "nothing here yet" moment: a sticker, an icon or the eagles, a short headline and the next step. */
export function EmptyState({
  art,
  icon,
  mascot = false,
  title,
  children,
  action,
  heading: Heading = "h2",
}: {
  art?: StickerName;
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
        <Mascots sizes="200px" className="mb-5 w-[200px]" />
      ) : art ? (
        <Sticker name={art} size={80} className="mb-5" />
      ) : (
        icon && <div className="mb-5 grid size-14 place-items-center rounded-full bg-surface-2 text-ink-2">{icon}</div>
      )}
      <Heading className="text-2xl font-extrabold text-ink">{title}</Heading>
      {children && <div className="mt-2 max-w-md text-body text-ink-2">{children}</div>}
      {action && <div className="mt-7.5 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`rounded-control bg-surface-2 ${className}`} />;
}
