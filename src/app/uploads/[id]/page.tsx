import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CalendarX2, CheckCircle2, Filter, Inbox, Scale, Star } from "lucide-react";
import { ConfidenceExplainer } from "@/components/confidence-explainer";
import { AttentionTopics, ConfidenceBreakdown, KeywordColumns, TopicBars } from "@/components/dashboard/charts";
import { LabelCheckCard } from "@/components/dashboard/label-check";
import { StatTile } from "@/components/dashboard/summary";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { FiltersBar } from "@/components/filters-bar";
import { ImportUnfinished } from "@/components/import-unfinished";
import { ReviewCard, ReviewSnippet } from "@/components/review-card";
import { SentimentLegend, SentimentStackedBar } from "@/components/sentiment";
import { ButtonLink, Card, EmptyState, Notice, linkClasses } from "@/components/ui";
import { getProviderInfo } from "@/lib/analysis/providers";
import { topicsNeedingAttention } from "@/lib/dashboard-insights";
import { formatNumber, formatPercent, plural } from "@/lib/format";
import { getDashboard } from "@/lib/server/dashboard";
import { requireOwnedUpload } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { dashboardFilters, filtersToQuery, hasActiveFilters, parseFilters } from "@/lib/server/filters";
import { getFilterOptions } from "@/lib/server/reviews";
import { getProgress } from "@/lib/server/uploads";

