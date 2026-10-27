import { AI_TOPIC_VERSION, TOPIC_VERSION } from "@/lib/analysis/topics";
import { LIMITS } from "@/lib/limits";
import type { ColumnMap, DateFormat, RatingScale, Sentiment, UploadStatus } from "@/lib/types";
import type { Db } from "./db-types";
import { AppError } from "./errors";

export type CreateUploadInput = {
  name: string;
  fileName: string;
  columnMap: ColumnMap;
  dateFormat: DateFormat | null;
  ratingScale: RatingScale | null;
  totalRows: number;
};

export type UploadRecord = {
  id: string;
  name: string;
  fileName: string;
  status: UploadStatus;
  columnMap: ColumnMap;
  hasDate: boolean;
  hasRating: boolean;
  hasProduct: boolean;
  dateFormat: DateFormat | null;
  ratingScale: RatingScale | null;
  provider: string;
  model: string;
  topicVersion: string;
  totalRows: number;
  createdAt: Date;
  lastActivityAt: Date;
  completedAt: Date | null;
};

export type Progress = {
  uploadId: string;
  status: UploadStatus;
  totalRows: number;
  imported: number;
  pending: number;
  processing: number;
  labeled: number;
  notLabeled: number;
  failed: number;
  /** Rows skipped during import (for example, no review text). */
  skipped: number;
  warnings: number;
  done: boolean;
  /** Analysis stopped part-way, usually because the browser tab was closed. */
  paused: boolean;
};

export type UploadListItem = UploadRecord & { labeled: number; sentiment: Record<Sentiment, number> };

type UploadRow = {
  id: string;
  name: string;
  file_name: string;
  status: UploadStatus;
  column_map: ColumnMap;
  has_date: boolean;
  has_rating: boolean;
  has_product: boolean;
  date_format: DateFormat | null;
  rating_scale: number | null;
  provider: string;
  model: string;
  topic_version: string;
  total_rows: number;
  created_at: Date;
  last_activity_at: Date;
  completed_at: Date | null;
};

const COLUMNS = `id, name, file_name, status, column_map, has_date, has_rating, has_product, date_format,
  rating_scale, provider, model, topic_version, total_rows, created_at, last_activity_at, completed_at`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUploadId(value: string): boolean {
  return UUID.test(value);
}

