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
      ? { label: "Failed", icon: XCircle, tone: "bg-neg-soft text-neg-ink" }
      : review.status === "not_labeled"
        ? { label: "Not labeled", icon: Ban, tone: "bg-warn-soft text-warn-ink" }
        : { label: "Waiting", icon: Clock3, tone: "bg-neu-soft text-neu-ink" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${meta.tone}`}>
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
      className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-2.5 py-0.5 text-[13px] font-semibold text-ink-2"
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${
        agrees ? "border border-line-strong text-ink-2" : "bg-warn-soft text-warn-ink"
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
        <li key={t} className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-2">
          {topicLabel(t)}
        </li>
      ))}
    </ul>
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
        className="press block rounded-card border border-line bg-surface p-4 hover:border-line-strong sm:p-5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge review={review} />
          {review.status === "labeled" && review.confidence && <ConfidenceMeter level={review.confidence} />}
          <MixedOpinionTag review={review} />
          <LabelCheckTag review={review} source={checkSource} />
        </div>
        <p className="mt-2.5 line-clamp-3 text-[15px] leading-relaxed text-ink">{review.text}</p>
        {review.status !== "labeled" && review.statusNote && <p className="mt-1.5 text-sm text-ink-2">{review.statusNote}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <TopicChips topics={review.topics} />
          <p className="text-xs text-ink-2">{meta.join(", ")}</p>
        </div>
      </Link>
    </li>
  );
}
