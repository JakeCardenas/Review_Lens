import Link from "next/link";
import { SENTIMENT_META, SentimentIcon } from "@/components/sentiment";
import type { KeywordsBySentiment } from "@/lib/analysis/keywords";
import { formatNumber, formatPercent } from "@/lib/format";
import type { TopicBreakdown } from "@/lib/server/dashboard";
import { SENTIMENTS, type Sentiment } from "@/lib/types";

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
                <span className="flex items-center gap-1.5 font-semibold">
                  <SentimentIcon sentiment={s} />
                  {meta.label}
                </span>
                <span className="tabular text-ink-2">
                  <span className="font-display text-base font-semibold text-ink">{formatPercent(sentiment[s], labeled)}</span>{" "}
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

/** One row per topic, centered on neutral: negative grows left, positive grows right. */
export function TopicRows({ topics, reviewsHref }: { topics: TopicBreakdown[]; reviewsHref: (topic: string) => string }) {
  return (
    <div>
      <div className="mb-2 flex justify-between pl-0 text-xs text-ink-2 sm:pl-[11.5rem]" aria-hidden>
        <span>More negative</span>
        <span>More positive</span>
      </div>
      <ul className="grid gap-1">
        {topics.map((t) => {
          const pct = (n: number) => (t.total ? (n / t.total) * 100 : 0);
          return (
            <li key={t.id}>
              <Link
                href={reviewsHref(t.id)}
                className="press grid gap-1.5 rounded-control px-2 py-2 hover:bg-surface-2 sm:grid-cols-[11rem_1fr] sm:items-center sm:gap-3"
              >
                <span className="text-sm font-semibold leading-tight">
                  {t.label}
                  <span className="block text-xs font-normal text-ink-2 tabular">{formatNumber(t.total)} mentions</span>
                </span>
                <span className="grid gap-1">
                  <span className="relative grid h-3.5 grid-cols-2" aria-hidden>
                    <span className="flex justify-end gap-0.5 pr-px">
                      <span className="h-full rounded-l-[4px] bg-neg" style={{ width: `${pct(t.negative)}%` }} />
                      <span className="h-full bg-neu" style={{ width: `${pct(t.neutral) / 2}%` }} />
                    </span>
                    <span className="flex justify-start gap-0.5 pl-px">
                      <span className="h-full bg-neu" style={{ width: `${pct(t.neutral) / 2}%` }} />
                      <span className="h-full rounded-r-[4px] bg-pos" style={{ width: `${pct(t.positive)}%` }} />
                    </span>
                    <span className="absolute inset-y-[-3px] left-1/2 w-px bg-ink-3" />
                  </span>
                  <span className="flex justify-between text-xs text-ink-2 tabular">
                    <span>{formatPercent(t.negative, t.total)} negative</span>
                    <span>{formatPercent(t.positive, t.total)} positive</span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
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
    <div className="grid gap-5 md:grid-cols-3">
      {SENTIMENTS.map((s) => {
        const meta = SENTIMENT_META[s];
        const list = keywords[s];
        const max = Math.max(1, ...list.map((k) => k.count));
        return (
          <div key={s} className="min-w-0">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <SentimentIcon sentiment={s} />
              {meta.label}
              <span className="font-normal text-ink-2">in {formatNumber(totals[s])} reviews</span>
            </h3>
            {list.length ? (
              <ol className="mt-2 grid gap-1">
                {list.map((k) => (
                  <li key={k.term}>
                    <Link
                      href={searchHref(k.term, s)}
                      className="press grid grid-cols-[1fr_auto] items-center gap-x-2 rounded-control px-2 py-1.5 text-sm hover:bg-surface-2"
                    >
                      <span className="truncate font-medium">{k.term}</span>
                      <span className="text-xs text-ink-2 tabular">{k.count}</span>
                      <span className="col-span-2 mt-1 h-1 rounded-full bg-surface-2" aria-hidden>
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
