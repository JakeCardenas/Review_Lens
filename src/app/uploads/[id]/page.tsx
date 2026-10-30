import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, FileText, TriangleAlert } from "lucide-react";
import { ImportUnfinished } from "@/components/import-unfinished";
import { JourneyPath } from "@/components/journey-path";
import { SentimentIcon, SentimentLegend, SentimentStackedBar } from "@/components/sentiment";
import { DeleteUploadButton } from "@/components/upload-actions";
import { ButtonLink, EmptyState, linkClasses } from "@/components/ui";
import { Sticker } from "@/components/illustrations";
import { getProviderInfo } from "@/lib/analysis/providers";
import { formatNumber, formatPercent, plural } from "@/lib/format";
import { requireOwnedUpload } from "@/lib/server/auth";
import { getDashboard, type TopicBreakdown } from "@/lib/server/dashboard";
import { getDb } from "@/lib/server/db";
import { dashboardFilters, parseFilters } from "@/lib/server/filters";
import { getProgress } from "@/lib/server/uploads";
import { SENTIMENTS, type Sentiment } from "@/lib/types";

type Takeaway = { text: string; action: string; href: string };

const readAction = (count: number) => (count === 1 ? "Read this review" : `Read these ${formatNumber(count)} reviews`);

/**
 * One thing worth reading next, worked out from the upload's own counts: the topic that shows up in
 * the most negative reviews, or else the most mentioned topic, or else the negative reviews themselves.
 */
function pickTakeaway(topics: TopicBreakdown[], negative: number, labeled: number, reviewsHref: (q: Record<string, string>) => string): Takeaway | null {
  const complaint = topics.filter((t) => t.negative > 0).sort((a, b) => b.negative - a.negative)[0];
  if (complaint) {
    const share =
      complaint.negative === negative
        ? negative === 1
          ? "It's in the one negative review."
          : `All ${formatNumber(negative)} negative reviews mention it.`
        : `${formatNumber(complaint.negative)} of the ${formatNumber(negative)} negative reviews mention it.`;
    return {
      text: `${complaint.label} comes up most in complaints. ${share}`,
      action: readAction(complaint.negative),
      href: reviewsHref({ topic: complaint.id, sentiment: "negative" }),
    };
  }
  const top = topics[0];
  if (top) {
    return {
      text: `${top.label} comes up most. ${formatNumber(top.total)} of the ${formatNumber(labeled)} analyzed reviews mention it.`,
      action: readAction(top.total),
      href: reviewsHref({ topic: top.id }),
    };
  }
  if (negative > 0) {
    return {
      text: negative === 1 ? "1 review is negative." : `${formatNumber(negative)} reviews are negative.`,
      action: readAction(negative),
      href: reviewsHref({ sentiment: "negative" }),
    };
  }
  return null;
}

/** How a topic's reviews lean: "Mostly …" when one sentiment is more than half of them, otherwise "Mixed". */
function topicLean(topic: TopicBreakdown): { sentiment: Sentiment; text: string } {
  const lead = SENTIMENTS.find((s) => topic[s] * 2 > topic.total);
  return lead ? { sentiment: lead, text: `Mostly ${lead}` } : { sentiment: "neutral", text: "Mixed" };
}

function ToolLink({ href, icon: Icon, children }: { href: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="press inline-flex min-h-11 items-center gap-2 rounded-control px-3 text-[15px] font-bold text-ink-2 hover:bg-surface-2 hover:text-ink"
      >
        <Icon aria-hidden className="size-[18px]" strokeWidth={2.25} />
        {children}
      </Link>
    </li>
  );
}

/**
 * A finished upload at a glance: how customers feel and how many reviews that covers, the one thing
 * that stands out, and the three topics people mention most. Reviews and Topics hold the detail; the
 * other tools sit quietly at the bottom.
 */
