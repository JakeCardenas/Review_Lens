export const SENTIMENTS = ["positive", "neutral", "negative"] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

/** Order of day and month in numeric dates. `ymd` means ISO-style dates only. */
export type DateFormat = "ymd" | "mdy" | "dmy";
export type RatingScale = 5 | 10 | 100;

export type ColumnField = "text" | "date" | "rating" | "product";
export type ColumnMap = Record<ColumnField, string | null>;

/** One CSV row after column mapping, before cleaning. `rowNumber` counts the header as row 1. */
export type RawRow = {
  rowNumber: number;
  text: string;
  date?: string | null;
  rating?: string | null;
  product?: string | null;
};

export type IssueCode =
  | "EMPTY_TEXT"
  | "TEXT_SHORTENED"
  | "BAD_DATE"
  | "RATING_OUT_OF_RANGE"
  | "RATING_UNREADABLE"
  | "PRODUCT_SHORTENED"
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
