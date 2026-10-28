import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { CalendarX2, Filter, Inbox } from "lucide-react";
import { KeywordColumns, TopicBars } from "@/components/dashboard/charts";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { FiltersBar } from "@/components/filters-bar";
import { ImportUnfinished } from "@/components/import-unfinished";
import { ButtonLink, Card, EmptyState } from "@/components/ui";
import { plural } from "@/lib/format";
import { requireOwnedUpload } from "@/lib/server/auth";
import { getDashboard } from "@/lib/server/dashboard";
import { getDb } from "@/lib/server/db";
import { dashboardFilters, filtersToQuery, hasActiveFilters, parseFilters } from "@/lib/server/filters";
import { getFilterOptions } from "@/lib/server/reviews";

export const metadata: Metadata = { title: "Topics" };

/** Everything about what customers mention: all topics, the timeline when dates exist, and standout words. */
export default async function TopicsPage({ params, searchParams }: PageProps<"/uploads/[id]/topics">) {
  await connection();
  const { id } = await params;
  const db = getDb();
  const { user, upload } = await requireOwnedUpload(id, `/uploads/${id}/topics`);
  if (upload.status === "importing") return <ImportUnfinished />;

  const scope = { uploadId: upload.id, ownerId: user.id };
  const filters = dashboardFilters(parseFilters(await searchParams));
  const [dashboard, options] = await Promise.all([getDashboard(db, upload, filters), getFilterOptions(db, scope)]);
  const linkTo = (extra: Record<string, string>) => {
    const query = new URLSearchParams(filtersToQuery(filters));
    for (const [key, value] of Object.entries(extra)) query.set(key, value);
    return `/uploads/${id}/reviews?${query}`;
  };
  const filtered = hasActiveFilters(filters);

  return (
    <div className="grid gap-6">
      <div className="max-w-2xl">
        <h2 className="text-heading-sm font-extrabold text-ink">Topics</h2>
        <p className="mt-2 text-body text-ink-2">What customers mention, how they feel about each topic, and the words that stand out.</p>
      </div>

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

      {dashboard.totals.all === 0 ? (
        filtered ? (
          <EmptyState
            icon={<Filter aria-hidden className="size-6" />}
            title="No reviews match these filters"
            action={<ButtonLink href={`/uploads/${id}/topics`} variant="secondary">Clear filters</ButtonLink>}
          >
            Try a wider date range, another product or a different rating.
          </EmptyState>
        ) : (
          <EmptyState icon={<Inbox aria-hidden className="size-6" />} title="No reviews were imported">
            Every row in the file was skipped, usually because the review text column was empty.
          </EmptyState>
        )
      ) : (
        <>
          <Card
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
              <p className="text-[15px] text-ink-2">None of the eight tracked topics (delivery, price, quality and others) came up yet.</p>
            )}
          </Card>

          {dashboard.trend.status === "ok" ? (
            <Card title="Sentiment over time" description="Share of each sentiment per period, from the review dates in the file.">
              <TrendChart points={dashboard.trend.points} grain={dashboard.trend.grain} />
            </Card>
          ) : (
            <p className="flex items-start gap-2.5 text-[15px] text-ink-2">
              <CalendarX2 aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={2.5} />
              <span>
                <span className="font-extrabold text-ink">No timeline for this upload.</span> {dashboard.trend.reason}
              </span>
            </p>
          )}

          <Card
            title="Words that stand out"
            description="Words and phrases from at least 2 reviews that are more common in one sentiment than the others. Select one to read those reviews."
          >
            <KeywordColumns keywords={dashboard.keywords} totals={dashboard.sentiment} searchHref={(term, s) => linkTo({ q: term, sentiment: s })} />
          </Card>
        </>
      )}
    </div>
  );
}
