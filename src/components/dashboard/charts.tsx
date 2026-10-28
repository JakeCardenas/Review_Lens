import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ConfidenceBars, SENTIMENT_META, SentimentIcon } from "@/components/sentiment";
import type { KeywordsBySentiment } from "@/lib/analysis/keywords";
import { formatNumber, formatPercent, plural } from "@/lib/format";
import type { TopicBreakdown } from "@/lib/server/dashboard";
import { CONFIDENCE_LEVELS, SENTIMENTS, type Confidence, type Sentiment } from "@/lib/types";

/** Horizontal bar chart of sentiment shares, with words, icons and numbers on every bar. */
export function SentimentBars({ sentiment, labeled }: { sentiment: Record<Sentiment, number>; labeled: number }) {
  return (
    <div>
      <ul className="grid gap-4">
        {SENTIMENTS.map((s) => {
          const meta = SENTIMENT_META[s];
          const width = labeled ? (sentiment[s] / labeled) * 100 : 0;
          return (
            <li key={s} className="grid gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="flex items-center gap-1.5 font-bold">
                  <SentimentIcon sentiment={s} className={`size-4 ${meta.ink}`} />
                  {meta.label}
                </span>
                <span className="tabular text-ink-2">
                  <span className="font-display text-base font-black text-ink">{formatPercent(sentiment[s], labeled)}</span>{" "}
                  {formatNumber(sentiment[s])} reviews
                </span>
              </div>
              <div className="h-3 rounded-full bg-surface-2" aria-hidden>
                <div className={`h-full rounded-full ${meta.swatch}`} style={{ width: `${width}%`, minWidth: sentiment[s] ? 6 : 0 }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-ink-2">Shares of {formatNumber(labeled)} labeled reviews.</p>
    </div>
  );
}

/** Small swatch-and-icon key for charts that split bars by sentiment. */
export function SentimentKey() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2" aria-label="Colors">
      {SENTIMENTS.map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span aria-hidden className={`size-2.5 rounded-[3px] ${SENTIMENT_META[s].swatch}`} />
          <SentimentIcon sentiment={s} className={`size-3.5 ${SENTIMENT_META[s].ink}`} />
          {SENTIMENT_META[s].label}
        </li>
      ))}
    </ul>
  );
}

/**
 * Topics as horizontal bars: bar length is how many reviews mention the topic, and each bar is split
 * into positive, neutral and negative. Every row states its numbers, and a table repeats them.
 */
export function TopicBars({ topics, reviewsHref }: { topics: TopicBreakdown[]; reviewsHref: (topic: string) => string }) {
  const max = Math.max(1, ...topics.map((t) => t.total));
  return (
    <div className="grid gap-4">
      <SentimentKey />
      <ul className="grid gap-1">
        {topics.map((t) => (
          <li key={t.id}>
            <Link
              href={reviewsHref(t.id)}
              className="group -mx-2 grid gap-2 rounded-xl px-2 py-2.5 hover:bg-surface-2 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-center sm:gap-4"
            >
              <span className="flex items-baseline justify-between gap-2 sm:block">
                <span className="block font-bold leading-tight group-hover:text-brand-ink">{t.label}</span>
                <span className="block text-[13px] text-ink-2 tabular">{plural(t.total, "mention")}</span>
              </span>
              <span className="grid gap-1.5">
                <span aria-hidden className="flex h-3.5 gap-[2px]" style={{ width: `${Math.max(4, (t.total / max) * 100)}%` }}>
                  {SENTIMENTS.filter((s) => t[s] > 0).map((s) => (
                    <span
                      key={s}
                      className={`h-full rounded-[3px] first:rounded-l-full last:rounded-r-full ${SENTIMENT_META[s].swatch}`}
                      style={{ flexGrow: t[s], flexBasis: 0, minWidth: 4 }}
                    />
                  ))}
                </span>
                <span className="flex flex-wrap gap-x-3 text-[13px] text-ink-2 tabular">
                  <span>{formatPercent(t.positive, t.total)} positive</span>
                  <span>{formatPercent(t.neutral, t.total)} neutral</span>
                  <span className={t.negative ? "font-bold text-neg-ink" : undefined}>{formatPercent(t.negative, t.total)} negative</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <details className="text-sm">
        <summary className="w-fit cursor-pointer rounded-lg py-1 font-bold text-brand-ink">View as table</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left">
            <caption className="sr-only">Reviews mentioning each topic, by sentiment</caption>
            <thead className="text-ink-2">
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pr-3 font-bold">Topic</th>
                <th scope="col" className="py-2 pr-3 text-right font-bold">Mentions</th>
                <th scope="col" className="py-2 pr-3 text-right font-bold">Positive</th>
                <th scope="col" className="py-2 pr-3 text-right font-bold">Neutral</th>
                <th scope="col" className="py-2 text-right font-bold">Negative</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {topics.map((t) => (
                <tr key={t.id} className="border-b border-line last:border-0">
                  <th scope="row" className="py-2 pr-3 font-semibold">{t.label}</th>
                  <td className="py-2 pr-3 text-right">{formatNumber(t.total)}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(t.positive)}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(t.neutral)}</td>
                  <td className="py-2 text-right">{formatNumber(t.negative)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

export function AttentionTopics({ topics, href }: { topics: TopicBreakdown[]; href: (topic: string) => string }) {
  return (
    <ol className="grid gap-2">
      {topics.map((t, i) => (
        <li key={t.id}>
          <Link
            href={href(t.id)}
            className="group flex items-center gap-3 rounded-xl border-[1.5px] border-line px-3.5 py-3 hover:border-[#f2c9ad] hover:bg-neg-soft"
          >
            <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-lg bg-neg-soft font-display text-sm font-black text-neg-ink">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{t.label}</span>
              <span className="block text-[13px] text-ink-2 tabular">
                {formatNumber(t.negative)} negative of {plural(t.total, "mention")} ({formatPercent(t.negative, t.total)})
              </span>
            </span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </li>
      ))}
    </ol>
  );
}

const CONFIDENCE_META: Record<Confidence, { label: string; filled: number; swatch: string }> = {
  high: { label: "High", filled: 3, swatch: "bg-conf-high" },
  medium: { label: "Medium", filled: 2, swatch: "bg-conf-medium" },
  low: { label: "Low", filled: 1, swatch: "bg-conf-low" },
};

/** How many labels are high, medium and low confidence, as bars with their counts. */
export function ConfidenceBreakdown({ confidence }: { confidence: Record<Confidence, number> }) {
  const total = CONFIDENCE_LEVELS.reduce((sum, level) => sum + confidence[level], 0);
  return (
    <ul className="grid gap-4">
      {CONFIDENCE_LEVELS.map((level) => {
        const meta = CONFIDENCE_META[level];
        const share = total ? (confidence[level] / total) * 100 : 0;
        return (
          <li key={level} className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-bold">
                <ConfidenceBars filled={meta.filled} />
                {meta.label}
              </span>
              <span className="tabular text-ink-2">
                <span className="font-display text-base font-black text-ink">{formatPercent(confidence[level], total)}</span>{" "}
                {formatNumber(confidence[level])}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-surface-2" aria-hidden>
              <div className={`h-full rounded-full ${meta.swatch}`} style={{ width: `${share}%`, minWidth: confidence[level] ? 6 : 0 }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Words and phrases that stand out in each sentiment, linking to matching reviews. */
export function KeywordColumns({
  keywords,
  totals,
  searchHref,
}: {
  keywords: KeywordsBySentiment;
  totals: Record<Sentiment, number>;
  searchHref: (term: string, sentiment: Sentiment) => string;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-3 md:gap-5">
      {SENTIMENTS.map((s) => {
        const meta = SENTIMENT_META[s];
        const list = keywords[s];
        const max = Math.max(1, ...list.map((k) => k.count));
        return (
          <div key={s} className="min-w-0">
            <h3 className="flex flex-wrap items-center gap-x-1.5 border-b border-line pb-2 text-sm font-bold">
              <SentimentIcon sentiment={s} className={`size-4 ${meta.ink}`} />
              {meta.label}
              <span className="font-normal text-ink-2">in {formatNumber(totals[s])} reviews</span>
            </h3>
            {list.length ? (
              <ol className="mt-2 grid gap-0.5">
                {list.map((k) => (
                  <li key={k.term}>
                    <Link
                      href={searchHref(k.term, s)}
                      className="grid grid-cols-[1fr_auto] items-center gap-x-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2"
                    >
                      <span title={k.term} className="truncate font-semibold">{k.term}</span>
                      <span className="text-xs text-ink-2 tabular">{k.count}</span>
                      <span className="col-span-2 mt-1 h-1.5 rounded-full bg-surface-2" aria-hidden>
                        <span className={`block h-full rounded-full ${meta.swatch}`} style={{ width: `${(k.count / max) * 100}%` }} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-ink-2">No words stand out yet. Keywords need at least 2 reviews each.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
