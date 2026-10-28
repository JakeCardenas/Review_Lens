import { describe, expect, it } from "vitest";
import { prepareRow } from "@/lib/csv/prepare";

const options = { dateFormat: "dmy" as const, ratingScale: 5 as const };

describe("prepareRow", () => {
  it("cleans, masks and parses a good row", () => {
    const row = prepareRow(
      { rowNumber: 2, text: "<b>Late</b> delivery, email me at x@y.com", date: "25/04/2025", rating: "2", product: " Kettle " },
      options,
    );
    expect(row).toEqual({
      rowNumber: 2,
      text: "Late delivery, email me at [email]",
      reviewDate: "2025-04-25",
      rating: 2,
      product: "Kettle",
      referenceLabel: null,
      issues: [],
    });
  });

  it("reads your own label for the label check", () => {
    expect(prepareRow({ rowNumber: 6, text: "Fine", label: " Negative " }, options)).toMatchObject({
      referenceLabel: "negative",
      issues: [],
    });
  });

  it("keeps the review but warns about a label it can't read", () => {
    const row = prepareRow({ rowNumber: 8, text: "Fine", label: "4" }, options);
    expect(row.referenceLabel).toBeNull();
    expect(row.issues).toEqual([expect.objectContaining({ severity: "warning", code: "LABEL_UNREADABLE" })]);
  });

  it("skips a row with no review text", () => {
    const row = prepareRow({ rowNumber: 7, text: "  <br> ... " }, options);
    expect(row.text).toBeNull();
    expect(row.issues).toEqual([
      expect.objectContaining({ rowNumber: 7, severity: "error", code: "EMPTY_TEXT" }),
    ]);
  });

  it("keeps the review but warns about an unreadable date", () => {
    const row = prepareRow({ rowNumber: 3, text: "Fine", date: "last week" }, options);
    expect(row.text).toBe("Fine");
    expect(row.reviewDate).toBeNull();
    expect(row.issues).toEqual([expect.objectContaining({ severity: "warning", code: "BAD_DATE" })]);
  });

  it("keeps the review but warns about a rating outside the scale", () => {
    const row = prepareRow({ rowNumber: 4, text: "Fine", rating: "9" }, options);
    expect(row.rating).toBeNull();
    expect(row.issues).toEqual([expect.objectContaining({ severity: "warning", code: "RATING_OUT_OF_RANGE" })]);
  });

  it("shortens very long text to 4,000 characters with a warning", () => {
    const row = prepareRow({ rowNumber: 5, text: "word ".repeat(1200) }, options);
    expect(row.text!.length).toBeLessThanOrEqual(4000);
    expect(row.issues).toEqual([expect.objectContaining({ severity: "warning", code: "TEXT_SHORTENED" })]);
  });
});
