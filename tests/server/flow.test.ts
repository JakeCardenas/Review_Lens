import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BasicProvider } from "@/lib/analysis/providers/basic";
import { MockProvider } from "@/lib/analysis/providers/mock";
import { ProviderError, type SentimentProvider } from "@/lib/analysis/providers/types";
import { analyzeNextBatch, retryFailed, startAnalysis } from "@/lib/server/analyze";
import type { Db } from "@/lib/server/db-types";
import { ingestRows } from "@/lib/server/ingest";
import { createUpload, getProgress, getUpload } from "@/lib/server/uploads";
import { createTestDb } from "../helpers/pglite";

let db: Db;
let close: () => Promise<void>;
beforeEach(async () => {
  ({ db, close } = await createTestDb());
});
afterEach(() => close());

const mock = new MockProvider();

function newUpload(totalRows: number, provider: SentimentProvider = mock) {
  return createUpload(
    db,
    {
      name: "Store reviews",
      fileName: "reviews.csv",
      columnMap: { text: "Review", date: "Date", rating: "Stars", product: "Product" },
      dateFormat: "ymd",
      ratingScale: 5,
      totalRows,
    },
    provider,
  );
}

async function count(sql: string): Promise<number> {
  const [row] = await db.query<{ n: number }>(`select count(*)::int as n from ${sql}`);
  return row.n;
}

class FlakyProvider extends MockProvider {
  async analyze(): Promise<never> {
    throw new ProviderError("The AI provider didn't respond.", true);
  }
}

describe("ingestRows", () => {
  it("stores cleaned, masked rows and records row problems", async () => {
    const upload = await newUpload(3);
    const result = await ingestRows(db, upload, [
      { rowNumber: 2, text: "Love it! Email me at jane@example.com", date: "2026-01-05", rating: "5", product: "Kettle" },
      { rowNumber: 3, text: "   " },
      { rowNumber: 4, text: "El producto llegó tarde y la caja estaba rota, estoy muy decepcionado." },
    ]);
    expect(result).toMatchObject({ accepted: 2, skipped: 1, duplicates: 0 });

    const rows = await db.query("select row_number, text, status, status_note from reviews order by row_number");
    expect(rows).toEqual([
      { row_number: 2, text: "Love it! Email me at [email]", status: "pending", status_note: null },
      {
        row_number: 4,
        text: expect.stringContaining("El producto"),
        status: "not_labeled",
        status_note: "Language not supported yet (detected: Spanish).",
      },
    ]);
    const issues = await db.query("select code, row_number from upload_issues order by row_number");
    expect(issues).toEqual([
      { code: "EMPTY_TEXT", row_number: 3 },
      { code: "LANGUAGE_UNSUPPORTED", row_number: 4 },
    ]);
  });

  it("ignores a chunk that is sent twice", async () => {
    const upload = await newUpload(2);
    const rows = [
      { rowNumber: 2, text: "Great kettle" },
      { rowNumber: 3, text: "Late delivery" },
    ];
    await ingestRows(db, upload, rows);
    const again = await ingestRows(db, upload, rows);
    expect(again).toMatchObject({ accepted: 0, duplicates: 2 });
    expect(await count("reviews")).toBe(2);
  });

  it("rejects row numbers beyond the declared file size", async () => {
    const upload = await newUpload(2);
    await expect(ingestRows(db, upload, [{ rowNumber: 10, text: "Hello there" }])).rejects.toMatchObject({
      code: "ROW_OUT_OF_RANGE",
      status: 400,
    });
  });

  it("rejects rows once analysis has started", async () => {
    const upload = await newUpload(1);
    await ingestRows(db, upload, [{ rowNumber: 2, text: "Great kettle" }]);
    await startAnalysis(db, upload.id);
    const started = (await getUpload(db, upload.id))!;
    await expect(ingestRows(db, started, [{ rowNumber: 2, text: "Great kettle" }])).rejects.toMatchObject({
      code: "UPLOAD_NOT_IMPORTING",
      status: 409,
    });
  });
});

