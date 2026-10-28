import { describe, expect, it } from "vitest";
import { topicsNeedingAttention } from "@/lib/dashboard-insights";
import type { TopicBreakdown } from "@/lib/server/dashboard";

const topic = (id: string, positive: number, neutral: number, negative: number) =>
  ({ id, label: id, total: positive + neutral + negative, positive, neutral, negative }) as TopicBreakdown;

describe("topics needing attention", () => {
  it("ranks topics by negative mentions and leaves out topics with none", () => {
    const ranked = topicsNeedingAttention([topic("price", 9, 1, 2), topic("delivery", 3, 1, 7), topic("service", 4, 0, 0)]);
    expect(ranked.map((t) => t.id)).toEqual(["delivery", "price"]);
  });

  it("puts the more-mentioned topic first when negative counts tie", () => {
    const ranked = topicsNeedingAttention([topic("size", 1, 0, 3), topic("quality", 6, 2, 3)]);
    expect(ranked.map((t) => t.id)).toEqual(["quality", "size"]);
  });

  it("returns at most the requested number of topics", () => {
    const topics = [topic("a", 0, 0, 5), topic("b", 0, 0, 4), topic("c", 0, 0, 3), topic("d", 0, 0, 2)];
    expect(topicsNeedingAttention(topics, 3)).toHaveLength(3);
  });

  it("returns nothing when no topic has a negative mention, and keeps the input order intact", () => {
    const topics = [topic("a", 2, 1, 0), topic("b", 1, 0, 0)];
    expect(topicsNeedingAttention(topics)).toEqual([]);
    expect(topics.map((t) => t.id)).toEqual(["a", "b"]);
  });
});
