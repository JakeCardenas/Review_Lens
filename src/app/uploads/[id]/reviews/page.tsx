import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { SearchX } from "lucide-react";
import { ConfidenceExplainer } from "@/components/confidence-explainer";
import { FiltersBar } from "@/components/filters-bar";
import { Pagination } from "@/components/pagination";
import { ReviewCard, StatusBadge, TopicChips } from "@/components/review-card";
import { ReviewDialog } from "@/components/review-dialog";
import { ConfidenceMeter } from "@/components/sentiment";
import { ButtonLink, EmptyState } from "@/components/ui";
import { REASON_TEXT } from "@/lib/analysis/confidence";
import { describeLanguage } from "@/lib/analysis/language";
import { TOPICS } from "@/lib/analysis/topics";
import { formatDate, plural } from "@/lib/format";
import { getDb } from "@/lib/server/db";
import { filtersToQuery, hasActiveFilters, parseFilters } from "@/lib/server/filters";
import { getFilterOptions, getReview, searchReviews, type ReviewRow } from "@/lib/server/reviews";
import { getUpload } from "@/lib/server/uploads";

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
      <mark key={start} className="rounded bg-brand-soft px-0.5 text-ink">
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

function ReviewDetail({ review }: { review: ReviewRow }) {
  const facts: [string, string][] = [
    ["Row in file", String(review.rowNumber)],
    ["Date", formatDate(review.reviewDate)],
    ["Rating", review.rating === null ? "None" : String(review.rating)],
    ["Product", review.product ?? "None"],
    ["Language", describeLanguage(review.languageStatus, review.language)],
  ];
  const note = modelNote(review);
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge review={review} />
        {review.status === "labeled" && review.confidence && <ConfidenceMeter level={review.confidence} />}
      </div>
      <blockquote className="whitespace-pre-wrap rounded-card bg-surface-2 p-4 text-[16px] leading-relaxed">
        {highlightTopics(review.text, review.topics)}
      </blockquote>
      {review.statusNote && <p className="text-sm text-ink-2">{review.statusNote}</p>}
      {review.status === "labeled" && review.confidenceReasons.length > 0 && (
        <section>
          <h3 className="font-semibold">Why this confidence</h3>
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
          <h3 className="mb-1.5 font-semibold">Topics</h3>
          <TopicChips topics={review.topics} />
        </section>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-ink-2">{label}</dt>
            <dd>{value}</dd>
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
  const upload = await getUpload(db, id);
  if (!upload) notFound();

  const filters = parseFilters(sp);
  const page = Number(first(sp.page)) || 1;
  const reviewId = Number(first(sp.review));
  const [result, options, selected] = await Promise.all([
    searchReviews(db, id, filters, page),
    getFilterOptions(db, id),
    Number.isInteger(reviewId) && reviewId > 0 ? getReview(db, id, reviewId) : Promise.resolve(null),
  ]);

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
          }}
        />
      </Suspense>

      <p className="text-sm text-ink-2" role="status">
        {plural(result.total, "review")}
        {hasActiveFilters(filters) ? " match the filters" : " in this upload"}
        {result.pageCount > 1 ? `, showing ${(result.page - 1) * result.pageSize + 1}–${Math.min(result.page * result.pageSize, result.total)}` : ""}
      </p>

      {result.rows.length ? (
        <ul className="grid gap-3">
          {result.rows.map((review) => (
            <ReviewCard key={review.id} review={review} href={reviewHref(review.id)} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<SearchX aria-hidden className="size-6" />}
          title="No reviews match"
          action={hasActiveFilters(filters) ? <ButtonLink href={base} variant="secondary">Clear search and filters</ButtonLink> : undefined}
        >
          {filters.q ? `Nothing contains “${filters.q}” with these filters. Try a shorter word or fewer filters.` : "Try fewer filters."}
        </EmptyState>
      )}

      <Pagination page={result.page} pageCount={result.pageCount} makeHref={listHref} />
      <ConfidenceExplainer basicMode={upload.provider === "basic"} />

      {selected && (
        <ReviewDialog key={selected.id} title={`Review from row ${selected.rowNumber}`} closeHref={listHref(result.page)}>
          <ReviewDetail review={selected} />
        </ReviewDialog>
      )}
    </div>
  );
}