describe("analyzeNextBatch", () => {
  it("labels pending reviews 25 at a time and finishes the upload", async () => {
    const upload = await newUpload(30);
    await ingestRows(
      db,
      upload,
      Array.from({ length: 30 }, (_, i) => ({
        rowNumber: i + 2,
        text: i % 2 ? "I love this kettle, great value" : "Terrible, it broke and delivery was late",
      })),
    );
    await startAnalysis(db, upload.id);

    const first = await analyzeNextBatch(db, mock, upload.id);
    expect(first.processed).toBe(25);
    expect(first.progress.done).toBe(false);

    const second = await analyzeNextBatch(db, mock, upload.id);
    expect(second.processed).toBe(5);
    expect(second.progress).toMatchObject({ done: true, status: "done", labeled: 30 });

    const [row] = await db.query<{ sentiment: string; confidence: string; topics: string[]; keywords: string[] }>(
      "select sentiment, confidence, topics, keywords from reviews where row_number = 2",
    );
    expect(row).toMatchObject({ sentiment: "negative", confidence: "high", topics: ["delivery", "quality"] });
    expect(row.keywords).toContain("terrible");
  });

  it("retries a failing provider, then marks the rows failed with a reason", async () => {
    const flaky = new FlakyProvider();
    const upload = await newUpload(2, flaky);
    await ingestRows(db, upload, [
      { rowNumber: 2, text: "Great kettle" },
      { rowNumber: 3, text: "Late delivery" },
    ]);
    await startAnalysis(db, upload.id);
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await analyzeNextBatch(db, flaky, upload.id);
      expect(result.batchError).toMatch(/didn't respond/);
    }
    expect(await getProgress(db, upload.id)).toMatchObject({ failed: 2, done: true, status: "done_with_issues" });
    expect(await count("upload_issues where code = 'ANALYSIS_FAILED'")).toBe(2);

    const retried = await retryFailed(db, upload.id);
    expect(retried).toMatchObject({ failed: 0, pending: 2, status: "analyzing" });
    expect(await count("upload_issues where code = 'ANALYSIS_FAILED'")).toBe(0);
  });

  it("does not use up attempts when the provider is misconfigured", async () => {
    const broken = new (class extends MockProvider {
      async analyze(): Promise<never> {
        throw new ProviderError("Check ANTHROPIC_API_KEY.", false);
      }
    })();
    const upload = await newUpload(1, broken);
    await ingestRows(db, upload, [{ rowNumber: 2, text: "Great kettle" }]);
    await startAnalysis(db, upload.id);
    await expect(analyzeNextBatch(db, broken, upload.id)).rejects.toMatchObject({ retryable: false });
    expect(await db.query("select status, attempts from reviews")).toEqual([{ status: "pending", attempts: 0 }]);
  });

  it("leaves mixed-language reviews unlabeled in Basic mode", async () => {
    const basic = new BasicProvider();
    const upload = await newUpload(1, basic);
    await ingestRows(db, upload, [{ rowNumber: 2, text: "Great product pero mabagal ang delivery at sira ang kahon pagdating." }]);
    await startAnalysis(db, upload.id);
    await analyzeNextBatch(db, basic, upload.id);
    const [row] = await db.query<{ status: string; status_note: string }>("select status, status_note from reviews");
    expect(row.status).toBe("not_labeled");
    expect(row.status_note).toMatch(/mixes languages/i);
    expect(await count("upload_issues where code = 'LANGUAGE_MIXED'")).toBe(1);
  });

  it("refuses to mix results from a different provider", async () => {
    const upload = await newUpload(1);
    await ingestRows(db, upload, [{ rowNumber: 2, text: "Great kettle" }]);
    await startAnalysis(db, upload.id);
    await expect(analyzeNextBatch(db, new BasicProvider(), upload.id)).rejects.toMatchObject({
      code: "PROVIDER_CHANGED",
      status: 409,
    });
  });
});
