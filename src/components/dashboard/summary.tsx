import type { ReactNode } from "react";

/** One headline number: an uppercase caption, a big rounded number and a line of context. */
export function StatTile({
  label,
  value,
  note,
  icon,
  emphasis = false,
  className = "",
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  icon?: ReactNode;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col rounded-card border-2 border-line bg-surface p-5 sm:p-6 ${className}`}>
      <p className="nav-label flex items-center gap-1.5 text-[13px] text-ink-2">
        {icon}
        {label}
      </p>
      <p className={`mt-4 font-display text-heading font-black leading-none tabular ${emphasis ? "text-brand-display" : "text-ink"}`}>
        {value}
      </p>
      {note && <div className="mt-auto pt-4 text-[15px] text-ink-2">{note}</div>}
    </div>
  );
}
