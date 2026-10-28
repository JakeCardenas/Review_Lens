import type { AgreementMatrix, CheckExclusions } from "@/lib/analysis/agreement";
import { rankKeywords, type KeywordCount, type KeywordsBySentiment } from "@/lib/analysis/keywords";
import { TOPICS, type TopicId } from "@/lib/analysis/topics";
import type { Confidence, LabelCheckSource, Sentiment } from "@/lib/types";
import type { Db } from "./db-types";
import { buildWhere, type ReviewFilters } from "./filters";
import { RATING_LABEL_SQL } from "./label-check-sql";
import { queryReviews, REVIEW_COLUMNS, type ReviewRow } from "./reviews";
import type { UploadRecord } from "./uploads";

export type TrendPoint = { period: string; positive: number; neutral: number; negative: number; total: number };
export type Trend =
  | { status: "ok"; grain: "day" | "week" | "month"; points: TrendPoint[] }
  | { status: "unavailable"; reason: string };

export type TopicBreakdown = { id: TopicId; label: string; total: number } & Record<Sentiment, number>;

/**
 * How often ReviewLens's label matches the person's own label ("label") or, without a label
 * column, the label each rating suggests ("rating", only a rough proxy).
 */
export type LabelCheck = {
  source: LabelCheckSource;
  /** Labeled reviews that have something valid to compare with. */
  eligible: number;
  agree: number;
  matrix: AgreementMatrix;
  byConfidence: Record<Confidence, { total: number; agree: number }>;
  excluded: CheckExclusions;
  /** The first few disagreements, most confident first. */
  disagreements: ReviewRow[];
};

export type Dashboard = {
  totals: {
    all: number;
    labeled: number;
    notLabeled: number;
    failed: number;
    pending: number;
    unsupportedLanguage: number;
    mixedLanguage: number;
    /** Labeled reviews that contain both praise and complaints. */
    mixedOpinion: number;
  };
  sentiment: Record<Sentiment, number>;
  confidence: Record<Confidence, number>;
  averageRating: number | null;
  trend: Trend;
  topics: TopicBreakdown[];
  keywords: KeywordsBySentiment;
  readFirst: ReviewRow[];
  /** Null when the upload has neither a label column nor ratings. */
  check: LabelCheck | null;
};

/** Fewer dated reviews than this and the timeline would mislead more than it helps. */
const MIN_DATED_REVIEWS = 10;

