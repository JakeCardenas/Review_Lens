import { isTopicId, type TopicId } from "@/lib/analysis/topics";
import { CONFIDENCE_LEVELS, SENTIMENTS, type Confidence, type Sentiment } from "@/lib/types";

export const LIST_STATUSES = ["labeled", "not_labeled", "failed", "pending"] as const;
export type ListStatus = (typeof LIST_STATUSES)[number];

/** "mixed" keeps reviews that contain both praise and complaints. */
const OPINIONS = ["mixed"] as const;
export type OpinionFilter = (typeof OPINIONS)[number];

/** Whether ReviewLens's label matches the label it is checked against. */
const CHECKS = ["agree", "disagree"] as const;
export type CheckFilter = (typeof CHECKS)[number];

export type ReviewFilters = {
  from: string | null;
  to: string | null;
  product: string | null;
  ratingMin: number | null;
  ratingMax: number | null;
  sentiment: Sentiment | null;
  topic: TopicId | null;
  confidence: Confidence | null;
  status: ListStatus | null;
  opinion: OpinionFilter | null;
  check: CheckFilter | null;
  q: string | null;
};

export const EMPTY_FILTERS: ReviewFilters = {
  from: null,
  to: null,
  product: null,
  ratingMin: null,
  ratingMax: null,
  sentiment: null,
  topic: null,
  confidence: null,
  status: null,
  opinion: null,
  check: null,
  q: null,
};

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function first(source: ParamSource, key: string): string | null {
  const value = source instanceof URLSearchParams ? source.get(key) : source[key];
  const single = Array.isArray(value) ? value[0] : value;
  const trimmed = single?.trim();
  return trimmed ? trimmed : null;
}

function isoDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ? null : value;
}

function rating(value: string | null): number | null {
  if (!value || !/^\d+(\.\d+)?$/.test(value)) return null;
  const n = Number(value);
  return n >= 0 && n <= 100 ? n : null;
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function text(value: string | null): string | null {
  return value ? value.slice(0, 200) : null;
}

/** Reads filters from URL search params. Invalid values are ignored rather than rejected. */
export function parseFilters(source: ParamSource): ReviewFilters {
  const topic = first(source, "topic");
  return {
    from: isoDate(first(source, "from")),
    to: isoDate(first(source, "to")),
    product: text(first(source, "product")),
    ratingMin: rating(first(source, "rating_min")),
    ratingMax: rating(first(source, "rating_max")),
    sentiment: oneOf(first(source, "sentiment"), SENTIMENTS),
    topic: topic && isTopicId(topic) ? topic : null,
    confidence: oneOf(first(source, "confidence"), CONFIDENCE_LEVELS),
    status: oneOf(first(source, "status"), LIST_STATUSES),
    opinion: oneOf(first(source, "opinion"), OPINIONS),
    check: oneOf(first(source, "check"), CHECKS),
    q: text(first(source, "q")),
  };
}

/** Only the filters the dashboard applies: date, product and rating. */
export function dashboardFilters(filters: ReviewFilters): ReviewFilters {
  return {
    ...EMPTY_FILTERS,
    from: filters.from,
    to: filters.to,
    product: filters.product,
    ratingMin: filters.ratingMin,
    ratingMax: filters.ratingMax,
  };
}

const QUERY_KEYS: Record<keyof ReviewFilters, string> = {
  from: "from",
  to: "to",
  product: "product",
  ratingMin: "rating_min",
  ratingMax: "rating_max",
  sentiment: "sentiment",
  topic: "topic",
  confidence: "confidence",
  status: "status",
  opinion: "opinion",
  check: "check",
  q: "q",
};

/** Turns filters back into a query string (without the leading "?"). */
export function filtersToQuery(filters: Partial<ReviewFilters>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters) as [keyof ReviewFilters, unknown][]) {
    if (value !== null && value !== undefined && value !== "") params.set(QUERY_KEYS[key], String(value));
  }
  return params.toString();
}

export function hasActiveFilters(filters: ReviewFilters): boolean {
  return Object.values(filters).some((v) => v !== null);
}

/** SQL conditions for reviews aliased as `r`. Parameter $1 is always the upload id. */
export function buildWhere(uploadId: string, filters: ReviewFilters): { sql: string; params: unknown[] } {
  const params: unknown[] = [uploadId];
  const conditions = ["r.upload_id = $1::uuid"];
  const add = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  if (filters.from) conditions.push(`r.review_date >= ${add(filters.from)}::date`);
  if (filters.to) conditions.push(`r.review_date <= ${add(filters.to)}::date`);
  if (filters.product) conditions.push(`r.product = ${add(filters.product)}`);
  if (filters.ratingMin !== null) conditions.push(`r.rating >= ${add(filters.ratingMin)}`);
  if (filters.ratingMax !== null) conditions.push(`r.rating <= ${add(filters.ratingMax)}`);
  if (filters.sentiment) conditions.push(`r.sentiment = ${add(filters.sentiment)}`);
  if (filters.topic) conditions.push(`${add(filters.topic)} = any(r.topics)`);
  if (filters.confidence) conditions.push(`r.confidence = ${add(filters.confidence)}`);
  if (filters.status) conditions.push(`r.status = ${add(filters.status)}`);
  if (filters.opinion === "mixed") conditions.push(`'mixed_opinion' = any(r.confidence_reasons)`);
  // Reviews without a label to check against drop out of both, because comparing with null is never true.
  if (filters.check === "agree") conditions.push(`r.status = 'labeled' and r.sentiment = r.reference_label`);
  if (filters.check === "disagree") conditions.push(`r.status = 'labeled' and r.sentiment <> r.reference_label`);
  if (filters.q) {
    const query = add(filters.q);
    const pattern = add(`%${filters.q.replace(/[\\%_]/g, "\\$&")}%`);
    conditions.push(`(r.search @@ websearch_to_tsquery('english', ${query}) or r.text ilike ${pattern} escape '\\')`);
  }
  return { sql: conditions.join(" and "), params };
}
