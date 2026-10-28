import Link from "next/link";
import { Ban, Clock3, Scale, Star, Tag, XCircle } from "lucide-react";
import { ConfidenceMeter, SENTIMENT_META, SentimentBadge } from "@/components/sentiment";
import { hasMixedOpinion } from "@/lib/analysis/confidence";
import { topicLabel } from "@/lib/analysis/topics";
import { formatDate } from "@/lib/format";
import type { ReviewRow } from "@/lib/server/reviews";
import type { LabelCheckSource } from "@/lib/types";

export function StatusBadge({ review }: { review: ReviewRow }) {
  if (review.status === "labeled" && review.sentiment) return <SentimentBadge sentiment={review.sentiment} />;
  const meta =
    review.status === "failed"
      ? { label: "Failed", icon: XCircle, tone: "border-danger-line bg-danger-soft text-danger" }
      : review.status === "not_labeled"
        ? { label: "Not labeled", icon: Ban, tone: "border-warn-line bg-warn-soft text-warn-ink" }
        : { label: "Waiting", icon: Clock3, tone: "border-line bg-neu-soft text-neu-ink" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-control border-2 px-2 py-0.5 text-[12px] font-extrabold uppercase tracking-[0.053em] ${meta.tone}`}>
      <meta.icon aria-hidden className="size-3.5" />
      {meta.label}
    </span>
  );
}

/** Marks a labeled review that contains both praise and complaints. */
export function MixedOpinionTag({ review }: { review: ReviewRow }) {
  if (review.status !== "labeled" || !hasMixedOpinion(review.confidenceReasons)) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-control border-2 border-line-strong px-2 py-0.5 text-[12px] font-extrabold uppercase tracking-[0.053em] text-ink-2"
      title="This review has both praise and complaints."
    >
      <Scale aria-hidden className="size-3.5" />
      Mixed opinion
    </span>
  );
}

/**
 * Shows what a review is checked against next to ReviewLens's label. The person's own label always
 * shows; the rating's label only shows when it disagrees, because the rating is already on the card.
 */
export function LabelCheckTag({ review, source }: { review: ReviewRow; source: LabelCheckSource | null }) {
  const reference = source === "label" ? review.referenceLabel : source === "rating" ? review.ratingLabel : null;
  if (!reference || review.status !== "labeled") return null;
  const agrees = review.sentiment === reference;
  if (source === "rating" && agrees) return null;
  const Icon = source === "label" ? Tag : Star;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-control border-2 px-2 py-0.5 text-[12px] font-extrabold uppercase tracking-[0.053em] ${
        agrees ? "border-line-strong text-ink-2" : "border-warn-line bg-warn-soft text-warn-ink"
      }`}
    >
      <Icon aria-hidden className="size-3.5" />
      {source === "label" ? "Your label" : "Stars suggest"}: {SENTIMENT_META[reference].label}
      <span className="sr-only">{agrees ? ", the same as ReviewLens" : ", different from ReviewLens"}</span>
    </span>
  );
}

export function TopicChips({ topics }: { topics: string[] }) {
  if (!topics.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Topics">
      {topics.map((t) => (
        <li key={t} className="rounded-control border-2 border-line px-2 py-0.5 text-[13px] font-bold text-ink-2">
          {topicLabel(t)}
        </li>
      ))}
    </ul>
  );
}

/** A short, two-line version of a review for dashboard lists. Links to the detail sheet on the Reviews page. */
export function ReviewSnippet({ review, href }: { review: ReviewRow; href: string }) {
  const meta = [review.reviewDate ? formatDate(review.reviewDate) : null, review.rating !== null ? `Rating ${review.rating}` : null, review.product]
    .filter(Boolean)
    .join(", ");
  return (
    <li>
      <Link href={href} scroll={false} className="sticker block rounded-card bg-surface px-4 py-3">
        <p className="line-clamp-2 text-sm leading-relaxed text-ink [overflow-wrap:anywhere]">{review.text}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {review.confidence && <ConfidenceMeter level={review.confidence} />}
          {meta && <span className="text-[13px] text-ink-2">{meta}</span>}
        </div>
      </Link>
    </li>
  );
}

/** One review in a list. Links to the detail sheet on the Reviews page. */
export function ReviewCard({
  review,
  href,
  checkSource = null,
}: {
  review: ReviewRow;
  href: string;
  checkSource?: LabelCheckSource | null;
}) {
  const meta = [
    review.reviewDate ? formatDate(review.reviewDate) : null,
    review.rating !== null ? `Rating ${review.rating}` : null,
    review.product,
    `Row ${review.rowNumber}`,
  ].filter(Boolean);
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        className="sticker block rounded-card bg-surface p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge review={review} />
          {review.status === "labeled" && review.confidence && <ConfidenceMeter level={review.confidence} />}
          <MixedOpinionTag review={review} />
          <LabelCheckTag review={review} source={checkSource} />
        </div>
        <p className="mt-3 line-clamp-3 text-body leading-relaxed text-ink [overflow-wrap:anywhere]">{review.text}</p>
        {review.status !== "labeled" && review.statusNote && <p className="mt-1.5 text-sm text-ink-2">{review.statusNote}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <TopicChips topics={review.topics} />
          <p className="text-[13px] text-ink-2">{meta.join(", ")}</p>
        </div>
      </Link>
    </li>
  );
}
