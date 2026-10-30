import { Check } from "lucide-react";
import { SentimentIcon, SENTIMENT_META } from "@/components/sentiment";
import { Card } from "@/components/ui";
import { CHECK_NOTES, classScores, describeExclusions } from "@/lib/analysis/agreement";
import { STAR_RULES } from "@/lib/analysis/confidence";
import { formatNumber, formatPercent } from "@/lib/format";
import type { LabelCheck } from "@/lib/server/dashboard";
import { CONFIDENCE_LEVELS, SENTIMENTS, type LabelCheckSource, type RatingScale } from "@/lib/types";

const LEVEL_NAMES = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" } as const;

export const CHECK_TITLES: Record<LabelCheckSource, string> = { label: "Label check", rating: "Rating alignment" };

export function checkDescription(check: LabelCheck, ratingScale: RatingScale | null): string {
  return check.source === "label"
    ? "Compares ReviewLens's label with the label you gave each review in your file."
    : `Compares ReviewLens's label with what each star rating suggests: ${STAR_RULES[ratingScale ?? 5]}.`;
}

/** "Not counted: 2 without a label." or "Every review with a label is counted." */
export function exclusionSentence(check: LabelCheck): string {
  const left = describeExclusions(check.excluded, check.source);
  if (left) return `Not counted: ${left}.`;
  return `Every review with ${check.source === "label" ? "a label" : "a rating"} is counted.`;
}

