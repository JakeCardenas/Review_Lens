import { describe, expect, it } from "vitest";
import { detectTopics, TOPICS } from "@/lib/analysis/topics";

describe("detectTopics", () => {
  it.each([
    ["The delivery was late but the price was fair", ["delivery", "price"]],
    ["Fell apart after a week, poor quality stitching", ["quality"]],
    ["Customer service was rude and never replied", ["service"]],
    ["The box was crushed and the bubble wrap missing", ["packaging"]],
    ["Too small, the size runs tight", ["fit"]],
    ["Easy to set up, instructions were clear", ["usability"]],
    ["I asked for a refund twice", ["returns"]],
  ])("finds the topics in %j", (text, topics) => {
    expect(detectTopics(text)).toEqual(topics);
  });

  it("returns no topics for text without any", () => {
    expect(detectTopics("Nice")).toEqual([]);
  });

  it("lists eight topics with readable labels", () => {
    expect(TOPICS.map((t) => t.label)).toEqual([
      "Delivery & shipping",
      "Price & value",
      "Product quality",
      "Customer service",
      "Packaging",
      "Size & fit",
      "Ease of use",
      "Returns & refunds",
    ]);
  });
});
