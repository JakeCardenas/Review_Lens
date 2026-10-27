import { describe, expect, it } from "vitest";
import { guessColumnMapping, isPersonalColumn } from "@/lib/csv/columns";

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
    });
  });

  it("leaves the text field empty when nothing looks like review text", () => {
    expect(guessColumnMapping(["sku", "price"]).text).toBeNull();
  });
});