/** Counts by the label checked against (rows) and ReviewLens's label (columns); matches sit on the diagonal. */
export function LabelCheckTable({ check }: { check: LabelCheck }) {
  const yours = check.source === "label";
  const reference = yours ? "Your label" : "Stars suggest";
  return (
    <div className="min-w-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[300px] text-sm">
          <caption className="sr-only">
            {reference} in rows, ReviewLens&apos;s label in columns. Matching labels sit on the diagonal.
          </caption>
          <thead className="text-ink-2">
            <tr>
              <td />
              <th scope="colgroup" colSpan={3} className="pb-1 text-center text-[13px] font-bold">
                ReviewLens said
              </th>
            </tr>
            <tr>
              <th scope="col" className="py-1.5 pr-2 text-left text-[13px] font-bold">
                {reference}
              </th>
              {SENTIMENTS.map((s) => (
                <th key={s} scope="col" className="px-1 py-1.5 text-center text-[13px] font-bold">
                  <span className="inline-flex items-center gap-1">
                    <SentimentIcon sentiment={s} className="size-3.5" />
                    {SENTIMENT_META[s].label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SENTIMENTS.map((row) => (
              <tr key={row}>
                <th scope="row" className="py-1 pr-2 text-left font-bold">
                  {SENTIMENT_META[row].label}
                </th>
                {SENTIMENTS.map((col) => {
                  const n = check.matrix[row][col];
                  return (
                    <td key={col} className="p-1 text-center">
                      <span
                        className={`block rounded-control py-2.5 tabular ${
                          row === col ? "bg-brand-soft font-bold text-ink" : n ? "bg-surface-2 font-bold text-ink" : "text-ink-3"
                        }`}
                      >
                        {row === col && n > 0 && <Check aria-hidden className="mr-0.5 inline size-3.5 align-[-2px]" strokeWidth={3} />}
                        {formatNumber(n)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[13px] text-ink-2">
        Each number counts reviews by {yours ? "your label" : "what the stars suggest"} (left) and ReviewLens&apos;s label (top).
        The diagonal is where they match.
      </p>
    </div>
  );
}

/** "High confidence: 13 of 16 match (81%). Medium confidence: …", for the printable report. */
export function byConfidenceText(check: LabelCheck): string {
  return CONFIDENCE_LEVELS.filter((level) => check.byConfidence[level].total > 0)
    .map((level) => {
      const { total, agree } = check.byConfidence[level];
      return `${LEVEL_NAMES[level]}: ${formatNumber(agree)} of ${formatNumber(total)} match (${formatPercent(agree, total)}).`;
    })
    .join(" ");
}

const score = (value: number | null) => (value === null ? "n/a" : value.toFixed(2));

/** Precision, recall and F1 per label. Only for the person's own labels; a rating proxy gets none. */
export function ClassScoresTable({ check }: { check: LabelCheck }) {
  return (
    <div className="min-w-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px] sm:text-sm">
          <caption className="sr-only">Precision, recall and F1 for each label, with how many reviews each side gave it.</caption>
          <thead className="text-[13px] text-ink-2">
            <tr>
              <th scope="col" className="py-1.5 pr-2 font-bold sm:pr-3">Label</th>
              <th scope="col" className="py-1.5 pr-2 font-bold sm:pr-3">You</th>
              <th scope="col" className="py-1.5 pr-2 font-bold sm:pr-3">ReviewLens</th>
              <th scope="col" className="py-1.5 pr-2 font-bold sm:pr-3">Precision</th>
              <th scope="col" className="py-1.5 pr-2 font-bold sm:pr-3">Recall</th>
              <th scope="col" className="py-1.5 font-bold">F1</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {classScores(check.matrix).map((c) => (
              <tr key={c.sentiment} className="border-t border-line">
                <th scope="row" className="py-1.5 pr-2 font-bold sm:pr-3">
                  {SENTIMENT_META[c.sentiment].label}
                </th>
                <td className="py-1.5 pr-2 sm:pr-3">{formatNumber(c.support)}</td>
                <td className="py-1.5 pr-2 sm:pr-3">{formatNumber(c.predicted)}</td>
                <td className="py-1.5 pr-2 sm:pr-3">{score(c.precision)}</td>
                <td className="py-1.5 pr-2 sm:pr-3">{score(c.recall)}</td>
                <td className="py-1.5">{score(c.f1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[13px] text-ink-2">
        Precision: of the reviews ReviewLens gave a label, the share you gave it too. Recall: of the reviews you gave a
        label, the share ReviewLens found. F1 combines the two. n/a means there was nothing to work it out from.
      </p>
    </div>
  );
}

/**
 * Compares ReviewLens's labels with the person's own labels ("Label check") or, without a label
 * column, with what each star rating suggests ("Rating alignment").
 */
export function LabelCheckCard({ check, ratingScale }: { check: LabelCheck; ratingScale: RatingScale | null }) {
  const yours = check.source === "label";
  return (
    <Card title={CHECK_TITLES[check.source]} description={checkDescription(check, ratingScale)}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="grid content-start gap-5">
          <div>
            <p className="font-display text-[2.5rem] font-black leading-none tracking-[-0.02em] tabular">
              {formatNumber(check.agree)}
              <span className="text-xl font-extrabold text-ink-3"> of {formatNumber(check.eligible)}</span>
            </p>
            <p className="text-sm text-ink-2">
              reviews that could be compared {yours ? "match your label" : "match the stars"} ({formatPercent(check.agree, check.eligible)})
            </p>
            <p className="mt-2 text-sm text-ink-2">{exclusionSentence(check)}</p>
          </div>
          <dl className="grid gap-2 text-sm">
            {CONFIDENCE_LEVELS.map((level) => {
              const { total, agree } = check.byConfidence[level];
              return (
                <div key={level} className="flex items-baseline justify-between gap-3 border-b border-line pb-2 last:border-0">
                  <dt className="text-ink-2">{LEVEL_NAMES[level]}</dt>
                  <dd className="tabular">
                    {total ? `${formatNumber(agree)} of ${formatNumber(total)} match (${formatPercent(agree, total)})` : "no reviews"}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
        <div className="grid content-start gap-5">
          <LabelCheckTable check={check} />
          {yours && check.eligible > 0 && <ClassScoresTable check={check} />}
        </div>
      </div>
      <p className="mt-5 rounded-card bg-surface-2 p-3.5 text-sm text-ink-2">{CHECK_NOTES[check.source]}</p>
    </Card>
  );
}
