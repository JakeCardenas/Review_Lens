import { describe, expect, it } from "vitest";
import { extractKeywords, rankKeywords } from "@/lib/analysis/keywords";

describe("extractKeywords", () => {
  it("keeps meaningful words and two-word phrases", () => {
    const keywords = extractKeywords("Late delivery and the box was damaged. Not worth the price! Customer service ignored me.");
    expect(keywords).toEqual(expect.arrayContaining(["late delivery", "damaged", "not worth", "price", "customer service"]));
  });

  it("drops stopwords, short tokens and numbers", () => {
    const keywords = extractKeywords("It is the one I got 2 of, so it was ok");
    expect(keywords).not.toEqual(expect.arrayContaining(["the"]));
    expect(keywords).not.toContain("2");
    expect(keywords).not.toContain("it");
  });

  it("ignores masked personal data", () => {
    expect(extractKeywords("Contact [email] or [phone] about refund")).toEqual(["contact", "refund"]);
  });

  it("keeps at most 30 unique keywords", () => {
    const text = Array.from({ length: 60 }, (_, i) => `word${String.fromCharCode(97 + (i % 26))}${i}`).join(" ");
    expect(extractKeywords(text).length).toBeLessThanOrEqual(30);
  });
});

describe("rankKeywords", () => {
  const totals = { positive: 10, neutral: 0, negative: 10 };

  it("lists words that are more common in one sentiment than the others", () => {
    const ranked = rankKeywords(
      [
        { sentiment: "positive", term: "love", n: 6 },
        { sentiment: "positive", term: "delivery", n: 3 },
        { sentiment: "negative", term: "delivery", n: 7 },
        { sentiment: "positive", term: "product", n: 5 },
        { sentiment: "negative", term: "product", n: 5 },
        { sentiment: "negative", term: "refund", n: 1 },
      ],
      totals,
    );
    expect(ranked.positive.map((k) => k.term)).toEqual(["love"]);
    expect(ranked.negative.map((k) => k.term)).toEqual(["delivery"]);
    expect(ranked.negative[0]).toEqual({ term: "delivery", count: 7, share: 0.7 });
    expect(ranked.neutral).toEqual([]);
  });
});