export async function getDashboard(db: Db, upload: UploadRecord, filters: ReviewFilters): Promise<Dashboard> {
  const { sql, params } = buildWhere(upload.id, filters);

  const [summary] = await db.query<{
    all: number;
    labeled: number;
    not_labeled: number;
    failed: number;
    pending: number;
    unsupported_language: number;
    mixed_language: number;
    mixed_opinion: number;
    positive: number;
    neutral: number;
    negative: number;
    high: number;
    medium: number;
    low: number;
    average_rating: number | null;
  }>(
    `select count(*)::int as all,
       count(*) filter (where r.status = 'labeled')::int as labeled,
       count(*) filter (where r.status = 'not_labeled')::int as not_labeled,
       count(*) filter (where r.status = 'failed')::int as failed,
       count(*) filter (where r.status in ('pending', 'processing'))::int as pending,
       count(*) filter (where r.status = 'not_labeled' and r.language_status = 'unsupported')::int as unsupported_language,
       count(*) filter (where r.language_status = 'mixed')::int as mixed_language,
       count(*) filter (where r.status = 'labeled' and 'mixed_opinion' = any(r.confidence_reasons))::int as mixed_opinion,
       count(*) filter (where r.status = 'labeled' and r.sentiment = 'positive')::int as positive,
       count(*) filter (where r.status = 'labeled' and r.sentiment = 'neutral')::int as neutral,
       count(*) filter (where r.status = 'labeled' and r.sentiment = 'negative')::int as negative,
       count(*) filter (where r.status = 'labeled' and r.confidence = 'high')::int as high,
       count(*) filter (where r.status = 'labeled' and r.confidence = 'medium')::int as medium,
       count(*) filter (where r.status = 'labeled' and r.confidence = 'low')::int as low,
       avg(r.rating)::float8 as average_rating
     from reviews r where ${sql}`,
    params,
  );
  const sentiment = { positive: summary.positive, neutral: summary.neutral, negative: summary.negative };

  const topicRows = await db.query<{ topic: string; sentiment: Sentiment; n: number }>(
    `select t as topic, r.sentiment, count(*)::int as n
     from reviews r cross join lateral unnest(r.topics) as t
     where ${sql} and r.status = 'labeled'
     group by t, r.sentiment`,
    params,
  );
  const topics = TOPICS.map((topic) => {
    const row: TopicBreakdown = { id: topic.id, label: topic.label, total: 0, positive: 0, neutral: 0, negative: 0 };
    for (const t of topicRows) {
      if (t.topic !== topic.id) continue;
      row[t.sentiment] += t.n;
      row.total += t.n;
    }
    return row;
  })
    .filter((t) => t.total > 0)
    .sort((a, b) => b.total - a.total);

  const keywordRows = await db.query<KeywordCount>(
    `select r.sentiment, k as term, count(*)::int as n
     from reviews r cross join lateral unnest(r.keywords) as k
     where ${sql} and r.status = 'labeled'
     group by r.sentiment, k
     having count(*) >= 2`,
    params,
  );

  const readFirst = await queryReviews(
    db,
    `select ${REVIEW_COLUMNS} from reviews r
     where ${sql} and r.status = 'labeled' and r.sentiment = 'negative'
     order by (r.confidence = 'high') desc, r.review_date desc nulls last, r.row_number
     limit 5`,
    params,
  );

  return {
    totals: {
      all: summary.all,
      labeled: summary.labeled,
      notLabeled: summary.not_labeled,
      failed: summary.failed,
      pending: summary.pending,
      unsupportedLanguage: summary.unsupported_language,
      mixedLanguage: summary.mixed_language,
      mixedOpinion: summary.mixed_opinion,
    },
    sentiment,
    confidence: { high: summary.high, medium: summary.medium, low: summary.low },
    averageRating: summary.average_rating,
    trend: await getTrend(db, upload, sql, params),
    topics,
    keywords: rankKeywords(keywordRows, sentiment),
    readFirst,
    check: await getLabelCheck(db, upload, sql, params),
  };
}

/** Your own labels when the upload has a label column; otherwise its ratings, if it has any. */
export function labelCheckSource(upload: UploadRecord): LabelCheckSource | null {
  if (upload.columnMap.label) return "label";
  return upload.hasRating ? "rating" : null;
}

/** Issue codes that mean a label or rating was there but couldn't be read. */
const UNREADABLE_CODES: Record<LabelCheckSource, string> = {
  label: "'LABEL_UNREADABLE'",
  rating: "'RATING_UNREADABLE', 'RATING_OUT_OF_RANGE'",
};

