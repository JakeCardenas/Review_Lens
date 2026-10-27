const numberFormat = new Intl.NumberFormat("en-US");
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const dateTimeFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export function formatNumber(n: number): string {
  return numberFormat.format(n);
}

/** Whole-number percentage of `part` in `whole`, e.g. "58%". */
export function formatPercent(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

/** Formats an ISO date (YYYY-MM-DD) without shifting it by time zone. */
export function formatDate(iso: string | null): string {
  if (!iso) return "No date";
  return dateFormat.format(new Date(`${iso}T00:00:00Z`));
}

export function formatDateTime(date: Date): string {
  return dateTimeFormat.format(date);
}

const monthFormat = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const dayFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Label for a timeline period that starts on the ISO date `period`. */
export function periodLabel(period: string, grain: "day" | "week" | "month"): string {
  const date = new Date(`${period}T00:00:00Z`);
  if (grain === "month") return monthFormat.format(date);
  return grain === "week" ? `Week of ${dayFormat.format(date)}` : dayFormat.format(date);
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${formatNumber(n)} ${n === 1 ? one : many}`;
}
