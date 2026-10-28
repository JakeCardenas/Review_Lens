import { SentimentIcon, SENTIMENT_META } from "@/components/sentiment";
import { ButtonLink, Card } from "@/components/ui";
import { STAR_RULES } from "@/lib/analysis/confidence";
import { formatNumber, formatPercent } from "@/lib/format";
import type { LabelCheck } from "@/lib/server/dashboard";
import { CONFIDENCE_LEVELS, SENTIMENTS, type LabelCheckSource, type RatingScale } from "@/lib/types";

const LEVEL_NAMES = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" } as const;

export const LABEL_CHECK_CAVEAT: Record<LabelCheckSource, string> = {
  label:
    "This shows how often ReviewLens agrees with your labels. It isn't proof that ReviewLens is accurate, and with only a few labeled reviews one review can change the result a lot.",
  stars:
    "Stars and words don't always agree. A 5-star review can still complain, so this is a rough check, not proof that ReviewLens is accurate.",
};

/** Counts by the label checked against (rows) and ReviewLens's label (columns); matches sit on the diagonal. */
export function LabelCheckTable({ check }: { check: LabelCheck }) {
  const yours = check.source === "label";
  const reference = yours ? "Your label" : "Stars suggest";
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full min-w-[300px] text-sm">
        <caption className="sr-only">
          {reference} in rows, ReviewLens&apos;s label in columns. Matching labels sit on the diagonal.
        </caption>
        <thead className="text-ink-2">
          <tr>
            <td />
            <th scope="colgroup" colSpan={3} className="pb-1 text-center text-xs font-semibold">
              ReviewLens said
            </th>
          </tr>
          <tr>
            <th scope="col" className="py-1.5 pr-2 text-left text-xs font-semibold">
              {reference}
            </th>
            {SENTIMENTS.map((s) => (
              <th key={s} scope="col" className="px-1 py-1.5 text-center text-xs font-semibold">
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
              <th scope="row" className="py-1 pr-2 text-left font-semibold">
                {SENTIMENT_META[row].label}
              </th>
              {SENTIMENTS.map((col) => {
                const n = check.matrix[row][col];
                return (
                  <td key={col} className="p-1 text-center">
                    <span
                      className={`block rounded-control py-2 tabular ${
                        row === col ? "bg-brand-soft font-semibold text-ink" : n ? "bg-warn-soft text-warn-ink" : "text-ink-3"
                      }`}
                    >
                      {formatNumber(n)}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-ink-2">
        Each number counts reviews by {yours ? "your label" : "what the stars suggest"} (left) and ReviewLens&apos;s label (top).
        The diagonal is where they match.
      </p>
    </div>
  );
}

/** One line per confidence level that has reviews, for the printable report. */
export function byConfidenceText(check: LabelCheck): string {
  return CONFIDENCE_LEVELS.filter((level) => check.byConfidence[level].total > 0)
    .map((level) => {
      const { total, agree } = check.byConfidence[level];
      return `${LEVEL_NAMES[level]}: ${formatNumber(agree)} of ${formatNumber(total)} match (${formatPercent(agree, total)})`;
    })
    .join(". ");
}

/** Compares ReviewLens's labels with the person's own labels, or with the label each star rating suggests. */
export function LabelCheckCard({
  check,
  ratingScale,
  disagreementsHref,
}: {
  check: LabelCheck;
  ratingScale: RatingScale | null;
  disagreementsHref: string;
}) {
  const yours = check.source === "label";
  return (
    <Card
      title="Label check"
      description={
        yours
          ? "Compares ReviewLens's label with the label you gave each review in your file. Reviews you didn't label are left out."
          : `Compares ReviewLens's label with what each star rating suggests: ${STAR_RULES[ratingScale ?? 5]}.`
      }
      actions={
        check.agree < check.total ? (
          <ButtonLink href={disagreementsHref} variant="secondary" size="sm">
            See the disagreements
          </ButtonLink>
        ) : undefined
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="grid content-start gap-5">
          <div>
            <p className="font-display text-4xl font-semibold tracking-tight tabular">
              {formatNumber(check.agree)}
              <span className="text-xl text-ink-2"> of {formatNumber(check.total)}</span>
            </p>
            <p className="text-sm text-ink-2">
              {yours ? "match your label" : "match the stars"} ({formatPercent(check.agree, check.total)})
            </p>
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
        <LabelCheckTable check={check} />
      </div>
      <p className="mt-5 rounded-control bg-surface-2 p-3 text-sm text-ink-2">{LABEL_CHECK_CAVEAT[check.source]}</p>
    </Card>
  );
}
