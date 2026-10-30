import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, FileText, Inbox, TriangleAlert } from "lucide-react";
import { ImportUnfinished } from "@/components/import-unfinished";
import { JourneyPath } from "@/components/journey-path";
import { SentimentLegend, SentimentStackedBar } from "@/components/sentiment";
import { DeleteUploadButton } from "@/components/upload-actions";
import { ButtonLink, EmptyState, linkClasses } from "@/components/ui";
import { getProviderInfo } from "@/lib/analysis/providers";
import { formatNumber, formatPercent, plural } from "@/lib/format";
import { requireOwnedUpload } from "@/lib/server/auth";
import { getDashboard, type TopicBreakdown } from "@/lib/server/dashboard";
import { getDb } from "@/lib/server/db";
import { dashboardFilters, parseFilters } from "@/lib/server/filters";
import { getProgress } from "@/lib/server/uploads";

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

function NextLink({ href, icon: Icon, children }: { href: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="press inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 text-[15px] font-bold text-ink transition-colors duration-150 hover:border-line-strong hover:bg-surface-2"
      >
        <Icon aria-hidden className="size-[18px] text-ink-2" strokeWidth={2.25} />
        {children}
      </Link>
    </li>
  );
}

/** A finished upload at a glance: what stands out first, then how customers feel, then the other tools. */
export default async function OverviewPage({ params }: PageProps<"/uploads/[id]">) {
  await connection();
  const { id } = await params;
  const db = getDb();
  const { user, upload } = await requireOwnedUpload(id, `/uploads/${id}`);
  const deleteButton = (
    <div className="no-print border-t border-line pt-6">
      <DeleteUploadButton uploadId={upload.id} name={upload.name} />
    </div>
  );
  if (upload.status === "importing") {
    return (
      <div className="grid gap-10">
        <ImportUnfinished />
        {deleteButton}
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
  const takeaway = totals.labeled ? pickTakeaway(topics, sentiment.negative, totals.labeled, reviews) : null;

  return (
    <div className="grid gap-10">
      {progress && !progress.done && (
        <section aria-labelledby="progress-title" className="rounded-card bg-surface-2 p-6 sm:p-8">
          <h2 id="progress-title" className="text-subheading font-extrabold text-ink">
            Still reading your reviews
          </h2>
          <p className="mt-1 text-[15px] text-ink-2">
            {formatNumber(progress.labeled + progress.notLabeled + progress.failed)} of {plural(progress.imported, "review")} done. The numbers
            below will update as the rest finish.
          </p>
          <div className="mt-5">
            <JourneyPath current={2} />
          </div>
          <ButtonLink href={`${base}/analyze`} className="mt-6">
            Continue analysis
          </ButtonLink>
        </section>
      )}

      {totals.all === 0 ? (
        <EmptyState
          icon={<Inbox aria-hidden className="size-6" />}
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
          {/* The finding first (on top on phones, on the left on wide screens), then how customers feel overall. */}
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-12">
            {takeaway && (
              <section aria-labelledby="takeaway-title" className="rounded-card bg-accent-soft p-6 sm:p-8">
                <h2 id="takeaway-title" className="text-subheading font-extrabold text-ink">
                  Here&apos;s what stands out
                </h2>
                <p className="mt-2 text-xl font-bold leading-snug text-ink">{takeaway.text}</p>
                <ButtonLink href={takeaway.href} className="mt-6">
                  {takeaway.action}
                </ButtonLink>
              </section>
            )}
            <section aria-labelledby="feel-title" className={`min-w-0 ${takeaway ? "" : "lg:col-span-2"}`}>
              <h2 id="feel-title" className="text-subheading font-extrabold text-ink">
                How customers feel
              </h2>
              {totals.labeled ? (
                <>
                  <p className="mt-2 font-display text-[2rem] font-black leading-tight text-ink tabular sm:text-[2.5rem]">
                    {formatPercent(sentiment.positive, totals.labeled)} positive, {formatPercent(sentiment.negative, totals.labeled)} negative
                  </p>
                  <SentimentStackedBar counts={sentiment} className="mt-6 h-5" />
                  <div className="mt-4">
                    <SentimentLegend counts={sentiment} />
                  </div>
                  <p className="mt-5 text-[15px] text-ink-2">
                    Based on {formatNumber(totals.labeled)} of {plural(totals.all, "review")}.
                    {notCounted > 0 && (
                      <>
                        {" "}
                        We couldn&apos;t label {plural(notCounted, "review")}.{" "}
                        <Link href={`${base}/issues`} className={linkClasses}>
                          See why
                        </Link>
                      </>
                    )}
                  </p>
                  {upload.provider === "basic" && totals.notLabeled > 0 && aiAvailable && (
                    <p className="mt-2 text-[15px] text-ink-2">
                      Basic mode reads English only.{" "}
                      <Link href="/upload" className={linkClasses}>
                        Upload again in AI mode
                      </Link>{" "}
                      to label Tagalog and Taglish reviews too.
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-body text-ink-2">No reviews are labeled yet.</p>
              )}
            </section>
          </div>

          <nav aria-labelledby="tools-title" className="no-print">
            <h2 id="tools-title" className="text-subheading font-extrabold text-ink">
              Other tools
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2.5">
              <NextLink href={`${base}/accuracy`} icon={BadgeCheck}>
                Accuracy check
              </NextLink>
              <NextLink href={`${base}/report`} icon={FileText}>
                Report and downloads
              </NextLink>
              <NextLink href={`${base}/issues`} icon={TriangleAlert}>
                Data issues
              </NextLink>
            </ul>
          </nav>
        </>
      )}

      {deleteButton}
    </div>
  );
}
