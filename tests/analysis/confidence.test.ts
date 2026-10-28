import { describe, expect, it } from "vitest";
import {
  computeConfidence,
  hasMixedOpinion,
  ratingPosition,
  sentimentFromRating,
  STAR_RULES,
} from "@/lib/analysis/confidence";

describe("sentimentFromRating", () => {
  it("reads 4–5 stars as positive, 3 as neutral and 1–2 as negative", () => {
    expect([5, 4, 3, 2, 1].map((stars) => sentimentFromRating(stars, 5))).toEqual([
      "positive",
      "positive",
      "neutral",
      "negative",
      "negative",
    ]);
  });

  it("works on other scales and returns null without a rating", () => {
    expect(sentimentFromRating(8, 10)).toBe("positive");
    expect(sentimentFromRating(50, 100)).toBe("neutral");
    expect(sentimentFromRating(null, 5)).toBeNull();
    expect(sentimentFromRating(4, null)).toBeNull();
  });

  it("rounds a rating's place on the scale exactly, the same way the database does", () => {
    expect(ratingPosition(3.98, 5)).toBe(0.75);
    expect(ratingPosition(74.5, 100)).toBe(0.75);
    expect(ratingPosition(25.5, 100)).toBe(0.26);
  });

  it("matches the star rules shown to people", () => {
    expect(STAR_RULES[5]).toBe("4–5 stars = positive, 3 = neutral, 1–2 = negative");
    expect([8, 7, 4, 3].map((r) => sentimentFromRating(r, 10))).toEqual(["positive", "neutral", "neutral", "negative"]);
    expect(STAR_RULES[10]).toBe("8–10 = positive, 4–7 = neutral, 1–3 = negative");
    expect([75, 74, 26, 25].map((r) => sentimentFromRating(r, 100))).toEqual(["positive", "neutral", "neutral", "negative"]);
    expect(STAR_RULES[100]).toBe("75–100 = positive, 26–74 = neutral, 0–25 = negative");
  });
});

describe("hasMixedOpinion", () => {
  it("is true when the confidence reasons say the review mixes praise and complaints", () => {
    expect(hasMixedOpinion(["model_leaning", "mixed_opinion"])).toBe(true);
    expect(hasMixedOpinion(["model_clear", "rating_agrees"])).toBe(false);
    expect(hasMixedOpinion([])).toBe(false);
  });
});

const base = {
  mode: "ai" as const,
  sentiment: "positive" as const,
  certainty: "clear" as const,
  mixedOpinion: false,
  mixedLanguage: false,
  wordCount: 12,
  languageStatus: "supported" as const,
  ratingPosition: null as number | null,
};

describe("ratingPosition", () => {
  it("places ratings between 0 and 1 on their scale", () => {
    expect(ratingPosition(1, 5)).toBe(0);
    expect(ratingPosition(4, 5)).toBe(0.75);
    expect(ratingPosition(10, 10)).toBe(1);
    expect(ratingPosition(null, 5)).toBeNull();
  });
});

describe("computeConfidence", () => {
  it("is high when the model is clear and the rating agrees", () => {
    expect(computeConfidence({ ...base, ratingPosition: 1 })).toEqual({
      level: "high",
      reasons: ["model_clear", "rating_agrees"],
    });
  });

  it("is low when the rating strongly disagrees", () => {
    expect(computeConfidence({ ...base, sentiment: "negative", ratingPosition: 1 })).toEqual({
      level: "low",
      reasons: ["model_clear", "rating_disagrees"],
    });
  });

  it("is medium when the model only leans", () => {
    expect(computeConfidence({ ...base, certainty: "leaning" }).level).toBe("medium");
  });

  it("caps a neutral label on a mixed review, and very short text, at medium", () => {
    expect(computeConfidence({ ...base, sentiment: "neutral", mixedOpinion: true })).toEqual({
      level: "medium",
      reasons: ["model_clear", "mixed_opinion"],
    });
    expect(computeConfidence({ ...base, wordCount: 3 }).level).toBe("medium");
  });

  it("marks a mixed review labeled positive or negative as low, since a reader may call it neutral", () => {
    for (const sentiment of ["positive", "negative"] as const) {
      expect(computeConfidence({ ...base, sentiment, mixedOpinion: true })).toEqual({
        level: "low",
        reasons: ["model_clear", "mixed_opinion", "mixed_one_side"],
      });
    }
  });

  it("leaves Basic mode's confidence for mixed reviews as it was", () => {
    expect(computeConfidence({ ...base, mode: "basic", mixedOpinion: true })).toEqual({
      level: "medium",
      reasons: ["wordlist_strong", "mixed_opinion"],
    });
  });

  it("is low for mixed-language reviews", () => {
    expect(computeConfidence({ ...base, languageStatus: "mixed" }).level).toBe("low");
  });

  it("caps undetermined language at medium", () => {
    expect(computeConfidence({ ...base, languageStatus: "undetermined" }).level).toBe("medium");
  });

  it("never gives Basic mode a high level", () => {
    expect(computeConfidence({ ...base, mode: "basic", ratingPosition: 1 })).toEqual({
      level: "medium",
      reasons: ["wordlist_strong", "rating_agrees", "basic_mode"],
    });
    expect(computeConfidence({ ...base, mode: "basic", certainty: "leaning" }).level).toBe("low");
  });
});