export default async function OverviewPage({ params, searchParams }: PageProps<"/uploads/[id]">) {
  await connection();
  const { id } = await params;
  const db = getDb();
  const { user, upload } = await requireOwnedUpload(id, `/uploads/${id}`);
  const scope = { uploadId: upload.id, ownerId: user.id };
  if (upload.status === "importing") return <ImportUnfinished />;

  const filters = dashboardFilters(parseFilters(await searchParams));
  const [dashboard, options, progress] = await Promise.all([
    getDashboard(db, upload, filters),
    getFilterOptions(db, scope),
    getProgress(db, user.id, id),
  ]);

  const base = `/uploads/${id}/reviews`;
  const linkTo = (extra: Record<string, string>) => {
    const query = new URLSearchParams(filtersToQuery(filters));
    for (const [key, value] of Object.entries(extra)) query.set(key, value);
    return `${base}?${query}`;
  };
  const { totals, sentiment, check, confidence } = dashboard;
  const providerInfo = getProviderInfo();
  const aiAvailable = providerInfo.external && !providerInfo.problem;
  const basicLeftReviews = upload.provider === "basic" && totals.notLabeled > 0;
  const filtered = hasActiveFilters(filters);
  const scale = upload.ratingScale ?? 5;
  const attention = topicsNeedingAttention(dashboard.topics);
  const readFirst = dashboard.readFirst.slice(0, 3);
  const trendOk = dashboard.trend.status === "ok";
  const selection = filtered ? "the filtered reviews" : "this upload";

  const keywordsCard = (className = "") => (
    <Card
      className={className}
      title="Words that stand out"
      description="Words and phrases from at least 2 reviews that are more common in one sentiment than the others. Select one to read those reviews."
    >
      <KeywordColumns keywords={dashboard.keywords} totals={sentiment} searchHref={(term, s) => linkTo({ q: term, sentiment: s })} />
    </Card>
  );

  return (
    <div className="grid gap-6">
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
          <section aria-labelledby="summary-title" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
            <h2 id="summary-title" className="sr-only">
              Summary of {selection}
            </h2>
            <StatTile
              className="lg:col-span-3"
              emphasis
              label="Reviews analyzed"
              value={formatNumber(totals.labeled)}
              note={`of ${formatNumber(totals.all)} imported${filtered ? " that match the filters" : ""}`}
            />
            <div className="min-w-0 rounded-card border-2 border-line bg-surface p-5 sm:order-last sm:col-span-2 sm:p-6 lg:order-none lg:col-span-6">
              <h3 className="nav-label text-[13px] text-ink-2">How customers feel</h3>
              {totals.labeled ? (
                <>
                  <p className="mt-4 text-heading-sm font-extrabold text-ink">
                    {formatPercent(sentiment.positive, totals.labeled)} positive, {formatPercent(sentiment.negative, totals.labeled)} negative
                  </p>
                  <SentimentStackedBar counts={sentiment} className="mt-5 h-5" />
                  <div className="mt-3">
                    <SentimentLegend counts={sentiment} />
                  </div>
                  {totals.mixedOpinion > 0 && (
                    <p className="mt-5 flex items-start gap-2 border-t-2 border-line pt-4 text-[15px] text-ink-2">
                      <Scale aria-hidden className="mt-0.5 size-4 shrink-0" />
                      <span>
                        {formatNumber(totals.mixedOpinion)} of {formatNumber(totals.labeled)} labeled reviews mix praise and complaints.{" "}
                        <Link href={linkTo({ opinion: "mixed" })} className={linkClasses}>
                          Read them
                        </Link>
                      </span>
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-3 text-sm text-ink-2">No reviews are labeled yet.</p>
              )}
            </div>
            {upload.hasRating && dashboard.averageRating !== null ? (
              <StatTile
                className="lg:col-span-3"
                label="Average rating"
                icon={<Star aria-hidden className="size-4 fill-star text-star" />}
                value={
                  <>
                    {dashboard.averageRating.toFixed(1)}
                    <span className="text-xl font-extrabold text-ink-3"> / {scale}</span>
                  </>
                }
                note="From the file's rating column"
              />
            ) : (
              <StatTile
                className="lg:col-span-3"
                label="Low-confidence labels"
                value={formatNumber(confidence.low)}
                note={
                  confidence.low > 0 ? (
                    <Link href={linkTo({ confidence: "low" })} className={linkClasses}>
                      Worth reading yourself
                    </Link>
                  ) : (
                    "None to double-check"
                  )
                }
              />
            )}
          </section>

          {basicLeftReviews ? (
            <Notice
              tone="warning"
              title="This upload used Basic mode, which reads English only"
              action={
                aiAvailable ? (
                  <ButtonLink href="/upload" size="sm">
                    Upload again in AI mode
                  </ButtonLink>
                ) : undefined
              }
            >
              {formatNumber(totals.labeled)} of {formatNumber(totals.all)} reviews were labeled.{" "}
              {plural(totals.notLabeled, "review")} in Tagalog, Taglish or another language weren&apos;t
              {totals.failed > 0 && `, and ${plural(totals.failed, "review")} couldn't be analyzed`}. This upload keeps Basic mode;
              ReviewLens never reanalyzes it in another mode.{" "}
              {aiAvailable
                ? "To label Tagalog and Taglish reviews, upload the same file again: new uploads use AI mode (Gemini free tier)."
                : "AI mode isn't set up on this server, so new uploads use Basic mode too."}{" "}
              <Link href={`/uploads/${id}/issues`} className={linkClasses}>
                See the data issues
              </Link>
            </Notice>
          ) : (
            (totals.notLabeled > 0 || totals.failed > 0) && (
              <Notice title={`${plural(totals.notLabeled + totals.failed, "review")} not counted in the charts`}>
                {totals.unsupportedLanguage > 0 && `${plural(totals.unsupportedLanguage, "review")} in other languages. `}
                {totals.notLabeled - totals.unsupportedLanguage > 0 &&
                  `${plural(totals.notLabeled - totals.unsupportedLanguage, "review")} mixing languages. `}
                {totals.failed > 0 && `${plural(totals.failed, "review")} couldn't be analyzed. `}
                <Link href={`/uploads/${id}/issues`} className={linkClasses}>
                  See the data issues
                </Link>
              </Notice>
            )
          )}

          <div className="grid gap-4 lg:grid-cols-12">
            <Card
              className="lg:order-2 lg:col-span-5"
              title="Needs attention"
              description={
                sentiment.negative
                  ? `${plural(sentiment.negative, "negative review")} in ${selection}. These are the places to start.`
                  : undefined
              }
            >
              {sentiment.negative === 0 ? (
                <p className="flex items-start gap-2 text-[15px] text-ink-2">
                  <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-ink" strokeWidth={2.5} />
                  No reviews in {selection} are labeled negative.
                </p>
              ) : (
                <div className="grid gap-6">
                  {attention.length > 0 && (
                    <div>
                      <h3 className="nav-label text-[13px] text-ink-2">Topics with the most negative mentions</h3>
                      <div className="mt-2.5">
                        <AttentionTopics topics={attention} href={(topic) => linkTo({ topic, sentiment: "negative" })} />
                      </div>
                    </div>
                  )}
                  {readFirst.length > 0 && (
                    <div>
                      <h3 className="nav-label text-[13px] text-ink-2">Reviews to read first</h3>
                      <p className="mt-1 text-[15px] text-ink-2">Negative reviews, most confident and newest first.</p>
                      <ul className="mt-2.5 grid gap-2">
                        {readFirst.map((review) => (
                          <ReviewSnippet key={review.id} review={review} href={linkTo({ review: String(review.id) })} />
                        ))}
                      </ul>
                    </div>
                  )}
                  <Link href={linkTo({ sentiment: "negative" })} className={`${linkClasses} inline-block py-1 text-sm`}>
                    Read all {plural(sentiment.negative, "negative review")}
                  </Link>
                </div>
              )}
            </Card>

            <Card
              className="lg:order-1 lg:col-span-7"
              title="What customers mention most"
              description={
                dashboard.topics.length
                  ? `${dashboard.topics[0].label} comes up most, in ${plural(dashboard.topics[0].total, "review")}. Bar length is how many reviews mention a topic. Select a topic to read them.`
                  : undefined
              }
            >
              {dashboard.topics.length ? (
                <TopicBars topics={dashboard.topics} reviewsHref={(topic) => linkTo({ topic })} />
              ) : (
                <p className="text-sm text-ink-2">None of the eight tracked topics (delivery, price, quality and others) came up yet.</p>
              )}
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            <Card
              className="lg:col-span-4"
              title="How sure ReviewLens is"
              description={
                totals.labeled
                  ? `${formatPercent(confidence.high, totals.labeled)} of labels are high confidence. Low-confidence labels are worth reading yourself.`
                  : undefined
              }
            >
              <ConfidenceBreakdown confidence={confidence} />
              {upload.provider === "basic" && (
                <p className="mt-5 text-[15px] text-ink-2">Basic mode never marks a label High confidence.</p>
              )}
              {confidence.low > 0 && (
                <Link href={linkTo({ confidence: "low" })} className={`${linkClasses} mt-3 inline-block py-1 text-sm`}>
                  Read the {plural(confidence.low, "low-confidence review")}
                </Link>
              )}
            </Card>
            {trendOk ? (
              <Card className="lg:col-span-8" title="Sentiment over time" description="Share of each sentiment per period, from the review dates in the file.">
                {dashboard.trend.status === "ok" && <TrendChart points={dashboard.trend.points} grain={dashboard.trend.grain} />}
              </Card>
            ) : (
              keywordsCard("lg:col-span-8")
            )}
          </div>

          {dashboard.trend.status !== "ok" && (
            <p className="flex items-start gap-2.5 text-[15px] text-ink-2">
              <CalendarX2 aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-2" strokeWidth={2.5} />
              <span>
                <span className="font-bold text-ink">No timeline for this upload.</span> {dashboard.trend.reason}
              </span>
            </p>
          )}

          {trendOk && keywordsCard()}

          {check && <LabelCheckCard check={check} ratingScale={upload.ratingScale} />}

          {check && check.disagreements.length > 0 && (
            <Card
              title={check.source === "label" ? "Where ReviewLens and your labels differ" : "Where ReviewLens and the stars differ"}
              description={`${plural(check.eligible - check.agree, "review")} got a different label. The most confident ones are first.`}
              actions={
                <ButtonLink href={linkTo({ check: "disagree" })} variant="secondary" size="sm">
                  See all {formatNumber(check.eligible - check.agree)}
                </ButtonLink>
              }
            >
              <ul className="grid gap-3">
                {check.disagreements.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    href={linkTo({ check: "disagree", review: String(review.id) })}
                    checkSource={check.source}
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
