import { formatNumber } from "@/lib/format";
import { SENTIMENTS, type LabelCheckSource, type Sentiment } from "@/lib/types";

/** Counts by the label checked against (rows) and ReviewLens's label (columns). */
export type AgreementMatrix = Record<Sentiment, Record<Sentiment, number>>;

export type ClassScore = {
  sentiment: Sentiment;
  /** Reviews the reference gave this label. */
  support: number;
  /** Reviews ReviewLens gave this label. */
  predicted: number;
  correct: number;
  /** Null when there is nothing to divide by. */
  precision: number | null;
  recall: number | null;
  f1: number | null;
};

/** Precision, recall and F1 for each label, treating the reference labels as the answers. */
export function classScores(matrix: AgreementMatrix): ClassScore[] {
  return SENTIMENTS.map((sentiment) => {
    const correct = matrix[sentiment][sentiment];
    const support = SENTIMENTS.reduce((sum, app) => sum + matrix[sentiment][app], 0);
    const predicted = SENTIMENTS.reduce((sum, reference) => sum + matrix[reference][sentiment], 0);
    const precision = predicted ? correct / predicted : null;
    const recall = support ? correct / support : null;
    const f1 =
      precision === null || recall === null ? null : precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    return { sentiment, support, predicted, correct, precision, recall, f1 };
  });
}

/** Reviews left out of an agreement check, by reason. Each review counts once. */
export type CheckExclusions = {
  /** No label (or rating) to compare with. */
  missing: number;
  /** A label (or rating) that couldn't be read. */
  invalid: number;
  /** Not labeled because of the language. */
  notLabeled: number;
  failed: number;
  /** Not analyzed yet. */
  pending: number;
};

/** "1 without a label, 2 that couldn't be analyzed", or null when nothing was left out. */
export function describeExclusions(excluded: CheckExclusions, source: LabelCheckSource): string | null {
  const thing = source === "label" ? "label" : "rating";
  const parts: [number, string][] = [
    [excluded.missing, `without a ${thing}`],
    [excluded.invalid, `with a ${thing} that couldn't be read`],
    [excluded.notLabeled, "in a language ReviewLens doesn't read"],
    [excluded.failed, "that couldn't be analyzed"],
    [excluded.pending, "not analyzed yet"],
  ];
  const kept = parts.filter(([n]) => n > 0).map(([n, text]) => `${formatNumber(n)} ${text}`);
  return kept.length ? kept.join(", ") : null;
}

/** What each agreement check can and can't tell you. Shown on the dashboard and in the reports. */
export const CHECK_NOTES = {
  label:
    "This shows how often ReviewLens agrees with your labels. It isn't proof that ReviewLens is accurate, and with only a few labeled reviews one review can change the result a lot.",
  rating:
    "Star ratings are only a rough proxy, not labels a person checked. A 5-star review can still complain, so this isn't proof that ReviewLens is accurate.",
} as const;
