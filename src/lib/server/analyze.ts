import { computeConfidence, ratingPosition } from "@/lib/analysis/confidence";
import { extractKeywords } from "@/lib/analysis/keywords";
import { providerLanguages } from "@/lib/analysis/providers/languages";
import { ProviderError, type SentimentProvider } from "@/lib/analysis/providers/types";
import { detectTopics } from "@/lib/analysis/topics";
import { LIMITS } from "@/lib/limits";
import type { LanguageStatus } from "@/lib/types";
import type { Db } from "./db-types";
import { AppError, notFound } from "./errors";
import { getProgress, getUpload, type Progress } from "./uploads";

export type BatchResult = {
  processed: number;
  /** Set when this batch failed and its reviews were put back for another try (or marked failed). */
  batchError: string | null;
  /** Set when the provider asked to wait (a per-minute limit); the reviews were put back unchanged. */
  retryAfterMs: number | null;
  progress: Progress;
};

type ClaimedRow = {
  id: number;
  row_number: number;
  text: string;
  rating: number | null;
  language: string;
  language_status: LanguageStatus;
  attempts: number;
};

const ids = (rows: { id: number }[]) => JSON.stringify(rows.map((r) => r.id));
const ID_LIST = `(select (jsonb_array_elements_text($2::text::jsonb))::int)`;

async function progressOf(db: Db, uploadId: string): Promise<Progress> {
  const progress = await getProgress(db, uploadId);
  if (!progress) throw notFound();
  return progress;
}

/** Marks the upload done once no review is waiting or being analyzed. */
async function finishIfComplete(db: Db, uploadId: string): Promise<void> {
  await db.query(
    `update uploads u
     set status = case
         when exists (select 1 from reviews r where r.upload_id = u.id and r.status = 'failed')
           or exists (select 1 from upload_issues i where i.upload_id = u.id and i.severity = 'error')
         then 'done_with_issues' else 'done' end,
       completed_at = now()
     where u.id = $1::uuid and u.status = 'analyzing'
       and not exists (select 1 from reviews r where r.upload_id = u.id and r.status in ('pending', 'processing'))`,
    [uploadId],
  );
}

/** Ends the import step and starts analysis. */
export async function startAnalysis(db: Db, uploadId: string): Promise<Progress> {
  const upload = await getUpload(db, uploadId);
  if (!upload) throw notFound();
  await db.query(
    `update uploads set status = 'analyzing', last_activity_at = now() where id = $1::uuid and status = 'importing'`,
    [uploadId],
  );
  await finishIfComplete(db, uploadId);
  return progressOf(db, uploadId);
}

/** Puts a failed batch back in the queue, or marks reviews failed once they have used every attempt. */
async function releaseOrFail(db: Db, uploadId: string, rows: ClaimedRow[], reason: string): Promise<void> {
  const failed = await db.query<{ row_number: number }>(
    `update reviews
     set status = case when attempts >= $3 then 'failed' else 'pending' end,
       status_note = case when attempts >= $3 then $4 else status_note end,
       claimed_at = null
     where upload_id = $1::uuid and id in ${ID_LIST}
     returning row_number, status`,
    [uploadId, ids(rows), LIMITS.maxAttempts, reason],
  );
  const newlyFailed = (failed as { row_number: number; status?: string }[]).filter((r) => r.status === "failed");
  if (!newlyFailed.length) return;
  await db.query(
    `insert into upload_issues (upload_id, row_number, stage, severity, code, message)
     select $1::uuid, f.row_number, 'analysis', 'error', 'ANALYSIS_FAILED', f.message
     from jsonb_to_recordset($2::text::jsonb) as f(row_number int, message text)
     on conflict do nothing`,
    [
      uploadId,
      JSON.stringify(
        newlyFailed.map((r) => ({
          row_number: r.row_number,
          message: `Row ${r.row_number} couldn't be analyzed after ${LIMITS.maxAttempts} tries. ${reason}`,
        })),
      ),
    ],
  );
}

/**
 * Claims the next batch of pending reviews, labels them with the provider and saves the results.
 * A failing batch never stops the upload: its reviews are retried, then marked failed with a reason.
 */
