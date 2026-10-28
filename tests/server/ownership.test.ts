import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MockProvider } from "@/lib/analysis/providers/mock";
import { analyzeNextBatch, retryFailed, startAnalysis } from "@/lib/server/analyze";
import type { Db } from "@/lib/server/db-types";
import { EMPTY_FILTERS } from "@/lib/server/filters";
import { ingestRows } from "@/lib/server/ingest";
import { getFilterOptions, getReview, listIssues, searchReviews } from "@/lib/server/reviews";
import { createUpload, deleteUpload, getOwnedUpload, getProgress, listUploads, type OwnedUpload } from "@/lib/server/uploads";
import { createTestDb, newOwner } from "../helpers/pglite";

const mock = new MockProvider();
const INPUT = {
  name: "Mine",
  fileName: "mine.csv",
  columnMap: { text: "Review", date: null, rating: null, product: null },
  dateFormat: null,
  ratingScale: null,
  totalRows: 3,
};

let db: Db;
let close: () => Promise<void>;
const alice = newOwner();
const bob = newOwner();
let upload: OwnedUpload;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  upload = await createUpload(db, INPUT, mock, alice);
  await ingestRows(db, upload, [
    { rowNumber: 2, text: "I love it" },
    { rowNumber: 3, text: "Terrible, it broke" },
    { rowNumber: 4, text: "" },
  ]);
  await startAnalysis(db, alice, upload.id);
  await analyzeNextBatch(db, mock, alice, upload.id);
});

afterAll(() => close());

describe("upload ownership", () => {
  it("lets the owner see and use their upload", async () => {
    const scope = { uploadId: upload.id, ownerId: alice };
    expect((await getOwnedUpload(db, alice, upload.id))?.ownerId).toBe(alice);
    expect((await listUploads(db, alice)).map((u) => u.id)).toEqual([upload.id]);
    expect((await searchReviews(db, scope, EMPTY_FILTERS, 1)).total).toBe(2);
    expect((await listIssues(db, scope, 1)).total).toBe(1);
    expect(await getProgress(db, alice, upload.id)).toMatchObject({ labeled: 2 });
  });

  it("keeps another user out of every lookup and action", async () => {
    const scope = { uploadId: upload.id, ownerId: bob };
    const [review] = (await searchReviews(db, { uploadId: upload.id, ownerId: alice }, EMPTY_FILTERS, 1)).rows;
    expect(await getOwnedUpload(db, bob, upload.id)).toBeNull();
    expect(await listUploads(db, bob)).toEqual([]);
    expect(await getProgress(db, bob, upload.id)).toBeNull();
    expect((await searchReviews(db, scope, EMPTY_FILTERS, 1)).total).toBe(0);
    expect(await getReview(db, scope, review.id)).toBeNull();
    expect((await listIssues(db, scope, 1)).total).toBe(0);
    expect(await getFilterOptions(db, scope)).toMatchObject({ products: [], minRating: null });
    await expect(startAnalysis(db, bob, upload.id)).rejects.toMatchObject({ status: 404 });
    await expect(analyzeNextBatch(db, mock, bob, upload.id)).rejects.toMatchObject({ status: 404 });
    await expect(retryFailed(db, bob, upload.id)).rejects.toMatchObject({ status: 404 });
    expect(await deleteUpload(db, bob, upload.id)).toBe(false);
    expect(await getOwnedUpload(db, alice, upload.id)).not.toBeNull();
  });

  it("lists each upload with its mode and its labeled, not-labeled and failed counts", async () => {
    const carol = newOwner();
    const mixed = await createUpload(db, { ...INPUT, totalRows: 3 }, mock, carol);
    await ingestRows(db, mixed, [
      { rowNumber: 2, text: "I love it" },
      { rowNumber: 3, text: "El producto llegó tarde y la caja estaba rota, pero el vendedor fue muy amable." },
      { rowNumber: 4, text: "Terrible, it broke" },
    ]);
    await startAnalysis(db, carol, mixed.id);
    await analyzeNextBatch(db, mock, carol, mixed.id);
    await db.query(`update reviews set status = 'failed', sentiment = null, confidence = null where upload_id = $1::uuid and row_number = 4`, [
      mixed.id,
    ]);
    expect(await listUploads(db, carol)).toEqual([
      expect.objectContaining({ id: mixed.id, provider: "mock", labeled: 1, notLabeled: 1, failed: 1 }),
    ]);
  });

  it("hides uploads without an owner from everyone", async () => {
    const [legacy] = await db.query<{ id: string }>(
      `insert into uploads (name, file_name, column_map, provider, model, topic_version, total_rows)
       values ('Old', 'old.csv', '{"text":"Review"}', 'basic', 'vader', 'v1', 1) returning id`,
    );
    for (const owner of [alice, bob]) {
      expect(await getOwnedUpload(db, owner, legacy.id)).toBeNull();
      expect((await listUploads(db, owner)).map((u) => u.id)).not.toContain(legacy.id);
      expect(await getProgress(db, owner, legacy.id)).toBeNull();
      expect(await deleteUpload(db, owner, legacy.id)).toBe(false);
    }
    expect(await db.query(`select count(*)::int as n from uploads where id = $1::uuid`, [legacy.id])).toEqual([{ n: 1 }]);
  });
});
