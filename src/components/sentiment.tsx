import { tagClasses } from "@/components/ui";
import { formatNumber, formatPercent } from "@/lib/format";
import { SENTIMENTS, type Confidence, type Sentiment } from "@/lib/types";

// Positive lime, neutral grey and negative charcoal: the same three colours on bars, lines and faces.
export const SENTIMENT_META: Record<Sentiment, { label: string; swatch: string }> = {
  positive: { label: "Positive", swatch: "bg-pos" },
  neutral: { label: "Neutral", swatch: "bg-neu" },
  negative: { label: "Negative", swatch: "bg-neg" },
};

const FACE: Record<Sentiment, { fill: string; feature: string; mouth: string }> = {
  positive: { fill: "var(--pos)", feature: "var(--on-brand)", mouth: "M6.6 11.7c1.9 2.2 4.9 2.2 6.8 0" },
  neutral: { fill: "var(--neu)", feature: "var(--ink)", mouth: "M7 12.6h6" },
  negative: { fill: "var(--neg)", feature: "#fff", mouth: "M6.6 14c1.9-2.1 4.9-2.1 6.8 0" },
};

/** A small round face in the sentiment's colour: it is the colour key and the icon in one. Always next to the word. */
export function SentimentIcon({ sentiment, className = "size-4" }: { sentiment: Sentiment; className?: string }) {
  const { fill, feature, mouth } = FACE[sentiment];
  return (
    <svg aria-hidden focusable="false" viewBox="0 0 20 20" className={`shrink-0 ${className}`}>
      <circle cx="10" cy="10" r="9.5" fill={fill} />
      <ellipse cx="7" cy="8" rx="1.3" ry="1.7" fill={feature} />
      <ellipse cx="13" cy="8" rx="1.3" ry="1.7" fill={feature} />
      <path d={mouth} fill="none" stroke={feature} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/** Sentiment as face + word, never colour alone. */
export function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  return (
    <span className={`${tagClasses} bg-surface-2 pl-1 text-ink`}>
      <SentimentIcon sentiment={sentiment} className="size-[18px]" />
      {SENTIMENT_META[sentiment].label}
    </span>
  );
}

/**
 * One thick rounded bar split into positive, neutral and negative, with a 2px gap between parts.
 * Decorative: always shown next to the same numbers as text.
 */
export function SentimentStackedBar({
  counts,
  className = "h-4",
}: {
  counts: Record<Sentiment, number>;
  className?: string;
}) {
  const total = counts.positive + counts.neutral + counts.negative;
  if (!total) return <div aria-hidden className={`rounded-full bg-surface-3 ${className}`} />;
  return (
    <div aria-hidden className={`flex gap-[3px] ${className}`}>
      {SENTIMENTS.filter((s) => counts[s] > 0).map((s) => (
        <span
          key={s}
          className={`h-full rounded-[6px] first:rounded-l-full last:rounded-r-full ${SENTIMENT_META[s].swatch}`}
          style={{ flexGrow: counts[s], flexBasis: 0, minWidth: 8 }}
        />
      ))}
    </div>
  );
}

/** The three sentiments as icon, word, share and count: the text version of a stacked bar. */
export function SentimentLegend({ counts, compact = false }: { counts: Record<Sentiment, number>; compact?: boolean }) {
  const total = counts.positive + counts.neutral + counts.negative;
  return (
    <ul className={`flex flex-wrap ${compact ? "gap-x-4 gap-y-1 text-[13px]" : "gap-x-6 gap-y-2 text-[15px]"}`}>
      {SENTIMENTS.map((s) => (
        <li key={s} className="flex items-center gap-1.5 tabular">
          <SentimentIcon sentiment={s} className={compact ? "size-4" : "size-5"} />
          <span className="font-extrabold text-ink">{formatPercent(counts[s], total)}</span>
          <span className="text-ink-2">
            {SENTIMENT_META[s].label.toLowerCase()}
            {!compact && ` (${formatNumber(counts[s])})`}
          </span>
        </li>
      ))}
    </ul>
  );
}

const LEVEL: Record<Confidence, { label: string; filled: number }> = {
  high: { label: "High", filled: 3 },
  medium: { label: "Medium", filled: 2 },
  low: { label: "Low", filled: 1 },
};

/** Three-step confidence meter with its word. Deliberately not a percentage. */
export function ConfidenceMeter({ level }: { level: Confidence }) {
  const { label, filled } = LEVEL[level];
  return (
    <span className="inline-flex items-center gap-2 text-[13px] font-extrabold text-ink">
      <ConfidenceBars filled={filled} />
      <span>
        <span className="sr-only">Confidence: </span>
        {label}
        <span className="font-semibold text-ink-2"> confidence</span>
      </span>
    </span>
  );
}

export function ConfidenceBars({ filled }: { filled: number }) {
  return (
    <span aria-hidden className="inline-flex items-end gap-[3px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`w-[7px] rounded-[3px] ${i < filled ? "bg-conf-high" : "bg-surface-3"}`}
          style={{ height: 7 + i * 4 }}
        />
      ))}
    </span>
  );
}
