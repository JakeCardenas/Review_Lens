import type { ReasonCode } from "@/lib/analysis/confidence";
import type { Confidence, IssueSeverity, LanguageStatus, ReviewStatus, Sentiment } from "@/lib/types";
import type { Db } from "./db-types";
import { buildWhere, type ReviewFilters } from "./filters";
import { isUploadId } from "./uploads";

export type ReviewRow = {
  id: number;
  rowNumber: number;
  text: string;
  reviewDate: string | null;
  rating: number | null;
  product: string | null;
  language: string;
  languageStatus: LanguageStatus;
  status: ReviewStatus;
  statusNote: string | null;
  sentiment: Sentiment | null;
  confidence: Confidence | null;
  confidenceReasons: ReasonCode[];
  topics: string[];
  modelOutput: Record<string, unknown> | null;
  /** The label the review is checked against: the person's own, or the one its stars suggest. */
  referenceLabel: Sentiment | null;
};

type ReviewDbRow = {
  id: number;
  row_number: number;
  text: string;
  review_date: string | null;
  rating: number | null;
  product: string | null;
  language: string;
  language_status: LanguageStatus;
  status: ReviewStatus;
  status_note: string | null;
  sentiment: Sentiment | null;
  confidence: Confidence | null;
  confidence_reasons: ReasonCode[];
  topics: string[];
  model_output: Record<string, unknown> | null;
  reference_label: Sentiment | null;
};

export const REVIEW_COLUMNS = `r.id, r.row_number, r.text, to_char(r.review_date, 'YYYY-MM-DD') as review_date,
  r.rating::float8 as rating, r.product, r.language, r.language_status, r.status, r.status_note, r.sentiment,
  r.confidence, r.confidence_reasons, r.topics, r.model_output, r.reference_label`;

export function toReview(row: ReviewDbRow): ReviewRow {
  return {
    id: row.id,
    rowNumber: row.row_number,
    text: row.text,
    reviewDate: row.review_date,
    rating: row.rating,
    product: row.product,
    language: row.language,
    languageStatus: row.language_status,
    status: row.status,
    statusNote: row.status_note,
    sentiment: row.sentiment,
    confidence: row.confidence,
    confidenceReasons: row.confidence_reasons ?? [],
    topics: row.topics ?? [],
    modelOutput: row.model_output,
    referenceLabel: row.reference_label,
  };
}

export async function queryReviews(db: Db, sql: string, params: unknown[]): Promise<ReviewRow[]> {
  return (await db.query<ReviewDbRow>(sql, params)).map(toReview);
}

export type ReviewPage = { rows: ReviewRow[]; total: number; page: number; pageCount: number; pageSize: number };

export async function searchReviews(
  db: Db,
  uploadId: string,
  filters: ReviewFilters,
  page: number,
  pageSize = 25,
): Promise<ReviewPage> {
  const { sql, params } = buildWhere(uploadId, filters);
  const [{ n: total }] = await db.query<{ n: number }>(`select count(*)::int as n from reviews r where ${sql}`, params);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const rows = await queryReviews(
    db,
    `select ${REVIEW_COLUMNS} from reviews r where ${sql}
     order by r.row_number limit $${params.length + 1} offset $${params.length + 2}`,
    [...params, pageSize, (current - 1) * pageSize],
  );
  return { rows, total, page: current, pageCount, pageSize };
}

export async function getReview(db: Db, uploadId: string, reviewId: number): Promise<ReviewRow | null> {
  if (!isUploadId(uploadId) || !Number.isInteger(reviewId)) return null;
  const [row] = await queryReviews(
    db,
    `select ${REVIEW_COLUMNS} from reviews r where r.upload_id = $1::uuid and r.id = $2`,
    [uploadId, reviewId],
  );
  return row ?? null;
}

export type FilterOptions = {
  products: { name: string; count: number }[];
  minDate: string | null;
  maxDate: string | null;
  minRating: number | null;
  maxRating: number | null;
  /** True when some reviews have a label to check against, so the label-check filter is useful. */
  hasLabelCheck: boolean;
};

export async function getFilterOptions(db: Db, uploadId: string): Promise<FilterOptions> {
  const [range] = await db.query<{
    min_date: string | null;
    max_date: string | null;
    min_rating: number | null;
    max_rating: number | null;
    has_label_check: boolean;
  }>(
    `select to_char(min(review_date), 'YYYY-MM-DD') as min_date, to_char(max(review_date), 'YYYY-MM-DD') as max_date,
       min(rating)::float8 as min_rating, max(rating)::float8 as max_rating,
       coalesce(bool_or(reference_label is not null), false) as has_label_check
     from reviews where upload_id = $1::uuid`,
    [uploadId],
  );
  const products = await db.query<{ name: string; count: number }>(
    `select product as name, count(*)::int as count from reviews
     where upload_id = $1::uuid and product is not null
     group by product order by count(*) desc, product limit 200`,
    [uploadId],
  );
  return {
    products,
    minDate: range.min_date,
    maxDate: range.max_date,
    minRating: range.min_rating,
    maxRating: range.max_rating,
    hasLabelCheck: range.has_label_check,
  };
}

export type IssueRow = {
  id: number;
  rowNumber: number | null;
  stage: "import" | "analysis";
  severity: IssueSeverity;
  code: string;
  message: string;
};

export type IssuePage = {
  rows: IssueRow[];
  total: number;
  page: number;
  pageCount: number;
  errors: number;
  warnings: number;
};

export async function listIssues(
  db: Db,
  uploadId: string,
  page: number,
  severity: IssueSeverity | null = null,
  pageSize = 50,
): Promise<IssuePage> {
  const [counts] = await db.query<{ errors: number; warnings: number }>(
    `select count(*) filter (where severity = 'error')::int as errors,
       count(*) filter (where severity = 'warning')::int as warnings
     from upload_issues where upload_id = $1::uuid`,
    [uploadId],
  );
  const total = severity === "error" ? counts.errors : severity === "warning" ? counts.warnings : counts.errors + counts.warnings;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const rows = await db.query<{
    id: number;
    row_number: number | null;
    stage: "import" | "analysis";
    severity: IssueSeverity;
    code: string;
    message: string;
  }>(
    `select id, row_number, stage, severity, code, message from upload_issues
     where upload_id = $1::uuid and ($2::text is null or severity = $2::text)
     order by severity, row_number nulls last, id
     limit $3 offset $4`,
    [uploadId, severity, pageSize, (current - 1) * pageSize],
  );
  return {
    rows: rows.map((r) => ({ id: r.id, rowNumber: r.row_number, stage: r.stage, severity: r.severity, code: r.code, message: r.message })),
    total,
    page: current,
    pageCount,
    errors: counts.errors,
    warnings: counts.warnings,
  };
}