function toUpload(row: UploadRow): UploadRecord {
  return {
    id: row.id,
    name: row.name,
    fileName: row.file_name,
    status: row.status,
    columnMap: row.column_map,
    hasDate: row.has_date,
    hasRating: row.has_rating,
    hasProduct: row.has_product,
    dateFormat: row.date_format,
    ratingScale: row.rating_scale as RatingScale | null,
    provider: row.provider,
    model: row.model,
    topicVersion: row.topic_version,
    totalRows: row.total_rows,
    createdAt: new Date(row.created_at),
    lastActivityAt: new Date(row.last_activity_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
  };
}

/**
 * Review text only leaves the server for a provider like Gemini's free tier after the person
 * uploading accepted the data notice. An upload's provider is fixed when it is created, so
 * checking here covers every review it will ever send.
 */
export function checkDataNotice(provider: { external: boolean }, dataNotice: string | undefined): void {
  if (provider.external && dataNotice !== "accepted") {
    throw new AppError(
      "DATA_NOTICE_REQUIRED",
      "Before review text is sent to Google's Gemini free tier, accept the data notice on the upload page.",
      400,
    );
  }
}

export async function createUpload(
  db: Db,
  input: CreateUploadInput,
  provider: { id: string; model: string },
): Promise<UploadRecord> {
  const [row] = await db.query<UploadRow>(
    `insert into uploads (name, file_name, column_map, has_date, has_rating, has_product, date_format,
       rating_scale, provider, model, topic_version, total_rows)
     values ($1, $2, $3::text::jsonb, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     returning ${COLUMNS}`,
    [
      input.name,
      input.fileName,
      JSON.stringify(input.columnMap),
      input.columnMap.date !== null,
      input.columnMap.rating !== null,
      input.columnMap.product !== null,
      input.columnMap.date ? input.dateFormat : null,
      input.columnMap.rating ? input.ratingScale : null,
      provider.id,
      provider.model,
      provider.id === "gemini" ? AI_TOPIC_VERSION : TOPIC_VERSION,
      input.totalRows,
    ],
  );
  return toUpload(row);
}

export async function getUpload(db: Db, id: string): Promise<UploadRecord | null> {
  if (!isUploadId(id)) return null;
  const [row] = await db.query<UploadRow>(`select ${COLUMNS} from uploads where id = $1::uuid`, [id]);
  return row ? toUpload(row) : null;
}

export async function listUploads(db: Db): Promise<UploadListItem[]> {
  const rows = await db.query<UploadRow & { labeled: number; positive: number; neutral: number; negative: number }>(
    `select u.id, u.name, u.file_name, u.status, u.column_map, u.has_date, u.has_rating, u.has_product,
       u.date_format, u.rating_scale, u.provider, u.model, u.topic_version, u.total_rows, u.created_at,
       u.last_activity_at, u.completed_at,
       count(r.id) filter (where r.status = 'labeled')::int as labeled,
       count(r.id) filter (where r.status = 'labeled' and r.sentiment = 'positive')::int as positive,
       count(r.id) filter (where r.status = 'labeled' and r.sentiment = 'neutral')::int as neutral,
       count(r.id) filter (where r.status = 'labeled' and r.sentiment = 'negative')::int as negative
     from uploads u
     left join reviews r on r.upload_id = u.id
     group by u.id
     order by u.created_at desc
     limit 100`,
  );
  return rows.map((row) => ({
    ...toUpload(row),
    labeled: row.labeled,
    sentiment: { positive: row.positive, neutral: row.neutral, negative: row.negative },
  }));
}

export async function deleteUpload(db: Db, id: string): Promise<boolean> {
  if (!isUploadId(id)) return false;
  const rows = await db.query(`delete from uploads where id = $1::uuid returning id`, [id]);
  return rows.length > 0;
}

export async function getProgress(db: Db, id: string): Promise<Progress | null> {
  if (!isUploadId(id)) return null;
  const [row] = await db.query<{
    status: UploadStatus;
    total_rows: number;
    stale: boolean;
    imported: number;
    pending: number;
    processing: number;
    labeled: number;
    not_labeled: number;
    failed: number;
    skipped: number;
    warnings: number;
  }>(
    `select u.status, u.total_rows,
       (u.last_activity_at < now() - make_interval(mins => $2)) as stale,
       count(r.id)::int as imported,
       count(r.id) filter (where r.status = 'pending')::int as pending,
       count(r.id) filter (where r.status = 'processing')::int as processing,
       count(r.id) filter (where r.status = 'labeled')::int as labeled,
       count(r.id) filter (where r.status = 'not_labeled')::int as not_labeled,
       count(r.id) filter (where r.status = 'failed')::int as failed,
       (select count(*)::int from upload_issues i
         where i.upload_id = u.id and i.stage = 'import' and i.severity = 'error') as skipped,
       (select count(*)::int from upload_issues i where i.upload_id = u.id and i.severity = 'warning') as warnings
     from uploads u
     left join reviews r on r.upload_id = u.id
     where u.id = $1::uuid
     group by u.id`,
    [id, LIMITS.staleClaimMinutes],
  );
  if (!row) return null;
  const done = row.status === "done" || row.status === "done_with_issues" || row.status === "failed";
  return {
    uploadId: id,
    status: row.status,
    totalRows: row.total_rows,
    imported: row.imported,
    pending: row.pending,
    processing: row.processing,
    labeled: row.labeled,
    notLabeled: row.not_labeled,
    failed: row.failed,
    skipped: row.skipped,
    warnings: row.warnings,
    done,
    paused: row.status === "analyzing" && row.stale && row.pending + row.processing > 0,
  };
}
