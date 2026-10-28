import { REASON_TEXT, STAR_RULES } from "@/lib/analysis/confidence";
import { topicLabel } from "@/lib/analysis/topics";
import { providerLabel } from "@/lib/provider-label";
import { CONFIDENCE_LEVELS, SENTIMENTS, type Sentiment } from "@/lib/types";
import type { Dashboard, LabelCheck } from "./dashboard";
import type { Db } from "./db-types";
import { buildWhere, type ReviewFilters } from "./filters";
import { queryReviews, REVIEW_COLUMNS } from "./reviews";
import type { UploadRecord } from "./uploads";

/**
 * One CSV cell. Text that a spreadsheet would run as a formula (starting with = + - @ or a
 * tab) gets a leading apostrophe; cells with commas, quotes or line breaks are quoted.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let text = Array.isArray(value) ? value.join("; ") : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) || /^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvLine(values: unknown[]): string {
  return `${values.map(csvCell).join(",")}\r\n`;
}

const REVIEW_HEADER = [
  "row_number",
  "review_text",
  "review_date",
  "rating",
  "product",
  "sentiment",
  "reference_label",
  "confidence",
  "confidence_reasons",
  "topics",
  "language_status",
  "status",
  "note",
];

/** Yields the labeled dataset as CSV lines, reading 1,000 reviews at a time. */
export async function* reviewCsvLines(db: Db, uploadId: string, filters: ReviewFilters): AsyncGenerator<string> {
  yield csvLine(REVIEW_HEADER);
  const { sql, params } = buildWhere(uploadId, filters);
  let after = 0;
  for (;;) {
    const rows = await queryReviews(
      db,
      `select ${REVIEW_COLUMNS} from reviews r where ${sql} and r.row_number > $${params.length + 1}
       order by r.row_number limit 1000`,
      [...params, after],
    );
    for (const r of rows) {
      yield csvLine([
        r.rowNumber,
        r.text,
        r.reviewDate,
        r.rating,
        r.product,
        r.sentiment,
        r.referenceLabel,
        r.confidence,
        r.confidenceReasons.map((code) => REASON_TEXT[code] ?? code).join(" "),
        r.topics.map(topicLabel),
        r.languageStatus,
        r.status,
        r.statusNote,
      ]);
    }
    if (rows.length < 1000) return;
    after = rows[rows.length - 1].rowNumber;
  }
}

const SENTIMENT_NAMES: Record<Sentiment, string> = { positive: "Positive", neutral: "Neutral", negative: "Negative" };

export function describeFilters(filters: ReviewFilters): string {
  const parts: string[] = [];
  if (filters.from || filters.to) parts.push(`Dates ${filters.from ?? "start"} to ${filters.to ?? "end"}`);
  if (filters.product) parts.push(`Product: ${filters.product}`);
  if (filters.ratingMin !== null || filters.ratingMax !== null) {
    parts.push(`Rating ${filters.ratingMin ?? "any"} to ${filters.ratingMax ?? "any"}`);
  }
  if (filters.sentiment) parts.push(`Sentiment: ${filters.sentiment}`);
  if (filters.topic) parts.push(`Topic: ${topicLabel(filters.topic)}`);
  if (filters.confidence) parts.push(`Confidence: ${filters.confidence}`);
  if (filters.status) parts.push(`Status: ${filters.status}`);
  if (filters.opinion === "mixed") parts.push("Opinion: mixed praise and complaints");
  if (filters.check) parts.push(filters.check === "agree" ? "Label check: matches" : "Label check: disagreements");
  if (filters.q) parts.push(`Search: ${filters.q}`);
  return parts.length ? parts.join("; ") : "None";
}

const percent = (part: number, whole: number) => (whole ? `${((part / whole) * 100).toFixed(1)}%` : "0.0%");

const CONFIDENCE_NAMES = { high: "High", medium: "Medium", low: "Low" } as const;

function labelCheckLines(upload: UploadRecord, check: LabelCheck): unknown[][] {
  const yours = check.source === "label";
  return [
    [],
    ["Label check"],
    [
      "Compared with",
      yours ? `Your labels (column "${upload.columnMap.label}")` : `Star ratings (${STAR_RULES[upload.ratingScale ?? 5]})`,
    ],
    ["Reviews compared", check.total],
    ["Labels that match", check.agree, percent(check.agree, check.total)],
    [],
    [yours ? "Your label" : "Stars suggest", ...SENTIMENTS.map((s) => `ReviewLens: ${SENTIMENT_NAMES[s]}`)],
    ...SENTIMENTS.map((s) => [SENTIMENT_NAMES[s], ...SENTIMENTS.map((app) => check.matrix[s][app])]),
    [],
    ["Confidence", "Reviews compared", "Labels that match", "Share that match"],
    ...CONFIDENCE_LEVELS.map((level) => {
      const { total, agree } = check.byConfidence[level];
      return [CONFIDENCE_NAMES[level], total, agree, percent(agree, total)];
    }),
    ["Note", "This shows how often ReviewLens agrees with these labels. It is not proof that ReviewLens is accurate."],
  ];
}

/** A summary report as CSV: totals, sentiment shares, confidence, topics, keywords and trend. */
export function summaryCsv(upload: UploadRecord, dashboard: Dashboard, filters: ReviewFilters): string {
  const lines: unknown[][] = [
    ["ReviewLens summary report"],
    ["Upload", upload.name],
    ["File", upload.fileName],
    ["Analyzed with", providerLabel(upload.provider, upload.model)],
    ["Uploaded at", upload.createdAt.toISOString()],
    ["Filters", describeFilters(filters)],
    [],
    ["Totals"],
    ["Reviews imported", dashboard.totals.all],
    ["Reviews labeled", dashboard.totals.labeled],
    ["Not labeled (language)", dashboard.totals.notLabeled],
    ["Failed", dashboard.totals.failed],
    ["Average rating", dashboard.averageRating === null ? "n/a" : Number(dashboard.averageRating.toFixed(2))],
    [],
    ["Sentiment", "Reviews", "Share of labeled"],
    ...SENTIMENTS.map((s) => [SENTIMENT_NAMES[s], dashboard.sentiment[s], percent(dashboard.sentiment[s], dashboard.totals.labeled)]),
    [],
    ["Confidence", "Reviews"],
    ["High", dashboard.confidence.high],
    ["Medium", dashboard.confidence.medium],
    ["Low", dashboard.confidence.low],
    ...(dashboard.check ? labelCheckLines(upload, dashboard.check) : []),
    [],
    ["Topic", "Mentions", "Positive", "Neutral", "Negative"],
    ...dashboard.topics.map((t) => [t.label, t.total, t.positive, t.neutral, t.negative]),
    [],
    ["Sentiment", "Keyword or phrase", "Reviews"],
    ...SENTIMENTS.flatMap((s) => dashboard.keywords[s].map((k) => [SENTIMENT_NAMES[s], k.term, k.count])),
  ];
  if (dashboard.trend.status === "ok") {
    lines.push([], [`Period (${dashboard.trend.grain})`, "Positive", "Neutral", "Negative", "Total"]);
    for (const p of dashboard.trend.points) lines.push([p.period, p.positive, p.neutral, p.negative, p.total]);
  }
  return lines.map((values) => csvLine(values)).join("");
}
