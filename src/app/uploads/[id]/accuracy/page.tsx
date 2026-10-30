import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ConfidenceExplainer } from "@/components/confidence-explainer";
import { ConfidenceBreakdown } from "@/components/dashboard/charts";
import { LabelCheckCard } from "@/components/dashboard/label-check";
import { ImportUnfinished } from "@/components/import-unfinished";
import { ReviewCard, reviewListClasses } from "@/components/review-card";
import { ButtonLink, Card, linkClasses } from "@/components/ui";
import { formatNumber, formatPercent, plural } from "@/lib/format";
import { requireOwnedUpload } from "@/lib/server/auth";
import { getDashboard } from "@/lib/server/dashboard";
import { getDb } from "@/lib/server/db";
import { dashboardFilters, parseFilters } from "@/lib/server/filters";

export const metadata: Metadata = { title: "Accuracy check" };

/** How ReviewLens's labels compare with the person's own labels or the star ratings, and how sure each label is. */
export default async function AccuracyPage({ params }: PageProps<"/uploads/[id]/accuracy">) {
  await connection();
  const { id } = await params;
  const db = getDb();
  const { upload } = await requireOwnedUpload(id, `/uploads/${id}/accuracy`);
  if (upload.status === "importing") return <ImportUnfinished />;

  const { check, confidence, totals } = await getDashboard(db, upload, dashboardFilters(parseFilters({})));
  const reviews = (query: Record<string, string>) => `/uploads/${id}/reviews?${new URLSearchParams(query)}`;

  return (
    <div className="grid gap-10">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-extrabold text-ink">Accuracy check</h2>
        <p className="mt-1 text-body text-ink-2">
          {check?.source === "label"
            ? "How often ReviewLens agrees with the labels in your file, and how sure it is about each label."
            : check?.source === "rating"
              ? "How ReviewLens's labels line up with the star ratings, and how sure it is about each label."
              : "How sure ReviewLens is about each label, and how to compare it with your own labels."}
        </p>
      </div>

      {check ? (
        <>
          <LabelCheckCard check={check} ratingScale={upload.ratingScale} />
          {check.disagreements.length > 0 && (
            <Card
              className="border-t border-line pt-10"
              title={check.source === "label" ? "Where ReviewLens and your labels differ" : "Where ReviewLens and the stars differ"}
              description={`${plural(check.eligible - check.agree, "review")} got a different label. The most confident ones are first.`}
              actions={
                <ButtonLink href={reviews({ check: "disagree" })} variant="secondary" size="sm">
                  See all {formatNumber(check.eligible - check.agree)}
                </ButtonLink>
              }
            >
              <ul className={reviewListClasses}>
                {check.disagreements.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    href={reviews({ check: "disagree", review: String(review.id) })}
                    checkSource={check.source}
                  />
                ))}
              </ul>
            </Card>
          )}
        </>
      ) : (
        <Card title="Compare with your own labels" className="rounded-card bg-accent-soft p-6 sm:p-8">
          <p className="max-w-prose text-[15px] text-ink-2">
            Add a column to your CSV with your own label for each review: positive, neutral or negative. When you upload it, match that
            column to <span className="font-extrabold text-ink">Your label</span>, and this page shows how often ReviewLens agrees with you.
            A rating column works too, as a rough guide.
          </p>
          <div className="mt-5">
            <ButtonLink href="/upload" variant="secondary" size="sm">
              Upload a labeled file
            </ButtonLink>
          </div>
        </Card>
      )}

      <Card
        className="border-t border-line pt-10"
        title="How sure ReviewLens is"
        description={
          totals.labeled
            ? `${formatPercent(confidence.high, totals.labeled)} of labels are high confidence. Low-confidence labels are worth reading yourself.`
            : undefined
        }
      >
        <ConfidenceBreakdown confidence={confidence} />
        {upload.provider === "basic" && <p className="mt-5 text-[15px] text-ink-2">Basic mode never marks a label High confidence.</p>}
        {confidence.low > 0 && (
          <Link href={reviews({ confidence: "low" })} className={`${linkClasses} mt-3 inline-block py-1 text-[15px]`}>
            Read the {plural(confidence.low, "low-confidence review")}
          </Link>
        )}
      </Card>

      <ConfidenceExplainer basicMode={upload.provider === "basic"} />
    </div>
  );
}
