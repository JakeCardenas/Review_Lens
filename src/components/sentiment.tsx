import { Frown, Meh, Smile, type LucideIcon } from "lucide-react";
import type { Confidence, Sentiment } from "@/lib/types";

export const SENTIMENT_META: Record<Sentiment, { label: string; icon: LucideIcon; chip: string; swatch: string }> = {
  positive: { label: "Positive", icon: Smile, chip: "bg-pos-soft text-pos-ink", swatch: "bg-pos" },
  neutral: { label: "Neutral", icon: Meh, chip: "bg-neu-soft text-neu-ink", swatch: "bg-neu" },
  negative: { label: "Negative", icon: Frown, chip: "bg-neg-soft text-neg-ink", swatch: "bg-neg" },
};

export function SentimentIcon({ sentiment, className = "size-4" }: { sentiment: Sentiment; className?: string }) {
  const Icon = SENTIMENT_META[sentiment].icon;
  return <Icon aria-hidden className={className} />;
}

/** Sentiment as icon + word, never color alone. */
export function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const meta = SENTIMENT_META[sentiment];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${meta.chip}`}>
      <SentimentIcon sentiment={sentiment} className="size-3.5" />
      {meta.label}
    </span>
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
    <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink">
      <span aria-hidden className="inline-flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-2 w-3.5 rounded-[3px] border ${i < filled ? "border-ink bg-ink" : "border-ink-3 bg-transparent"}`}
          />
        ))}
      </span>
      <span>
        <span className="sr-only">Confidence: </span>
        {label}
        <span className="text-ink-2 font-normal"> confidence</span>
      </span>
    </span>
  );
}
