import { sentimentFromRating } from "@/lib/analysis/confidence";
import { detectLanguage } from "@/lib/analysis/language";
import { providerLanguages } from "@/lib/analysis/providers/languages";
import { prepareRow } from "@/lib/csv/prepare";
import type { RawRow, ReviewStatus, RowIssue } from "@/lib/types";
import type { Db } from "./db-types";
import { AppError } from "./errors";
import type { UploadRecord } from "./uploads";

export type IngestResult = {
  accepted: number;
  skipped: number;
  warnings: number;
  /** Rows already stored by an earlier request (for example, a retried chunk). */
  duplicates: number;
  notLabeled: number;
  /** The first 50 row messages from this chunk, for live display. */
  issues: RowIssue[];
};

type NewReview = {
  row_number: number;
  text: string;
  review_date: string | null;
  rating: number | null;
  product: string | null;
  language: string;
  language_status: string;
  status: ReviewStatus;
  status_note: string | null;
  reference_label: string | null;
};

/** Cleans a chunk of mapped CSV rows and stores them as pending reviews. Safe to call twice with the same rows. */
export async function ingestRows(db: Db, upload: UploadRecord, rows: RawRow[]): Promise<IngestResult> {
  if (upload.status !== "importing") {
    throw new AppError("UPLOAD_NOT_IMPORTING", "This upload has finished importing and can't take more rows.", 409);
  }
  const outOfRange = rows.find((r) => r.rowNumber < 2 || r.rowNumber > upload.totalRows + 1);
  if (outOfRange) {
    throw new AppError(
      "ROW_OUT_OF_RANGE",
      `Row ${outOfRange.rowNumber} is outside this file's ${upload.totalRows} rows.`,
      400,
    );
  }

  const issues: RowIssue[] = [];
  const reviews: NewReview[] = [];
  const readsTagalog = providerLanguages(upload.provider).includes("tgl");
  // The label check uses the person's own labels when the file has them, and the stars otherwise.
  const hasLabelColumn = Boolean(upload.columnMap.label);
  for (const raw of rows) {
    const prepared = prepareRow(raw, { dateFormat: upload.dateFormat, ratingScale: upload.ratingScale });
    issues.push(...prepared.issues);
    if (!prepared.text) continue;

    const language = detectLanguage(prepared.text, { tagalog: readsTagalog });
    const unsupported = language.status === "unsupported";
    if (unsupported) {
      issues.push({
        rowNumber: raw.rowNumber,
        severity: "warning",
        code: "LANGUAGE_UNSUPPORTED",
        message: `Row ${raw.rowNumber} looks like ${language.name}, which isn't supported yet, so it wasn't labeled.`,
      });
    }
    reviews.push({
      row_number: raw.rowNumber,
      text: prepared.text,
      review_date: prepared.reviewDate,
      rating: prepared.rating,
      product: prepared.product,
      language: language.code,
      language_status: language.status,
      status: unsupported ? "not_labeled" : "pending",
      status_note: unsupported ? `Language not supported yet (detected: ${language.name}).` : null,
      reference_label: hasLabelColumn ? prepared.referenceLabel : sentimentFromRating(prepared.rating, upload.ratingScale),
    });
  }

  const inserted = await db.transaction(async (tx) => {
    const added = reviews.length
      ? await tx.query<{ row_number: number; status: ReviewStatus }>(
          `insert into reviews (upload_id, row_number, text, review_date, rating, product, language,
             language_status, status, status_note, reference_label)
           select $1::uuid, r.row_number, r.text, r.review_date, r.rating, r.product, r.language,
             r.language_status, r.status, r.status_note, r.reference_label
           from jsonb_to_recordset($2::text::jsonb) as r(row_number int, text text, review_date date, rating numeric,
             product text, language text, language_status text, status text, status_note text, reference_label text)
           on conflict (upload_id, row_number) do nothing
           returning row_number, status`,
          [upload.id, JSON.stringify(reviews)],
        )
      : [];
    if (issues.length) {
      await tx.query(
        `insert into upload_issues (upload_id, row_number, stage, severity, code, message)
         select $1::uuid, i.row_number, 'import', i.severity, i.code, i.message
         from jsonb_to_recordset($2::text::jsonb) as i(row_number int, severity text, code text, message text)
         on conflict do nothing`,
        [
          upload.id,
          JSON.stringify(
            issues.map((i) => ({ row_number: i.rowNumber, severity: i.severity, code: i.code, message: i.message })),
          ),
        ],
      );
    }
    await tx.query(`update uploads set last_activity_at = now() where id = $1::uuid`, [upload.id]);
    return added;
  });

  return {
    accepted: inserted.length,
    skipped: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
    duplicates: reviews.length - inserted.length,
    notLabeled: inserted.filter((r) => r.status === "not_labeled").length,
    issues: issues.slice(0, 50),
  };
}
