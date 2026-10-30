import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { ConfidenceExplainer } from "@/components/confidence-explainer";
import { ActionArt } from "@/components/illustrations";
import { FiltersBar } from "@/components/filters-bar";
import { Pagination } from "@/components/pagination";
import { LabelCheckTag, MixedOpinionTag, ReviewCard, StatusBadge, TopicChips, reviewListClasses } from "@/components/review-card";
import { ExportLinks } from "@/components/upload-actions";
import { ReviewDialog } from "@/components/review-dialog";
import { ConfidenceMeter, SENTIMENT_META } from "@/components/sentiment";
import { ButtonLink, EmptyState } from "@/components/ui";
import { REASON_TEXT } from "@/lib/analysis/confidence";
import { describeLanguage } from "@/lib/analysis/language";
import { TOPICS } from "@/lib/analysis/topics";
import { formatDate, plural } from "@/lib/format";
import { labelCheckSource } from "@/lib/server/dashboard";
import { requireOwnedUpload } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { filtersToQuery, hasActiveFilters, parseFilters } from "@/lib/server/filters";
import { getFilterOptions, getReview, searchReviews, type ReviewRow } from "@/lib/server/reviews";
import type { LabelCheckSource } from "@/lib/types";

export const metadata: Metadata = { title: "Reviews" };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Wraps words that matched a topic in <mark>, using React nodes rather than HTML strings. */
function highlightTopics(text: string, topics: string[]): ReactNode {
  const patterns = TOPICS.filter((t) => topics.includes(t.id)).map((t) => `(?:${t.pattern.source})`);
  if (!patterns.length) return text;
  const regex = new RegExp(patterns.join("|"), "gi");
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(regex)) {
    const start = match.index ?? 0;
    if (!match[0]) continue;
    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      <mark key={start} className="rounded-md bg-brand-soft px-0.5 font-semibold text-ink">
        {match[0]}
      </mark>,
    );
    last = start + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function modelNote(review: ReviewRow): string | null {
  const output = review.modelOutput ?? {};
  if (typeof output.compound === "number") {
    return `Word-list score: ${output.compound > 0 ? "+" : ""}${output.compound} on a scale from −1 (most negative) to +1 (most positive). It measures how strongly the wording leans, not the chance the label is right.`;
  }
  if (typeof output.certainty === "string") return `The AI model described its own reading as “${output.certainty}”.`;
  return null;
}

/** "Neutral, different from ReviewLens", or just the label when ReviewLens hasn't labeled the review. */
function referenceFact(review: ReviewRow, source: LabelCheckSource): [string, string] | null {
  const reference = source === "label" ? review.referenceLabel : review.ratingLabel;
  if (!reference) return null;
  const label = SENTIMENT_META[reference].label;
  const compared =
    review.status !== "labeled" ? label : `${label}, ${review.sentiment === reference ? "the same as" : "different from"} ReviewLens`;
  return [source === "label" ? "Your label" : "Stars suggest", compared];
}

