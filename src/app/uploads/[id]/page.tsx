import Link from "next/link";
import { connection } from "next/server";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, ChevronRight, FileText, Inbox, MessageSquareText, Tags } from "lucide-react";
import { ImportUnfinished } from "@/components/import-unfinished";
import { JourneyPath } from "@/components/journey-path";
import { ReviewSnippet } from "@/components/review-card";
import { SentimentLegend, SentimentStackedBar } from "@/components/sentiment";
import { ButtonLink, Card, EmptyState, linkClasses } from "@/components/ui";
import { getProviderInfo } from "@/lib/analysis/providers";
import { formatNumber, formatPercent, plural } from "@/lib/format";
import { requireOwnedUpload } from "@/lib/server/auth";
import { getDashboard } from "@/lib/server/dashboard";
import { getDb } from "@/lib/server/db";
import { dashboardFilters, parseFilters } from "@/lib/server/filters";
import { getProgress } from "@/lib/server/uploads";

function ExploreTile({ href, icon: Icon, title, text }: { href: string; icon: LucideIcon; title: string; text: string }) {
  return (
    <li>
      <Link href={href} className="sticker group flex h-full items-start gap-4 rounded-card bg-surface p-5">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-control bg-accent-soft text-accent-ink">
          <Icon className="size-6" strokeWidth={2.5} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold text-ink group-hover:text-accent-ink">{title}</span>
          <span className="mt-0.5 block text-[15px] text-ink-2">{text}</span>
        </span>
        <ChevronRight aria-hidden className="mt-2.5 size-5 shrink-0 text-line-strong group-hover:text-accent-ink" strokeWidth={3} />
      </Link>
    </li>
  );
}

