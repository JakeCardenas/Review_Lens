import { describe, expect, it } from "vitest";
import { computeConfidence, ratingPosition } from "@/lib/analysis/confidence";

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

  it("caps mixed opinions and very short text at medium", () => {
    expect(computeConfidence({ ...base, mixedOpinion: true })).toEqual({
      level: "medium",
      reasons: ["model_clear", "mixed_opinion"],
    });
    expect(computeConfidence({ ...base, wordCount: 3 }).level).toBe("medium");
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
