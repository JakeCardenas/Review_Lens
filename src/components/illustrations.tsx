import type { ReactNode } from "react";

export type ArtName = "csv" | "explore" | "report" | "ready";

// One flat language for every piece: a 2.5px charcoal outline, white paper, and fills from the palette
// (lime, sky blue, blue). Drawn on a 48px grid so they stay crisp from 20px to 64px.
const ART: Record<ArtName, ReactNode> = {
  // A spreadsheet with a lime header row and an upload badge: "Upload reviews".
  csv: (
    <>
      <path d="M12 5h17l9 9v27a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2.5" />
      <path d="M29 5v7a2 2 0 0 0 2 2h7" fill="var(--sky)" stroke="var(--ink)" strokeWidth="2.5" />
      <rect x="15" y="18" width="18" height="5" rx="1.5" fill="var(--lime)" />
      <rect x="15" y="26" width="13" height="4" rx="1.5" fill="var(--sky)" />
      <rect x="15" y="33" width="10" height="4" rx="1.5" fill="var(--sky)" />
      <circle cx="35" cy="36" r="8" fill="var(--blue)" stroke="var(--ink)" strokeWidth="2.5" />
      <path d="M35 40v-8m-3.5 3.5L35 32l3.5 3.5" stroke="var(--surface)" strokeWidth="2.5" />
    </>
  ),
  // A review bubble under a magnifier: "Explore feedback".
  explore: (
    <>
      <path d="M8 9h22a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H17l-6 5v-5H8a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3z" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2.5" />
      <path d="M11 15h14M11 20h8" stroke="var(--lime)" strokeWidth="3" />
      <path d="M38.5 35.5 43 40" stroke="var(--ink)" strokeWidth="6" />
      <path d="M38.5 35.5 43 40" stroke="var(--blue)" strokeWidth="2.5" />
      <circle cx="32" cy="29" r="8.5" fill="var(--sky)" stroke="var(--ink)" strokeWidth="2.5" />
      <path d="M28.5 27a4 4 0 0 1 3.5-2.5" stroke="var(--surface)" strokeWidth="2" />
    </>
  ),
  // A report with a small bar chart and a download badge: "Export report".
  report: (
    <>
      <path d="M12 5h24a2 2 0 0 1 2 2v34a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2.5" />
      <path d="M15 12h12" stroke="var(--ink)" strokeWidth="2.5" />
      <rect x="15" y="24" width="5" height="11" rx="1.5" fill="var(--lime)" />
      <rect x="22" y="18" width="5" height="17" rx="1.5" fill="var(--blue)" />
      <circle cx="35" cy="36" r="8" fill="var(--lime)" stroke="var(--ink)" strokeWidth="2.5" />
      <path d="M35 32v7m-3.5-3.5L35 39l3.5-3.5" stroke="var(--on-brand)" strokeWidth="2.5" />
    </>
  ),
  // A lime check with one small spark: a job that finished.
  ready: (
    <>
      <circle cx="23" cy="25" r="16" fill="var(--lime)" stroke="var(--ink)" strokeWidth="2.5" />
      <path d="m15.5 25.5 5 5 10-11" stroke="var(--on-brand)" strokeWidth="3.5" />
      <path d="M41 6v6M38 9h6" stroke="var(--blue)" strokeWidth="2.5" />
    </>
  ),
};

/**
 * Small flat illustrations for the main jobs: a CSV sheet for uploading, a magnifier for exploring
 * feedback, a report for exporting, and a check when something is ready. Used sparingly, beside a
 * visible label; decorative, so screen readers skip them.
 */
export function ActionArt({ name, size = 24, className = "" }: { name: ArtName; size?: number; className?: string }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      {ART[name]}
    </svg>
  );
}