/** A finished upload at a glance: how many reviews, how customers feel, top topics, what needs attention, and where to go next. */
export default async function OverviewPage({ params }: PageProps<"/uploads/[id]">) {
  await connection();
  const { id } = await params;
  const db = getDb();
  const { user, upload } = await requireOwnedUpload(id, `/uploads/${id}`);
  if (upload.status === "importing") return <ImportUnfinished />;

  const [dashboard, progress] = await Promise.all([
    getDashboard(db, upload, dashboardFilters(parseFilters({}))),
    getProgress(db, user.id, id),
  ]);
  const { totals, sentiment, check } = dashboard;
  const base = `/uploads/${id}`;
  const reviews = (query: Record<string, string>) => `${base}/reviews?${new URLSearchParams(query)}`;
  const provider = getProviderInfo();
  const aiAvailable = provider.external && !provider.problem;
  const notCounted = totals.notLabeled + totals.failed;
  const topTopics = dashboard.topics.slice(0, 3);
  const readFirst = dashboard.readFirst.slice(0, 3);

  return (
    <div className="grid gap-8">
      {progress && !progress.done && (
        <section aria-labelledby="progress-title" className="rounded-card border-2 border-line p-6 sm:p-8">
          <h2 id="progress-title" className="text-subheading font-extrabold text-ink">
            Analysis isn&apos;t finished
          </h2>
          <div className="mt-6">
            <JourneyPath current={2} />
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-4 border-t-2 border-line pt-6">
            <ButtonLink href={`${base}/analyze`}>Continue analysis</ButtonLink>
            <p className="max-w-md text-[15px] text-ink-2">
              {formatNumber(progress.labeled + progress.notLabeled + progress.failed)} of {plural(progress.imported, "review")} processed. The
              numbers below change as the rest are analyzed.
            </p>
          </div>
        </section>
      )}

      {totals.all === 0 ? (
        <EmptyState
          icon={<Inbox aria-hidden className="size-6" />}
          title="No reviews were imported"
          action={<ButtonLink href={`${base}/issues`} variant="secondary">See why</ButtonLink>}
        >
          Every row in the file was skipped, usually because the review text column was empty.
        </EmptyState>
      ) : (
        <>
          <section
            aria-labelledby="summary-title"
            className="grid gap-8 rounded-card border-2 border-line p-6 sm:p-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-center lg:gap-12"
          >
            <div>
              <h2 id="summary-title" className="nav-label text-[13px] text-ink-2">
                Reviews analyzed
              </h2>
              <p className="mt-3 font-display text-heading font-black leading-none text-brand-display tabular sm:text-display">
                {formatNumber(totals.labeled)}
              </p>
              <p className="mt-3 text-[15px] text-ink-2">of {plural(totals.all, "review")} imported</p>
              {notCounted > 0 && (
                <p className="mt-2 text-[15px] text-ink-2">
                  {plural(notCounted, "review")} {notCounted === 1 ? "wasn't" : "weren't"} labeled.{" "}
                  <Link href={`${base}/issues`} className={linkClasses}>
                    See why
                  </Link>
                </p>
              )}
              {upload.provider === "basic" && totals.notLabeled > 0 && aiAvailable && (
                <p className="mt-2 text-[15px] text-ink-2">
                  Basic mode reads English only.{" "}
                  <Link href="/upload" className={linkClasses}>
                    Upload again in AI mode
                  </Link>{" "}
                  to label Tagalog and Taglish too.
                </p>
              )}
            </div>
            <div>
              <h3 className="nav-label text-[13px] text-ink-2">How customers feel</h3>
              {totals.labeled ? (
                <>
                  <p className="mt-3 text-heading-sm font-extrabold text-ink">
                    {formatPercent(sentiment.positive, totals.labeled)} positive, {formatPercent(sentiment.negative, totals.labeled)} negative
                  </p>
                  <SentimentStackedBar counts={sentiment} className="mt-5 h-5" />
                  <div className="mt-4">
                    <SentimentLegend counts={sentiment} />
                  </div>
                </>
              ) : (
                <p className="mt-3 text-[15px] text-ink-2">No reviews are labeled yet.</p>
              )}
            </div>
          </section>

          <div className={`grid gap-6 ${readFirst.length ? "lg:grid-cols-2" : ""}`}>
            <Card
              title="Most mentioned topics"
              actions={
                dashboard.topics.length > 3 && (
                  <Link href={`${base}/topics`} className={`${linkClasses} py-1 text-[15px]`}>
                    See all {dashboard.topics.length}
                  </Link>
                )
              }
            >
              {topTopics.length ? (
                <ol className="grid gap-3">
                  {topTopics.map((topic, i) => (
                    <li key={topic.id}>
                      <Link href={reviews({ topic: topic.id })} className="sticker group flex items-center gap-4 rounded-card bg-surface px-4 py-3">
                        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-control bg-brand-soft font-display text-lg font-black text-brand-ink">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-extrabold text-ink group-hover:text-accent-ink">{topic.label}</span>
                          <span className="block text-[15px] text-ink-2 tabular">
                            {plural(topic.total, "mention")}, {formatPercent(topic.negative, topic.total)} negative
                          </span>
                        </span>
                        <ChevronRight aria-hidden className="size-5 shrink-0 text-line-strong group-hover:text-accent-ink" strokeWidth={3} />
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[15px] text-ink-2">None of the eight tracked topics (delivery, price, quality and others) came up yet.</p>
              )}
            </Card>

            {readFirst.length > 0 && (
              <Card
                title="Needs attention"
                description="Negative reviews, most confident and newest first."
                actions={
                  <Link href={reviews({ sentiment: "negative" })} className={`${linkClasses} py-1 text-[15px]`}>
                    All {formatNumber(sentiment.negative)}
                  </Link>
                }
              >
                <ul className="grid gap-3">
                  {readFirst.map((review) => (
                    <ReviewSnippet key={review.id} review={review} href={reviews({ sentiment: "negative", review: String(review.id) })} />
                  ))}
                </ul>
              </Card>
            )}
          </div>

          <section aria-labelledby="explore-title" className="grid gap-3">
            <h2 id="explore-title" className="nav-label text-[13px] text-ink-2">
              Explore this upload
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ExploreTile href={`${base}/reviews`} icon={MessageSquareText} title="All reviews" text={`Search and filter ${plural(totals.all, "review")}.`} />
              <ExploreTile href={`${base}/topics`} icon={Tags} title="Topics" text="Every topic, trends over time and the words that stand out." />
              <ExploreTile
                href={`${base}/accuracy`}
                icon={BadgeCheck}
                title="Accuracy check"
                text={
                  check && check.eligible
                    ? `${formatNumber(check.agree)} of ${formatNumber(check.eligible)} match ${check.source === "label" ? "your labels" : "the star ratings"}.`
                    : "How sure ReviewLens is about each label."
                }
              />
              <ExploreTile href={`${base}/report`} icon={FileText} title="Report & exports" text="A printable summary and CSV downloads." />
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
