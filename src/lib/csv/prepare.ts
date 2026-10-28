import { LIMITS } from "@/lib/limits";
import type { DateFormat, RatingScale, RawRow, RowIssue, Sentiment } from "@/lib/types";
import { cleanText, maskPersonalData } from "./clean";
import { parseDate, parseLabel, parseRating } from "./parse-values";

export type PrepareOptions = { dateFormat: DateFormat | null; ratingScale: RatingScale | null };

export type PreparedRow = {
  rowNumber: number;
  /** Cleaned and masked text, or null when the row has no usable text and is skipped. */
  text: string | null;
  reviewDate: string | null;
  rating: number | null;
  product: string | null;
  /** The person's own label for the label check, when the file has one. */
  referenceLabel: Sentiment | null;
  issues: RowIssue[];
};

const HAS_CONTENT = /[\p{L}\p{N}\p{Extended_Pictographic}]/u;

function shorten(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > max - 40 ? cut.slice(0, lastSpace) : cut}…`;
}

function quote(value: string): string {
  const masked = maskPersonalData(cleanText(value));
  return `“${masked.length > 40 ? `${masked.slice(0, 39)}…` : masked}”`;
}

/** Cleans one mapped CSV row the same way in the browser preview and on the server. */
export function prepareRow(raw: RawRow, options: PrepareOptions): PreparedRow {
  const issues: RowIssue[] = [];
  const row = raw.rowNumber;
  const warn = (code: RowIssue["code"], message: string) =>
    issues.push({ rowNumber: row, severity: "warning", code, message });

  let text: string | null = maskPersonalData(cleanText(raw.text ?? ""));
  if (!HAS_CONTENT.test(text)) {
    text = null;
    issues.push({
      rowNumber: row,
      severity: "error",
      code: "EMPTY_TEXT",
      message: `Row ${row} has no review text, so it was skipped.`,
    });
  } else if (text.length > LIMITS.maxTextLength) {
    text = shorten(text, LIMITS.maxTextLength);
    warn("TEXT_SHORTENED", `Row ${row}: the review was longer than 4,000 characters and was shortened.`);
  }

  let reviewDate: string | null = null;
  if (raw.date?.trim()) {
    reviewDate = parseDate(raw.date, options.dateFormat);
    if (!reviewDate) {
      warn("BAD_DATE", `Row ${row}: the date ${quote(raw.date)} couldn't be read, so the review was kept without a date.`);
    }
  }

  let rating: number | null = null;
  if (raw.rating?.trim()) {
    const scale = options.ratingScale ?? 5;
    rating = parseRating(raw.rating, scale);
    if (rating === null) {
      const readable = /\d|★/.test(raw.rating);
      warn(
        readable ? "RATING_OUT_OF_RANGE" : "RATING_UNREADABLE",
        readable
          ? `Row ${row}: the rating ${quote(raw.rating)} is outside the 0–${scale} scale, so the review was kept without a rating.`
          : `Row ${row}: the rating ${quote(raw.rating)} isn't a number, so the review was kept without a rating.`,
      );
    }
  }

  let product: string | null = null;
  if (raw.product?.trim()) {
    product = maskPersonalData(cleanText(raw.product)) || null;
    if (product && product.length > LIMITS.maxProductLength) {
      product = shorten(product, LIMITS.maxProductLength);
      warn("PRODUCT_SHORTENED", `Row ${row}: the product name was longer than 200 characters and was shortened.`);
    }
  }

  let referenceLabel: Sentiment | null = null;
  if (raw.label?.trim()) {
    referenceLabel = parseLabel(raw.label);
    if (!referenceLabel) {
      warn(
        "LABEL_UNREADABLE",
        `Row ${row}: the label ${quote(raw.label)} isn't positive, neutral or negative, so this review is left out of the label check.`,
      );
    }
  }

  return { rowNumber: row, text, reviewDate, rating, product, referenceLabel, issues };
}
