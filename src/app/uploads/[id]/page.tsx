import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CalendarX2, Filter, Inbox } from "lucide-react";
import { ConfidenceExplainer } from "@/components/confidence-explainer";
import { KeywordColumns, SentimentBars, TopicRows } from "@/components/dashboard/charts";
import { LabelCheckCard } from "@/components/dashboard/label-check";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { FiltersBar } from "@/components/filters-bar";
import { ImportUnfinished } from "@/components/import-unfinished";
import { ReviewCard } from "@/components/review-card";
import { SentimentIcon } from "@/components/sentiment";
import { ButtonLink, Card, EmptyState, Notice } from "@/components/ui";
import { formatNumber, formatPercent, plural } from "@/lib/format";
import { getDashboard } from "@/lib/server/dashboard";
import { getDb } from "@/lib/server/db";
import { dashboardFilters, filtersToQuery, hasActiveFilters, parseFilters } from "@/lib/server/filters";
import { getFilterOptions } from "@/lib/server/reviews";
import { getProgress, getUpload } from "@/lib/server/uploads";
import type { Sentiment } from "@/lib/types";

export default async function OverviewPage({ params, searchParams }: PageProps<"/uploads/[id]">) {
  await connection();
  const { id } = await params;
  const db = getDb();
  const upload = await getUpload(db, id);
  if (!upload) notFound();
  if (upload.status === "importing") return <ImportUnfinished />;

  const filters = dashboardFilters(parseFilters(await searchParams));
  const [dashboard, options, progress] = await Promise.all([
    getDashboard(db, upload, filters),
    getFilterOptions(db, id),
    getProgress(db, id),
  ]);

  const base = `/uploads/${id}/reviews`;
  const linkTo = (extra: Record<string, string>) => {
    const query = new URLSearchParams(filtersToQuery(filters));
    for (const [key, value] of Object.entries(extra)) query.set(key, value);
    return `${base}?${query}`;
  };
  const { totals, sentiment } = dashboard;
  const filtered = hasActiveFilters(filters);
  const scale = upload.ratingScale ?? 5;

  return (
    <div className="grid gap-5">
      {progress && !progress.done && (
        <Notice
          tone="warning"
          title="Analysis isn't finished"
          action={<ButtonLink href={`/uploads/${id}/analyze`} size="sm">Continue analysis</ButtonLink>}
        >
          {formatNumber(progress.labeled + progress.notLabeled + progress.failed)} of {formatNumber(progress.imported)} reviews are
          processed. The numbers below will change as the rest are analyzed.
        </Notice>
      )}

      <Suspense fallback={null}>
        <FiltersBar
          mode="dashboard"
          options={{
            products: options.products,
            minDate: options.minDate,
            maxDate: options.maxDate,
            hasDate: upload.hasDate,
            hasRating: upload.hasRating,
            hasProduct: upload.hasProduct,
            ratingScale: upload.ratingScale,
          }}
        />
      </Suspense>

      {totals.all === 0 ? (
        filtered ? (
          <EmptyState
            icon={<Filter aria-hidden className="size-6" />}
            title="No reviews match these filters"
            action={<ButtonLink href={`/uploads/${id}`} variant="secondary">Clear filters</ButtonLink>}
          >
            Try a wider date range, another product or a different rating.
          </EmptyState>
        ) : (
          <EmptyState
            icon={<Inbox aria-hidden className="size-6" />}
            title="No reviews were imported"
            action={<ButtonLink href={`/uploads/${id}/issues`} variant="secondary">See why</ButtonLink>}
          >
            Every row in the file was skipped, usually because the review text column was empty.
          </EmptyState>
        )
      ) : (
        <>
          <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-card border border-line bg-surface p-4">
              <p className="text-sm text-ink-2">Reviews labeled</p>
              <p className="font-display text-3xl font-semibold tracking-tight tabular">{formatNumber(totals.labeled)}</p>
              <p className="text-xs text-ink-2">of {formatNumber(totals.all)} imported</p>
            </div>
            {(["positive", "negative"] as Sentiment[]).map((s) => (
              <div key={s} className="rounded-card border border-line bg-surface p-4">
                <p className="flex items-center gap-1.5 text-sm text-ink-2">
                  <SentimentIcon sentiment={s} />
                  {s === "positive" ? "Positive" : "Negative"}
                </p>
                <p className="font-display text-3xl font-semibold tracking-tight tabular">{formatPercent(sentiment[s], totals.labeled)}</p>
                <p className="text-xs text-ink-2">{plural(sentiment[s], "review")}</p>
              </div>
            ))}
            <div className="rounded-card border border-line bg-surface p-4">
              {upload.hasRating && dashboard.averageRating !== null ? (
                <>
                  <p className="text-sm text-ink-2">Average rating</p>
                  <p className="font-display text-3xl font-semibold tracking-tight tabular">
                    {dashboard.averageRating.toFixed(1)}
                    <span className="text-lg text-ink-2"> / {scale}</span>
                  </p>
                  <p className="text-xs text-ink-2">from the file&apos;s rating column</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-ink-2">Low confidence</p>
                  <p className="font-display text-3xl font-semibold tracking-tight tabular">{formatNumber(dashboard.confidence.low)}</p>
                  <p className="text-xs text-ink-2">worth reading yourself</p>
                </>
              )}
            </div>
          </section>

          {(totals.notLabeled > 0 || totals.failed > 0) && (
            <Notice title={`${plural(totals.notLabeled + totals.failed, "review")} not counted in the charts`}>
              {totals.unsupportedLanguage > 0 && `${plural(totals.unsupportedLanguage, "review")} in other languages. `}
              {totals.notLabeled - totals.unsupportedLanguage > 0 &&
                `${plural(totals.notLabeled - totals.unsupportedLanguage, "review")} mixing languages. `}
              {totals.failed > 0 && `${plural(totals.failed, "review")} couldn't be analyzed. `}
              <a href={`/uploads/${id}/issues`} className="font-semibold text-brand-ink underline-offset-2 hover:underline">
                See the issues
              </a>
            </Notice>
          )}

          <div className="grid gap-5 lg:grid-cols-5">
            <Card
              title="Sentiment distribution"
              description={
                totals.labeled
                  ? `${formatPercent(sentiment.positive, totals.labeled)} of labeled reviews are positive and ${formatPercent(sentiment.negative, totals.labeled)} are negative.`
                  : "No reviews are labeled yet."
              }
              className="lg:col-span-2"
            >
              <SentimentBars sentiment={sentiment} labeled={totals.labeled} />
              {totals.mixedOpinion > 0 && (
                <p className="mt-3 text-sm text-ink-2">
                  {formatNumber(totals.mixedOpinion)} of {formatNumber(totals.labeled)} labeled reviews mix praise and complaints.{" "}
                  <a href={linkTo({ opinion: "mixed" })} className="font-semibold text-brand-ink underline-offset-2 hover:underline">
                    Read them
                  </a>
                </p>
              )}
            </Card>
            <Card
              title="Sentiment over time"
              description={dashboard.trend.status === "ok" ? "Share of each sentiment per period." : undefined}
              className="lg:col-span-3"
            >
              {dashboard.trend.status === "ok" ? (
                <TrendChart points={dashboard.trend.points} grain={dashboard.trend.grain} />
              ) : (
                <div className="flex flex-col items-center rounded-control bg-surface-2 px-6 py-10 text-center">
                  <CalendarX2 aria-hidden className="size-7 text-ink-3" />
                  <p className="mt-2 font-semibold">No timeline for this data</p>
                  <p className="mt-1 max-w-sm text-sm text-ink-2">{dashboard.trend.reason}</p>
                </div>
              )}
            </Card>
          </div>

          {dashboard.check && (
            <LabelCheckCard
              check={dashboard.check}
              ratingScale={upload.ratingScale}
              disagreementsHref={linkTo({ check: "disagree" })}
            />
          )}

          <Card
            title="Common topics"
            description={
              dashboard.topics.length
                ? `${dashboard.topics[0].label} comes up most, in ${plural(dashboard.topics[0].total, "review")}. Select a topic to read those reviews.`
                : undefined
            }
          >
            {dashboard.topics.length ? (
              <TopicRows topics={dashboard.topics} reviewsHref={(topic) => linkTo({ topic })} />
            ) : (
              <p className="text-sm text-ink-2">None of the eight tracked topics (delivery, price, quality and others) came up yet.</p>
            )}
          </Card>

          <Card title="Words that stand out" description="Words and phrases from at least 2 reviews that are more common in one sentiment than the others.">
            <KeywordColumns
              keywords={dashboard.keywords}
              totals={sentiment}
              searchHref={(term, s) => linkTo({ q: term, sentiment: s })}
            />
          </Card>

          {dashboard.readFirst.length > 0 && (
            <Card
              title="Reviews to read first"
              description="Negative reviews, most confident and newest first."
              actions={<ButtonLink href={linkTo({ sentiment: "negative" })} variant="ghost" size="sm">All negative reviews</ButtonLink>}
            >
              <ul className="grid gap-3">
                {dashboard.readFirst.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    href={linkTo({ review: String(review.id) })}
                    checkSource={dashboard.check?.source ?? null}
                  />
                ))}
              </ul>
            </Card>
          )}

          <ConfidenceExplainer basicMode={upload.provider === "basic"} />
        </>
      )}
    </div>
  );
}