export async function analyzeNextBatch(
  db: Db,
  provider: SentimentProvider,
  uploadId: string,
  batchSize: number = LIMITS.batchSize,
): Promise<BatchResult> {
  const upload = await getUpload(db, uploadId);
  if (!upload) throw notFound();
  if (upload.status === "importing") {
    throw new AppError("STILL_IMPORTING", "Finish importing the file before analysis starts.", 409);
  }
  if (upload.status !== "analyzing") {
    return { processed: 0, batchError: null, retryAfterMs: null, progress: await progressOf(db, uploadId) };
  }
  if (upload.provider !== provider.id || upload.model !== provider.model) {
    throw new AppError(
      "PROVIDER_CHANGED",
      `This upload was started with ${upload.provider} (${upload.model}), but the server now uses ${provider.label}. ` +
        "Switch the setting back, or upload the file again.",
      409,
    );
  }

  const claimed = await db.query<ClaimedRow>(
    `with picked as (
       select id from reviews
       where upload_id = $1::uuid
         and (status = 'pending' or (status = 'processing' and claimed_at < now() - make_interval(mins => $3)))
       order by row_number
       limit $2
       for update skip locked
     )
     update reviews r
     set status = 'processing', claimed_at = now(), attempts = r.attempts + 1
     from picked where r.id = picked.id
     returning r.id, r.row_number, r.text, r.rating::float8 as rating, r.language, r.language_status, r.attempts`,
    [uploadId, batchSize, LIMITS.staleClaimMinutes],
  );

  let batchError: string | null = null;
  let retryAfterMs: number | null = null;
  let putBack = 0;
  const unsupportedMixed = claimed.filter((r) => r.language_status === "mixed" && !provider.supportsMixedLanguage);
  const toAnalyze = claimed.filter((r) => !unsupportedMixed.includes(r));

  if (unsupportedMixed.length) {
    await db.query(
      `update reviews set status = 'not_labeled', claimed_at = null,
         status_note = 'This review mixes languages. Basic mode labels English reviews only.'
       where upload_id = $1::uuid and id in ${ID_LIST}`,
      [uploadId, ids(unsupportedMixed)],
    );
    await db.query(
      `insert into upload_issues (upload_id, row_number, stage, severity, code, message)
       select $1::uuid, m.row_number, 'analysis', 'warning', 'LANGUAGE_MIXED',
         'Row ' || m.row_number || ' mixes languages, so Basic mode left it unlabeled.'
       from jsonb_to_recordset($2::text::jsonb) as m(row_number int)
       on conflict do nothing`,
      [uploadId, JSON.stringify(unsupportedMixed.map((r) => ({ row_number: r.row_number })))],
    );
  }

  if (toAnalyze.length) {
    try {
      const results = await provider.analyze(toAnalyze.map((r) => ({ id: r.id, text: r.text })));
      const byId = new Map(results.map((r) => [r.id, r]));
      const mode = provider.id === "basic" ? "basic" : provider.id === "gemini" ? "ai" : "mock";
      const languages = providerLanguages(provider.id);
      const labeled = toAnalyze.flatMap((row) => {
        const result = byId.get(row.id);
        if (!result) return [];
        // A mix of languages the provider reads (Taglish in AI mode) is not a reason for doubt.
        const readsMix = row.language_status === "mixed" && languages.includes(row.language);
        const confidence = computeConfidence({
          mode,
          sentiment: result.sentiment,
          certainty: result.certainty,
          mixedOpinion: result.mixedOpinion,
          mixedLanguage: result.mixedLanguage,
          wordCount: row.text.split(/\s+/).filter(Boolean).length,
          languageStatus: readsMix ? "supported" : row.language_status,
          ratingPosition: ratingPosition(row.rating, upload.ratingScale),
        });
        return [
          {
            id: row.id,
            sentiment: result.sentiment,
            confidence: confidence.level,
            confidence_reasons: confidence.reasons,
            topics: result.topics ?? detectTopics(row.text),
            keywords: extractKeywords(row.text),
            model_output: result.output,
          },
        ];
      });
      if (labeled.length) {
        await db.query(
          `update reviews r
           set status = 'labeled', sentiment = v.sentiment, confidence = v.confidence,
             confidence_reasons = v.confidence_reasons, topics = v.topics, keywords = v.keywords,
             model_output = v.model_output, status_note = null, claimed_at = null, processed_at = now()
           from jsonb_to_recordset($2::text::jsonb) as v(id int, sentiment text, confidence text,
             confidence_reasons text[], topics text[], keywords text[], model_output jsonb)
           where r.id = v.id and r.upload_id = $1::uuid`,
          [uploadId, JSON.stringify(labeled)],
        );
      }
      const missing = toAnalyze.filter((r) => !byId.has(r.id));
      if (missing.length) {
        batchError = "Some reviews in this batch got no answer. They will be retried.";
        await releaseOrFail(db, uploadId, missing, batchError);
      }
    } catch (error) {
      // Stopping (a bad key, a used-up daily quota) or waiting (a per-minute limit) puts the reviews
      // back unchanged, so it doesn't count against their attempts.
      if (error instanceof ProviderError && (!error.retryable || error.retryAfterMs !== undefined)) {
        await db.query(
          `update reviews set status = 'pending', claimed_at = null, attempts = greatest(attempts - 1, 0)
           where upload_id = $1::uuid and id in ${ID_LIST}`,
          [uploadId, ids(toAnalyze)],
        );
        if (!error.retryable) throw error;
        batchError = error.message;
        retryAfterMs = error.retryAfterMs ?? null;
        putBack = toAnalyze.length;
      } else {
        if (!(error instanceof ProviderError)) {
          // Log the cause without any review text.
          console.error("[analyze] unexpected batch error", { uploadId, message: (error as Error)?.message });
        }
        batchError = error instanceof ProviderError ? error.message : "This batch couldn't be analyzed. It will be retried.";
        await releaseOrFail(db, uploadId, toAnalyze, batchError);
      }
    }
  }

  await db.query(`update uploads set last_activity_at = now() where id = $1::uuid`, [uploadId]);
  await finishIfComplete(db, uploadId);
  return { processed: claimed.length - putBack, batchError, retryAfterMs, progress: await progressOf(db, uploadId) };
}

/** Puts failed reviews back in the queue so they can be analyzed again. */
export async function retryFailed(db: Db, uploadId: string): Promise<Progress> {
  const upload = await getUpload(db, uploadId);
  if (!upload) throw notFound();
  await db.transaction(async (tx) => {
    const reset = await tx.query(
      `update reviews set status = 'pending', attempts = 0, status_note = null, claimed_at = null
       where upload_id = $1::uuid and status = 'failed'
       returning id`,
      [uploadId],
    );
    if (!reset.length) return;
    await tx.query(`delete from upload_issues where upload_id = $1::uuid and code = 'ANALYSIS_FAILED'`, [uploadId]);
    await tx.query(
      `update uploads set status = 'analyzing', completed_at = null, last_activity_at = now() where id = $1::uuid`,
      [uploadId],
    );
  });
  return progressOf(db, uploadId);
}
