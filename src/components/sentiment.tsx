import { Frown, Meh, Smile, type LucideIcon } from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/format";
import { SENTIMENTS, type Confidence, type Sentiment } from "@/lib/types";

export const SENTIMENT_META: Record<Sentiment, { label: string; icon: LucideIcon; chip: string; swatch: string; ink: string }> = {
  positive: { label: "Positive", icon: Smile, chip: "bg-pos-soft text-pos-ink", swatch: "bg-pos", ink: "text-pos-ink" },
  neutral: { label: "Neutral", icon: Meh, chip: "bg-neu-soft text-neu-ink", swatch: "bg-neu", ink: "text-neu-ink" },
  negative: { label: "Negative", icon: Frown, chip: "bg-neg-soft text-neg-ink", swatch: "bg-neg", ink: "text-neg-ink" },
};

export function SentimentIcon({ sentiment, className = "size-4" }: { sentiment: Sentiment; className?: string }) {
  const Icon = SENTIMENT_META[sentiment].icon;
  return <Icon aria-hidden className={className} />;
}

/** Sentiment as icon + word, never color alone. */
export function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const meta = SENTIMENT_META[sentiment];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[13px] font-bold ${meta.chip}`}>
      <SentimentIcon sentiment={sentiment} className="size-3.5" />
      {meta.label}
    </span>
  );
}

/**
 * One bar split into positive, neutral and negative, with a 2px gap between parts.
 * Decorative: always shown next to the same numbers as text.
 */
export function SentimentStackedBar({
  counts,
  className = "h-3",
}: {
  counts: Record<Sentiment, number>;
  className?: string;
}) {
  const total = counts.positive + counts.neutral + counts.negative;
  if (!total) return <div aria-hidden className={`rounded-full bg-surface-2 ${className}`} />;
  return (
    <div aria-hidden className={`flex gap-[2px] ${className}`}>
      {SENTIMENTS.filter((s) => counts[s] > 0).map((s) => (
        <span
          key={s}
          className={`h-full rounded-[4px] first:rounded-l-full last:rounded-r-full ${SENTIMENT_META[s].swatch}`}
          style={{ flexGrow: counts[s], flexBasis: 0, minWidth: 6 }}
        />
      ))}
    </div>
  );
}

/** The three sentiments as icon, word, share and count: the text version of a stacked bar. */
export function SentimentLegend({ counts, compact = false }: { counts: Record<Sentiment, number>; compact?: boolean }) {
  const total = counts.positive + counts.neutral + counts.negative;
  return (
    <ul className={`flex flex-wrap ${compact ? "gap-x-4 gap-y-1 text-[13px]" : "gap-x-6 gap-y-2 text-sm"}`}>
      {SENTIMENTS.map((s) => (
        <li key={s} className="flex items-center gap-1.5 tabular">
          <span aria-hidden className={`size-2.5 rounded-[3px] ${SENTIMENT_META[s].swatch}`} />
          <SentimentIcon sentiment={s} className={`size-4 ${SENTIMENT_META[s].ink}`} />
          <span className="font-bold text-ink">{formatPercent(counts[s], total)}</span>
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
    <span className="inline-flex items-center gap-2 text-[13px] font-bold text-ink">
      <ConfidenceBars filled={filled} />
      <span>
        <span className="sr-only">Confidence: </span>
        {label}
        <span className="font-normal text-ink-2"> confidence</span>
      </span>
    </span>
  );
}

export function ConfidenceBars({ filled }: { filled: number }) {
  return (
    <span aria-hidden className="inline-flex items-end gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`w-1.5 rounded-[2px] ${i < filled ? "bg-conf-high" : "bg-conf-low"}`}
          style={{ height: 6 + i * 3 }}
        />
      ))}
    </span>
  );
}
