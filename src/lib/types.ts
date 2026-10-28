export const SENTIMENTS = ["positive", "neutral", "negative"] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

/** Order of day and month in numeric dates. `ymd` means ISO-style dates only. */
export type DateFormat = "ymd" | "mdy" | "dmy";
export type RatingScale = 5 | 10 | 100;

/**
 * What ReviewLens's labels are checked against: the person's own labels ("label check"), or the
 * label each rating suggests ("rating alignment"), which is only a rough proxy.
 */
export type LabelCheckSource = "label" | "rating";

export type ColumnField = "text" | "date" | "rating" | "product" | "label";
/** `label` is optional because uploads made before the label check have no entry for it. */
export type ColumnMap = Record<Exclude<ColumnField, "label">, string | null> & { label?: string | null };

/** One CSV row after column mapping, before cleaning. `rowNumber` counts the header as row 1. */
export type RawRow = {
  rowNumber: number;
  text: string;
  date?: string | null;
  rating?: string | null;
  product?: string | null;
  /** The person's own positive, neutral or negative label, used only for the label check. */
  label?: string | null;
};

export type IssueCode =
  | "EMPTY_TEXT"
  | "TEXT_SHORTENED"
  | "BAD_DATE"
  | "RATING_OUT_OF_RANGE"
  | "RATING_UNREADABLE"
  | "PRODUCT_SHORTENED"
  | "LABEL_UNREADABLE"
  | "LANGUAGE_UNSUPPORTED"
  | "LANGUAGE_MIXED"
  | "ANALYSIS_FAILED";

export type IssueSeverity = "warning" | "error";

export type RowIssue = {
  rowNumber: number | null;
  severity: IssueSeverity;
  code: IssueCode;
  message: string;
};

export type UploadStatus = "importing" | "analyzing" | "done" | "done_with_issues" | "failed";
export type ReviewStatus = "pending" | "processing" | "labeled" | "not_labeled" | "failed";
export type LanguageStatus = "supported" | "unsupported" | "mixed" | "undetermined";
