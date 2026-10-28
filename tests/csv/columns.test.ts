import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import { csvColumnsProblem, guessColumnMapping, isPersonalColumn, textColumnProblem } from "@/lib/csv/columns";

describe("csvColumnsProblem", () => {
  const parse = (text: string) => Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: "greedy" });

  it("accepts a file with only a review text column", () => {
    const result = parse("review_text\nSobrang ganda ng tela\nHindi maganda ang tela, walang box\n");
    // With one column there is no comma to detect, so Papa reports a delimiter warning; the file is still fine.
    expect(result.errors.some((e) => e.type === "Delimiter")).toBe(true);
    expect(result.meta.fields).toEqual(["review_text"]);
    expect(csvColumnsProblem(result.meta.fields ?? [])).toBeNull();
  });

  it("rejects a file without a header row of column names", () => {
    expect(csvColumnsProblem([])).toMatch(/first line names the columns/);
  });
});

describe("isPersonalColumn", () => {
  it.each(["Customer Name", "email", "E-mail", "user_id", "Reviewer", "Phone Number", "author", "IP Address", "order id"])(
    "flags %s as personal",
    (header) => {
      expect(isPersonalColumn(header)).toBe(true);
    },
  );

  it.each(["Review", "Customer Review", "Product Name", "Rating", "Review Date", "product_id", "Comments"])(
    "does not flag %s",
    (header) => {
      expect(isPersonalColumn(header)).toBe(false);
    },
  );
});

describe("guessColumnMapping", () => {
  it("maps common header names to review fields", () => {
    expect(guessColumnMapping(["﻿review_id", "Customer Name", "Review", "Stars", "Date", "Product"])).toEqual({
      text: "Review",
      date: "Date",
      rating: "Stars",
      product: "Product",
      label: null,
    });
  });

  it("prefers a comment column over a title column for the text", () => {
    expect(guessColumnMapping(["title", "comment", "created_at"]).text).toBe("comment");
  });

  it("never maps a personal column", () => {
    expect(guessColumnMapping(["author", "email", "feedback"])).toEqual({
      text: "feedback",
      date: null,
      rating: null,
      product: null,
      label: null,
    });
  });

  it("leaves the text field empty when nothing looks like review text", () => {
    expect(guessColumnMapping(["sku", "price"]).text).toBeNull();
  });

  it("suggests a column that holds your own labels", () => {
    expect(guessColumnMapping(["review_text", "my_label"]).label).toBe("my_label");
    expect(guessColumnMapping(["review", "sentiment"]).label).toBe("sentiment");
    expect(guessColumnMapping(["review", "stars"]).label).toBeNull();
  });
});

describe("textColumnProblem", () => {
  it("stops a label column from being used as the review text", () => {
    expect(textColumnProblem(["positive", "Neutral", "negative", "neutral", ""])).toMatch(/holds labels/);
  });

  it("accepts real review text, even when a few reviews are one word", () => {
    expect(textColumnProblem(["Love it", "positive", "The lid broke after a week", "Late delivery"])).toBeNull();
    expect(textColumnProblem([])).toBeNull();
  });
});