async function getLabelCheck(db: Db, upload: UploadRecord, sql: string, params: unknown[]): Promise<LabelCheck | null> {
  const source = labelCheckSource(upload);
  if (!source) return null;
  // Ratings are compared at read time, so their label is never stored as if a person gave it.
  const reference = source === "label" ? "r.reference_label" : RATING_LABEL_SQL;

  const rows = await db.query<{ reference: Sentiment; sentiment: Sentiment; confidence: Confidence | null; n: number }>(
    `select x.reference, r.sentiment, r.confidence, count(*)::int as n
     from reviews r cross join lateral (select ${reference} as reference) x
     where ${sql} and r.status = 'labeled' and x.reference is not null
     group by 1, 2, 3`,
    params,
  );
  const [left] = await db.query<{ missing: number; invalid: number; not_labeled: number; failed: number; pending: number }>(
    `select count(*) filter (where x.reference is null and not x.unreadable)::int as missing,
       count(*) filter (where x.reference is null and x.unreadable)::int as invalid,
       count(*) filter (where x.reference is not null and r.status = 'not_labeled')::int as not_labeled,
       count(*) filter (where x.reference is not null and r.status = 'failed')::int as failed,
       count(*) filter (where x.reference is not null and r.status in ('pending', 'processing'))::int as pending
     from reviews r
     cross join lateral (
       select ${reference} as reference,
         exists (select 1 from upload_issues i where i.upload_id = r.upload_id and i.row_number = r.row_number
           and i.code in (${UNREADABLE_CODES[source]})) as unreadable
     ) x
     where ${sql}`,
    params,
  );
  const disagreements = await queryReviews(
    db,
    `select ${REVIEW_COLUMNS} from reviews r cross join lateral (select ${reference} as reference) x
     where ${sql} and r.status = 'labeled' and r.sentiment <> x.reference
     order by case r.confidence when 'high' then 0 when 'medium' then 1 else 2 end, r.row_number
     limit 5`,
    params,
  );

  const bySentiment = () => ({ positive: 0, neutral: 0, negative: 0 });
  const check: LabelCheck = {
    source,
    eligible: 0,
    agree: 0,
    matrix: { positive: bySentiment(), neutral: bySentiment(), negative: bySentiment() },
    byConfidence: { high: { total: 0, agree: 0 }, medium: { total: 0, agree: 0 }, low: { total: 0, agree: 0 } },
    excluded: {
      missing: left.missing,
      invalid: left.invalid,
      notLabeled: left.not_labeled,
      failed: left.failed,
      pending: left.pending,
    },
    disagreements,
  };
  for (const row of rows) {
    const agree = row.reference === row.sentiment ? row.n : 0;
    check.eligible += row.n;
    check.agree += agree;
    check.matrix[row.reference][row.sentiment] += row.n;
    if (row.confidence) {
      check.byConfidence[row.confidence].total += row.n;
      check.byConfidence[row.confidence].agree += agree;
    }
  }
  return check;
}

async function getTrend(db: Db, upload: UploadRecord, sql: string, params: unknown[]): Promise<Trend> {
  if (!upload.hasDate) {
    return { status: "unavailable", reason: "No date column was mapped for this upload, so there is no timeline." };
  }
  const [range] = await db.query<{ min: string | null; max: string | null; n: number }>(
    `select to_char(min(r.review_date), 'YYYY-MM-DD') as min, to_char(max(r.review_date), 'YYYY-MM-DD') as max,
       count(*)::int as n
     from reviews r where ${sql} and r.status = 'labeled' and r.review_date is not null`,
    params,
  );
  if (range.n < MIN_DATED_REVIEWS || !range.min || !range.max) {
    return {
      status: "unavailable",
      reason:
        range.n === 0
          ? "None of the labeled reviews has a usable date."
          : `Only ${range.n} labeled ${range.n === 1 ? "review has" : "reviews have"} a usable date. A timeline needs at least ${MIN_DATED_REVIEWS}.`,
    };
  }
  const spanDays = (Date.parse(range.max) - Date.parse(range.min)) / 86_400_000;
  const grain = spanDays <= 31 ? "day" : spanDays <= 182 ? "week" : "month";
  const rows = await db.query<{ period: string; sentiment: Sentiment; n: number }>(
    `select to_char(date_trunc($${params.length + 1}, r.review_date::timestamp), 'YYYY-MM-DD') as period,
       r.sentiment, count(*)::int as n
     from reviews r where ${sql} and r.status = 'labeled' and r.review_date is not null
     group by 1, 2 order by 1`,
    [...params, grain],
  );
  const byPeriod = new Map<string, TrendPoint>();
  for (const row of rows) {
    const point = byPeriod.get(row.period) ?? { period: row.period, positive: 0, neutral: 0, negative: 0, total: 0 };
    point[row.sentiment] += row.n;
    point.total += row.n;
    byPeriod.set(row.period, point);
  }
  const points = [...byPeriod.values()];
  if (points.length < 2) {
    return { status: "unavailable", reason: `All dated reviews fall in the same ${grain}, so there is no change to show.` };
  }
  return { status: "ok", grain, points };
}
