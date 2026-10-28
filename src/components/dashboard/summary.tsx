import type { ReactNode } from "react";

/** One headline number with its label and a line of context. */
export function StatTile({
  label,
  value,
  note,
  icon,
  className = "",
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col rounded-card border-[1.5px] border-line bg-surface p-5 sm:p-6 ${className}`}>
      <p className="flex items-center gap-1.5 text-sm font-bold text-ink-2">
        {icon}
        {label}
      </p>
      <p className="mt-3 font-display text-[2.5rem] font-black leading-none tracking-[-0.02em] tabular">{value}</p>
      {note && <div className="mt-auto pt-3 text-sm text-ink-2">{note}</div>}
    </div>
  );
}
