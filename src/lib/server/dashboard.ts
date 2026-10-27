import { rankKeywords, type KeywordCount, type KeywordsBySentiment } from "@/lib/analysis/keywords";
import { TOPICS, type TopicId } from "@/lib/analysis/topics";
import type { Confidence, Sentiment } from "@/lib/types";
import type { Db } from "./db-types";
import { buildWhere, type ReviewFilters } from "./filters";
import { queryReviews, REVIEW_COLUMNS, type ReviewRow } from "./reviews";
import type { UploadRecord } from "./uploads";

export type TrendPoint = { period: string; positive: number; neutral: number; negative: number; total: number };
export type Trend =
  | { status: "ok"; grain: "day" | "week" | "month"; points: TrendPoint[] }
  | { status: "unavailable"; reason: string };

export type TopicBreakdown = { id: TopicId; label: string; total: number } & Record<Sentiment, number>;

export type Dashboard = {
  totals: {
    all: number;
    labeled: number;
    notLabeled: number;
    failed: number;
    pending: number;
    unsupportedLanguage: number;
    mixedLanguage: number;
  };
  sentiment: Record<Sentiment, number>;
  confidence: Record<Confidence, number>;
  averageRating: number | null;
  trend: Trend;
  topics: TopicBreakdown[];
  keywords: KeywordsBySentiment;
  readFirst: ReviewRow[];
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
    },
    sentiment,
    confidence: { high: summary.high, medium: summary.medium, low: summary.low },
    averageRating: summary.average_rating,
    trend: await getTrend(db, upload, sql, params),
    topics,
    keywords: rankKeywords(keywordRows, sentiment),
    readFirst,
  };
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