function ReviewDetail({ review, checkSource }: { review: ReviewRow; checkSource: LabelCheckSource | null }) {
  const reference = checkSource ? referenceFact(review, checkSource) : null;
  const facts: [string, string][] = [
    ["Row in file", String(review.rowNumber)],
    ["Date", formatDate(review.reviewDate)],
    ["Rating", review.rating === null ? "None" : String(review.rating)],
    ...(reference ? [reference] : []),
    ["Product", review.product ?? "None"],
    ["Language", describeLanguage(review.languageStatus, review.language)],
  ];
  const note = modelNote(review);
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge review={review} />
        {review.status === "labeled" && review.confidence && <ConfidenceMeter level={review.confidence} />}
        <MixedOpinionTag review={review} />
        <LabelCheckTag review={review} source={checkSource} />
      </div>
      <blockquote className="whitespace-pre-wrap rounded-card bg-surface-2 p-4 text-[16px] leading-relaxed [overflow-wrap:anywhere] sm:p-5">
        {highlightTopics(review.text, review.topics)}
      </blockquote>
      {review.statusNote && <p className="text-sm text-ink-2">{review.statusNote}</p>}
      {review.status === "labeled" && review.confidenceReasons.length > 0 && (
        <section>
          <h3 className="font-extrabold text-ink">Why this confidence</h3>
          <ul className="mt-1.5 grid list-disc gap-1 pl-5 text-sm text-ink-2">
            {review.confidenceReasons.map((code) => (
              <li key={code}>{REASON_TEXT[code] ?? code}</li>
            ))}
          </ul>
          {note && <p className="mt-2 text-sm text-ink-2">{note}</p>}
        </section>
      )}
      {review.topics.length > 0 && (
        <section>
          <h3 className="mb-2 font-extrabold text-ink">Topics</h3>
          <TopicChips topics={review.topics} />
        </section>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 border-t border-line pt-4 text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-ink-2">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default async function ReviewsPage({ params, searchParams }: PageProps<"/uploads/[id]/reviews">) {
  await connection();
  const { id } = await params;
  const sp = await searchParams;
  const db = getDb();
  const { user, upload } = await requireOwnedUpload(id, `/uploads/${id}/reviews`);
  const scope = { uploadId: upload.id, ownerId: user.id };

  const filters = parseFilters(sp);
  const page = Number(first(sp.page)) || 1;
  const reviewId = Number(first(sp.review));
  const [result, options, selected] = await Promise.all([
    searchReviews(db, scope, filters, page),
    getFilterOptions(db, scope),
    Number.isInteger(reviewId) && reviewId > 0 ? getReview(db, scope, reviewId) : Promise.resolve(null),
  ]);

  const checkSource = labelCheckSource(upload);
  const base = `/uploads/${id}/reviews`;
  const query = filtersToQuery(filters);
  const listHref = (p: number) => {
    const q = new URLSearchParams(query);
    if (p > 1) q.set("page", String(p));
    const qs = q.toString();
    return qs ? `${base}?${qs}` : base;
  };
  const reviewHref = (rid: number) => {
    const q = new URLSearchParams(query);
    if (result.page > 1) q.set("page", String(result.page));
    q.set("review", String(rid));
    return `${base}?${q}`;
  };

  return (
    <div className="grid gap-5">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-extrabold text-ink">Reviews</h2>
        <p className="mt-1 text-body text-ink-2">Read what customers wrote. Select a review to see why it got its label.</p>
      </div>
      <Suspense fallback={null}>
        <FiltersBar
          mode="reviews"
          options={{
            products: options.products,
            minDate: options.minDate,
            maxDate: options.maxDate,
            hasDate: upload.hasDate,
            hasRating: upload.hasRating,
            hasProduct: upload.hasProduct,
            ratingScale: upload.ratingScale,
            checkSource,
          }}
        />
      </Suspense>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-ink-2" role="status">
          <span className="font-bold text-ink">{plural(result.total, "review")}</span>
          {hasActiveFilters(filters) ? " match the filters" : " in this upload"}
          {result.pageCount > 1 ? `, showing ${(result.page - 1) * result.pageSize + 1} to ${Math.min(result.page * result.pageSize, result.total)}` : ""}
        </p>
        <Suspense fallback={null}>
          <ExportLinks uploadId={id} />
        </Suspense>
      </div>

      {result.rows.length ? (
        <ul className={reviewListClasses}>
          {result.rows.map((review) => (
            <ReviewCard key={review.id} review={review} href={reviewHref(review.id)} checkSource={checkSource} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<ActionArt name="explore" size={40} />}
          title="No reviews match"
          action={hasActiveFilters(filters) ? <ButtonLink href={base} variant="secondary">Clear search and filters</ButtonLink> : undefined}
        >
          {filters.q ? `No review contains “${filters.q}” with these filters. Try a shorter word or fewer filters.` : "Try removing a filter or two."}
        </EmptyState>
      )}

      <Pagination page={result.page} pageCount={result.pageCount} makeHref={listHref} />
      <ConfidenceExplainer basicMode={upload.provider === "basic"} />

      {selected && (
        <ReviewDialog key={selected.id} title={`Review from row ${selected.rowNumber}`} closeHref={listHref(result.page)}>
          <ReviewDetail review={selected} checkSource={checkSource} />
        </ReviewDialog>
      )}
    </div>
  );
}
