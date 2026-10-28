import { describe, expect, it } from "vitest";
import { classScores, describeExclusions } from "@/lib/analysis/agreement";

describe("classScores", () => {
  it("works out precision, recall and F1 for each label from the comparison table", () => {
    const scores = classScores({
      positive: { positive: 5, neutral: 1, negative: 0 },
      neutral: { positive: 2, neutral: 4, negative: 2 },
      negative: { positive: 0, neutral: 1, negative: 7 },
    });
    expect(scores.map((s) => [s.sentiment, s.support, s.predicted, s.correct])).toEqual([
      ["positive", 6, 7, 5],
      ["neutral", 8, 6, 4],
      ["negative", 8, 9, 7],
    ]);
    expect(scores[0].precision).toBeCloseTo(5 / 7);
    expect(scores[0].recall).toBeCloseTo(5 / 6);
    expect(scores[0].f1).toBeCloseTo((2 * (5 / 7) * (5 / 6)) / (5 / 7 + 5 / 6));
    expect(scores[1].recall).toBeCloseTo(0.5);
  });

  it("leaves a score empty when there is nothing to work it out from", () => {
    const [, neutral, negative] = classScores({
      positive: { positive: 2, neutral: 0, negative: 0 },
      neutral: { positive: 0, neutral: 0, negative: 0 },
      negative: { positive: 0, neutral: 1, negative: 0 },
    });
    expect(neutral).toMatchObject({ support: 0, predicted: 1, precision: 0, recall: null, f1: null });
    expect(negative).toMatchObject({ support: 1, predicted: 0, precision: null, recall: 0, f1: null });
  });
});

describe("describeExclusions", () => {
  it("says what was left out and why, skipping reasons with no reviews", () => {
    expect(describeExclusions({ missing: 2, invalid: 1, notLabeled: 0, failed: 1, pending: 0 }, "label")).toBe(
      "2 without a label, 1 with a label that couldn't be read, 1 that couldn't be analyzed",
    );
    expect(describeExclusions({ missing: 1, invalid: 0, notLabeled: 3, failed: 0, pending: 0 }, "rating")).toBe(
      "1 without a rating, 3 in a language ReviewLens doesn't read",
    );
    expect(describeExclusions({ missing: 0, invalid: 0, notLabeled: 0, failed: 0, pending: 0 }, "label")).toBeNull();
  });
});
