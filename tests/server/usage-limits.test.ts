import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GeminiProvider } from "@/lib/analysis/providers/gemini";
import { MockProvider } from "@/lib/analysis/providers/mock";
import { analyzeNextBatch, startAnalysis } from "@/lib/server/analyze";
import type { Db } from "@/lib/server/db-types";
import { ingestRows } from "@/lib/server/ingest";
import { LIMIT_DEFAULTS, type Limits } from "@/lib/server/limits";
import { createUploadForUser, deleteUpload, getProgress } from "@/lib/server/uploads";
import { fakeGemini } from "../helpers/gemini";
import { createTestDb, newOwner } from "../helpers/pglite";

const INPUT = {
  name: "Limits",
  fileName: "limits.csv",
  columnMap: { text: "Review", date: null, rating: null, product: null },
  dateFormat: null,
  ratingScale: null,
  totalRows: 60,
};
const ROWS = Array.from({ length: 60 }, (_, i) => ({ rowNumber: i + 2, text: `The kettle number ${i} works fine` }));

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});

afterAll(() => close());

describe("upload limits", () => {
  const mock = new MockProvider();

  it("caps how many uploads an account can start in a day, even after deleting some", async () => {
    const owner = newOwner();
    const limits: Limits = { ...LIMIT_DEFAULTS, uploadsPerDay: 3 };
    for (let i = 0; i < 3; i++) {
      const upload = await createUploadForUser(db, INPUT, mock, owner, limits);
      expect(await deleteUpload(db, owner, upload.id)).toBe(true);
    }
    await expect(createUploadForUser(db, INPUT, mock, owner, limits)).rejects.toMatchObject({
      code: "UPLOAD_LIMIT_DAY",
      status: 429,
      message: expect.stringMatching(/up to 3 uploads a day/),
    });
    // Another account has its own allowance.
    await expect(createUploadForUser(db, INPUT, mock, newOwner(), limits)).resolves.toMatchObject({ name: "Limits" });
  });

  it("caps how many uploads an account can keep", async () => {
    const owner = newOwner();
    const limits: Limits = { ...LIMIT_DEFAULTS, maxStoredUploads: 2 };
    const first = await createUploadForUser(db, INPUT, mock, owner, limits);
    await createUploadForUser(db, INPUT, mock, owner, limits);
    await expect(createUploadForUser(db, INPUT, mock, owner, limits)).rejects.toMatchObject({
      code: "UPLOAD_LIMIT_STORED",
      status: 409,
    });
    await deleteUpload(db, owner, first.id);
    await expect(createUploadForUser(db, INPUT, mock, owner, limits)).resolves.toBeTruthy();
  });
});

describe("AI analysis limits", () => {
  const gemini = () =>
    new GeminiProvider({ apiKey: "test-key", model: "gemini-3.5-flash-lite", fetch: fakeGemini().fetch });

  async function readyUpload(owner: string, provider: GeminiProvider | MockProvider) {
    const upload = await createUploadForUser(db, INPUT, provider, owner, LIMIT_DEFAULTS);
    await ingestRows(db, upload, ROWS);
    await startAnalysis(db, owner, upload.id);
    return upload;
  }

  it("stops an account at its daily limit, using up the rest with a partial batch", async () => {
    const owner = newOwner();
    const provider = gemini();
    const limits: Limits = { ...LIMIT_DEFAULTS, aiReviewsPerUserPerDay: 30 };
    const upload = await readyUpload(owner, provider);

    expect((await analyzeNextBatch(db, provider, owner, upload.id, 25, limits)).progress.labeled).toBe(25);
    const second = await analyzeNextBatch(db, provider, owner, upload.id, 25, limits);
    expect(second.progress).toMatchObject({ labeled: 30, processing: 0, pending: 30 });
    await expect(analyzeNextBatch(db, provider, owner, upload.id, 25, limits)).rejects.toMatchObject({
      code: "AI_DAILY_LIMIT",
      retryable: false,
      message: expect.stringMatching(/30 reviews/),
    });
    expect(await getProgress(db, owner, upload.id)).toMatchObject({ labeled: 30, processing: 0, pending: 30, failed: 0 });
  });

  it("stops everyone at the app's daily limit", async () => {
    const limits: Limits = { ...LIMIT_DEFAULTS, aiReviewsPerUserPerDay: 100, aiReviewsPerDay: 30 };
    const provider = gemini();
    const alice = newOwner();
    const bob = newOwner();
    const first = await readyUpload(alice, provider);
    const second = await readyUpload(bob, provider);
    // These earlier tests ran on the same day, so give this app limit its own counter.
    await db.query(`delete from usage_counters where scope = 'ai_reviews' and subject = 'all'`);

    expect((await analyzeNextBatch(db, provider, alice, first.id, 25, limits)).progress.labeled).toBe(25);
    expect((await analyzeNextBatch(db, provider, bob, second.id, 25, limits)).progress.labeled).toBe(5);
    await expect(analyzeNextBatch(db, provider, bob, second.id, 25, limits)).rejects.toMatchObject({
      code: "AI_DAILY_LIMIT",
      message: expect.stringMatching(/shared/),
    });
    // Bob's account wasn't charged for reviews the app limit turned away.
    expect(
      await db.query(`select used from usage_counters where scope = 'ai_reviews' and subject = $1`, [bob]),
    ).toEqual([{ used: 5 }]);
  });

  it("never counts Basic mode against the AI limits", async () => {
    const owner = newOwner();
    const mock = new MockProvider();
    const upload = await readyUpload(owner, mock);
    await analyzeNextBatch(db, mock, owner, upload.id, 25, { ...LIMIT_DEFAULTS, aiReviewsPerUserPerDay: 1 });
    expect(await db.query(`select * from usage_counters where scope = 'ai_reviews' and subject = $1`, [owner])).toEqual([]);
  });
});
