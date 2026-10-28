"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui";
import { TOPICS } from "@/lib/analysis/topics";
import type { LabelCheckSource, RatingScale } from "@/lib/types";

export type FilterOptionsProps = {
  products: { name: string; count: number }[];
  minDate: string | null;
  maxDate: string | null;
  hasDate: boolean;
  hasRating: boolean;
  hasProduct: boolean;
  ratingScale: RatingScale | null;
  /** What reviews are checked against, which turns on the agreement filter. */
  checkSource?: LabelCheckSource | null;
};

const DASHBOARD_KEYS = ["from", "to", "product", "rating_min", "rating_max"];
const REVIEW_KEYS = [...DASHBOARD_KEYS, "sentiment", "topic", "confidence", "opinion", "check", "status", "q"];

function ratingSteps(scale: RatingScale | null): number[] {
  if (scale === 100) return Array.from({ length: 11 }, (_, i) => i * 10);
  return Array.from({ length: scale ?? 5 }, (_, i) => i + 1);
}

const selectClass =
  "min-h-11 w-full rounded-control border-2 border-field bg-surface px-2.5 text-[15px] font-normal text-ink hover:border-ink-3 focus-visible:border-brand-ink";

/** Filters live in the URL so reload, Back and shared links keep them. */
export function FiltersBar({ options, mode }: { options: FilterOptionsProps; mode: "dashboard" | "reviews" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  const keys = mode === "dashboard" ? DASHBOARD_KEYS : REVIEW_KEYS;
  const active = keys.filter((k) => searchParams.get(k)).length;
  const value = (key: string) => searchParams.get(key) ?? "";

  function update(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, next] of Object.entries(changes)) {
      if (next) params.set(key, next);
      else params.delete(key);
    }
    params.delete("page");
    params.delete("review");
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function clearAll() {
    setQuery("");
    update(Object.fromEntries(keys.map((k) => [k, null])));
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    update({ q: query.trim() || null });
  }

  const steps = ratingSteps(options.ratingScale);
  const field = "grid min-w-0 gap-1.5 text-[13px] font-bold text-ink-2";

  return (
    <div className="no-print grid gap-3" aria-busy={pending}>
      {mode === "reviews" && (
        <form role="search" onSubmit={submitSearch} className="flex gap-2">
          <label htmlFor="review-search" className="sr-only">
            Search reviews
          </label>
          <div className="relative min-w-0 flex-1">
            <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <input
              id="review-search"
              type="search"
              enterKeyHint="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search words in reviews, like refund or late"
              className="min-h-12 w-full rounded-control border-2 border-field bg-surface pl-10 pr-3 text-ink hover:border-ink-3 focus-visible:border-brand-ink"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
      )}

      <div className="flex items-center justify-between gap-2 sm:hidden">
        <Button variant="secondary" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="filter-panel">
          <SlidersHorizontal aria-hidden className="size-4" />
          Filters{active ? ` (${active})` : ""}
        </Button>
        {active > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear all
          </Button>
        )}
      </div>

      <div
        id="filter-panel"
        className={`${open ? "grid" : "hidden"} gap-3 rounded-card border-[1.5px] border-line bg-surface p-4 sm:grid sm:p-5 sm:grid-cols-2 lg:grid-cols-4 lg:items-end`}
      >
        {options.hasDate && (
          <>
            <label className={field}>
              From
              <input
                type="date"
                value={value("from")}
                min={options.minDate ?? undefined}
                max={options.maxDate ?? undefined}
                onChange={(e) => update({ from: e.target.value || null })}
                className={selectClass}
              />
            </label>
            <label className={field}>
              To
              <input
                type="date"
                value={value("to")}
                min={options.minDate ?? undefined}
                max={options.maxDate ?? undefined}
                onChange={(e) => update({ to: e.target.value || null })}
                className={selectClass}
              />
            </label>
          </>
        )}
        {options.hasProduct && (
          <label className={field}>
            Product
            <select value={value("product")} onChange={(e) => update({ product: e.target.value || null })} className={selectClass}>
              <option value="">All products</option>
              {options.products.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.count})
                </option>
              ))}
            </select>
          </label>
        )}
        {options.hasRating && (
          <div className="grid grid-cols-2 gap-2">
            <label className={field}>
              Rating from
              <select value={value("rating_min")} onChange={(e) => update({ rating_min: e.target.value || null })} className={selectClass}>
                <option value="">Any</option>
                {steps.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className={field}>
              to
              <select value={value("rating_max")} onChange={(e) => update({ rating_max: e.target.value || null })} className={selectClass}>
                <option value="">Any</option>
                {steps.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {mode === "reviews" && (
          <>
            <label className={field}>
              Sentiment
              <select value={value("sentiment")} onChange={(e) => update({ sentiment: e.target.value || null })} className={selectClass}>
                <option value="">All sentiments</option>
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
              </select>
            </label>
            <label className={field}>
              Topic
              <select value={value("topic")} onChange={(e) => update({ topic: e.target.value || null })} className={selectClass}>
                <option value="">All topics</option>
                {TOPICS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={field}>
              Confidence
              <select value={value("confidence")} onChange={(e) => update({ confidence: e.target.value || null })} className={selectClass}>
                <option value="">Any confidence</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label className={field}>
              Opinion
              <select value={value("opinion")} onChange={(e) => update({ opinion: e.target.value || null })} className={selectClass}>
                <option value="">All opinions</option>
                <option value="mixed">Mixed praise and complaints</option>
              </select>
            </label>
            {options.checkSource && (
              <label className={field}>
                {options.checkSource === "label" ? "Label check" : "Rating alignment"}
                <select value={value("check")} onChange={(e) => update({ check: e.target.value || null })} className={selectClass}>
                  <option value="">All reviews</option>
                  <option value="disagree">{options.checkSource === "label" ? "Differs from your label" : "Differs from the stars"}</option>
                  <option value="agree">{options.checkSource === "label" ? "Matches your label" : "Matches the stars"}</option>
                </select>
              </label>
            )}
            <label className={field}>
              Status
              <select value={value("status")} onChange={(e) => update({ status: e.target.value || null })} className={selectClass}>
                <option value="">All reviews</option>
                <option value="labeled">Labeled</option>
                <option value="not_labeled">Not labeled</option>
                <option value="failed">Failed</option>
                <option value="pending">Waiting for analysis</option>
              </select>
            </label>
          </>
        )}

        {!options.hasDate && !options.hasProduct && !options.hasRating && mode === "dashboard" && (
          <p className="text-sm text-ink-2 sm:col-span-2">
            Date, product and rating filters appear when those columns are matched during upload.
          </p>
        )}

        {active > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="hidden justify-self-start sm:inline-flex">
            <X aria-hidden className="size-4" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
