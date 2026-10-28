import { Frown, Meh, Smile, type LucideIcon } from "lucide-react";
import { tagClasses } from "@/components/ui";
import { formatNumber, formatPercent } from "@/lib/format";
import { SENTIMENTS, type Confidence, type Sentiment } from "@/lib/types";

export const SENTIMENT_META: Record<Sentiment, { label: string; icon: LucideIcon; chip: string; swatch: string; ink: string }> = {
  positive: { label: "Positive", icon: Smile, chip: "border-fresh-leaf bg-pos-soft text-pos-ink", swatch: "bg-pos", ink: "text-pos-ink" },
  neutral: { label: "Neutral", icon: Meh, chip: "border-line bg-neu-soft text-neu-ink", swatch: "bg-neu", ink: "text-neu-ink" },
  negative: { label: "Negative", icon: Frown, chip: "border-[#c9cbe0] bg-neg-soft text-neg-ink", swatch: "bg-neg", ink: "text-neg-ink" },
};

export function SentimentIcon({ sentiment, className = "size-4" }: { sentiment: Sentiment; className?: string }) {
  const Icon = SENTIMENT_META[sentiment].icon;
  return <Icon aria-hidden className={className} strokeWidth={2.5} />;
}

/** Sentiment as icon + word, never color alone. */
export function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const meta = SENTIMENT_META[sentiment];
  return (
    <span className={`${tagClasses} ${meta.chip}`}>
      <SentimentIcon sentiment={sentiment} className="size-3.5" />
      {meta.label}
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
          <span aria-hidden className={`size-3 rounded-full ${SENTIMENT_META[s].swatch}`} />
          <SentimentIcon sentiment={s} className={`size-4 ${SENTIMENT_META[s].ink}`} />
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