export default async function OverviewPage({ params }: PageProps<"/uploads/[id]">) {
  await connection();
  const { id } = await params;
  const db = getDb();
  const { user, upload } = await requireOwnedUpload(id, `/uploads/${id}`);
  if (upload.status === "importing") {
    return (
      <div className="grid gap-10">
        <ImportUnfinished />
        <div className="no-print border-t-2 border-line pt-5">
          <DeleteUploadButton uploadId={upload.id} name={upload.name} />
        </div>
      </div>
    );
  }

  const [dashboard, progress] = await Promise.all([
    getDashboard(db, upload, dashboardFilters(parseFilters({}))),
    getProgress(db, user.id, id),
  ]);
  const { totals, sentiment, topics } = dashboard;
  const base = `/uploads/${id}`;
  const reviews = (query: Record<string, string>) => `${base}/reviews?${new URLSearchParams(query)}`;
  const provider = getProviderInfo();
  const aiAvailable = provider.external && !provider.problem;
  const notCounted = totals.notLabeled + totals.failed;
  const analyzing = Boolean(progress && !progress.done);
  const takeaway = totals.labeled ? pickTakeaway(topics, sentiment.negative, totals.labeled, reviews) : null;
  // The headline is the biggest share. On a tie, positive comes first, then negative.
  const lead = (["positive", "negative", "neutral"] as const).reduce((a, b) => (sentiment[b] > sentiment[a] ? b : a));

  return (
    <div className="grid gap-10">
      {progress && analyzing && (
        <section aria-labelledby="progress-title" className="rounded-card border-2 border-line p-5 sm:p-7.5">
          <h2 id="progress-title" className="text-subheading font-extrabold text-ink">
            Still reading your reviews
          </h2>
          <p className="mt-1 text-[15px] text-ink-2">
            {formatNumber(progress.labeled + progress.notLabeled + progress.failed)} of {plural(progress.imported, "review")} done. The numbers
            below update as the rest finish.
          </p>
          <div className="mt-5">
            <JourneyPath current={2} />
          </div>
          <ButtonLink href={`${base}/analyze`} className="mt-7.5">
            Continue analysis
          </ButtonLink>
        </section>
      )}

      {totals.all === 0 ? (
        <EmptyState
          art="csv"
          title="No reviews were imported"
          action={
            <>
              <ButtonLink href={`${base}/issues`} variant="secondary">
                See what happened
              </ButtonLink>
              <ButtonLink href="/upload" variant="secondary">
                Upload another file
              </ButtonLink>
            </>
          }
        >
          Every row in the file was skipped, usually because the review text column was empty.
        </EmptyState>
      ) : (
        <>
          {/* Main column: the mood and the one thing worth reading. Side column (below on smaller screens): the top topics. */}
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-12.5">
            <div className="grid min-w-0 content-start gap-10">
              <section aria-labelledby="feel-title" className="min-w-0">
                <h2 id="feel-title" className="flex min-h-11 items-center text-subheading font-extrabold text-ink">
                  How customers feel
                </h2>
                {totals.labeled ? (
                  <>
                    <div className="mt-2.5 flex items-center gap-4">
                      <SentimentIcon sentiment={lead} className="size-12 sm:size-14" />
                      <p className="font-display leading-none text-ink">
                        <span className="text-[2.75rem] font-black tabular sm:text-[3.5rem]">{formatPercent(sentiment[lead], totals.labeled)}</span>{" "}
                        <span className="text-2xl font-extrabold sm:text-[1.75rem]">{lead}</span>
                      </p>
                    </div>
                    <p className="mt-2.5 text-body text-ink-2">
                      Based on <span className="font-extrabold text-ink">{plural(totals.labeled, "review")}</span>.
                      {notCounted > 0 && (
                        <>
                          {" "}
                          We couldn&apos;t label {formatNumber(notCounted)} more.{" "}
                          <Link href={`${base}/issues`} className={linkClasses}>
                            See why
                          </Link>
                        </>
                      )}
                    </p>
                    <SentimentStackedBar counts={sentiment} className="mt-5 h-5" />
                    <div className="mt-4">
                      <SentimentLegend counts={sentiment} />
                    </div>
                    {upload.provider === "basic" && totals.notLabeled > 0 && aiAvailable && (
                      <p className="mt-5 text-[15px] text-ink-2">
                        Basic mode reads English only.{" "}
                        <Link href="/upload" className={linkClasses}>
                          Upload again in AI mode
                        </Link>{" "}
                        to label Tagalog and Taglish reviews too.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-2.5 text-body text-ink-2">No reviews are labeled yet.</p>
                )}
              </section>

              {takeaway && (
                <section
                  aria-labelledby="takeaway-title"
                  className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2.5 rounded-card bg-accent-soft p-5 sm:gap-x-5 sm:p-7.5"
                >
                  {/* Phones: the sticker sits beside the heading. Wider: beside the heading and the sentence. */}
                  <Sticker name="explore" size={64} className="size-12 sm:row-span-2 sm:size-16 sm:self-start" />
                  <h2 id="takeaway-title" className="text-subheading font-extrabold text-ink">
                    What stands out
                  </h2>
                  <p className="col-span-2 text-xl font-bold leading-snug text-ink sm:col-span-1 sm:col-start-2">{takeaway.text}</p>
                  <div className="col-span-2 mt-2.5 sm:col-span-1 sm:col-start-2">
                    <ButtonLink href={takeaway.href} variant={analyzing ? "secondary" : "primary"}>
                      {takeaway.action}
                    </ButtonLink>
                  </div>
                </section>
              )}
            </div>

            <section aria-labelledby="topics-title" className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-x-5">
                <h2 id="topics-title" className="text-subheading font-extrabold text-ink">
                  Most mentioned
                </h2>
                <Link href={`${base}/topics`} className={`${linkClasses} inline-flex min-h-11 items-center text-[15px]`}>
                  See all topics
                </Link>
              </div>
              {topics.length ? (
                <ol className="mt-2.5 grid divide-y-2 divide-line overflow-hidden rounded-card border-2 border-line">
                  {topics.slice(0, 3).map((topic, i) => {
                    const lean = topicLean(topic);
                    return (
                      <li key={topic.id}>
                        <Link
                          href={reviews({ topic: topic.id })}
                          className="flex items-center gap-4 px-4 py-4 transition-colors duration-150 hover:bg-surface-2 focus-visible:-outline-offset-4 sm:px-5"
                        >
                          <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-[15px] font-black text-ink">
                            {i + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-extrabold text-ink">{topic.label}</span>
                            <span className="mt-0.5 flex items-center gap-1.5 text-[15px] text-ink-2">
                              <SentimentIcon sentiment={lean.sentiment} className="size-4" />
                              {lean.text}
                            </span>
                          </span>
                          <span className="shrink-0 text-right text-[13px] leading-tight text-ink-2 tabular">
                            <span className="block text-body font-extrabold text-ink">{formatNumber(topic.total)}</span>
                            {topic.total === 1 ? "review" : "reviews"}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="mt-2.5 text-[15px] text-ink-2">
                  None of the topics ReviewLens looks for (delivery, price, quality and others) came up yet.
                </p>
              )}
            </section>
          </div>
        </>
      )}

      <div className="no-print flex flex-wrap items-center justify-between gap-x-10 gap-y-2.5 border-t-2 border-line pt-5">
        {totals.all > 0 && (
          <nav aria-label="More for this upload">
            <ul className="-ml-3 flex flex-wrap gap-x-1 gap-y-1">
              <ToolLink href={`${base}/accuracy`} icon={BadgeCheck}>
                Accuracy check
              </ToolLink>
              <ToolLink href={`${base}/report`} icon={FileText}>
                Export report
              </ToolLink>
              <ToolLink href={`${base}/issues`} icon={TriangleAlert}>
                Data issues
              </ToolLink>
            </ul>
          </nav>
        )}
        <DeleteUploadButton uploadId={upload.id} name={upload.name} className="-ml-3 px-3" />
      </div>
    </div>
  );
}
