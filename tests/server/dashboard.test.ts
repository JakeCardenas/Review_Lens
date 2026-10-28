import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MockProvider } from "@/lib/analysis/providers/mock";
import { analyzeNextBatch, startAnalysis } from "@/lib/server/analyze";
import { getDashboard } from "@/lib/server/dashboard";
import type { Db } from "@/lib/server/db-types";
import { EMPTY_FILTERS } from "@/lib/server/filters";
import { ingestRows } from "@/lib/server/ingest";
import { getFilterOptions, listIssues, searchReviews } from "@/lib/server/reviews";
import { createUpload, type UploadRecord } from "@/lib/server/uploads";
import { sentimentFromRating } from "@/lib/analysis/confidence";
import { CONFIDENCE_LEVELS, type RatingScale } from "@/lib/types";
import { createTestDb } from "../helpers/pglite";

const mock = new MockProvider();
const TEXT = {
  negative: "Terrible, it broke and the delivery was late",
  positive: "I love this kettle, great value for the price",
  neutral: "The kettle is white and holds one litre",
};

let db: Db;
let close: () => Promise<void>;
let upload: UploadRecord;
let undated: UploadRecord;

async function analyzeAll(id: string) {
  await startAnalysis(db, id);
  for (let i = 0; i < 10; i++) {
    const { progress } = await analyzeNextBatch(db, mock, id);
    if (progress.done) return;
  }
}

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  upload = await createUpload(
    db,
    {
      name: "Q1 reviews",
      fileName: "q1.csv",
      columnMap: { text: "Review", date: "Date", rating: "Stars", product: "Product" },
      dateFormat: "ymd",
      ratingScale: 5,
      totalRows: 40,
    },
    mock,
  );
  await ingestRows(
    db,
    upload,
    Array.from({ length: 40 }, (_, i) => {
      const sentiment = i % 3 === 0 ? "negative" : i % 3 === 1 ? "positive" : "neutral";
      const month = String(1 + (i % 4)).padStart(2, "0");
      const day = String(1 + (i % 20)).padStart(2, "0");
      return {
        rowNumber: i + 2,
        text: TEXT[sentiment],
        date: `2026-${month}-${day}`,
        rating: sentiment === "negative" ? "1" : sentiment === "positive" ? "5" : "3",
        product: i % 2 ? "Kettle" : "Toaster",
      };
    }),
  );
  await analyzeAll(upload.id);

  undated = await createUpload(
    db,
    {
      name: "No dates",
      fileName: "nodates.csv",
      columnMap: { text: "Review", date: null, rating: null, product: null },
      dateFormat: null,
      ratingScale: null,
      totalRows: 3,
    },
    mock,
  );
  await ingestRows(db, undated, [
    { rowNumber: 2, text: TEXT.positive },
    { rowNumber: 3, text: TEXT.negative },
    { rowNumber: 4, text: TEXT.neutral },
  ]);
  await analyzeAll(undated.id);
});

afterAll(() => close());

describe("getDashboard", () => {
  it("counts labels by sentiment", async () => {
    const dashboard = await getDashboard(db, upload, EMPTY_FILTERS);
    expect(dashboard.totals).toMatchObject({ all: 40, labeled: 40, notLabeled: 0, failed: 0 });
    expect(dashboard.sentiment).toEqual({ positive: 13, neutral: 13, negative: 14 });
    expect(dashboard.averageRating).toBeCloseTo((13 * 5 + 13 * 3 + 14 * 1) / 40, 5);
  });

  it("builds a sentiment trend when dates are usable", async () => {
    const { trend } = await getDashboard(db, upload, EMPTY_FILTERS);
    expect(trend.status).toBe("ok");
    if (trend.status !== "ok") return;
    expect(trend.grain).toBe("week");
    expect(trend.points.length).toBeGreaterThan(2);
    const total = trend.points.reduce((sum, p) => sum + p.total, 0);
    expect(total).toBe(40);
  });

  it("explains why there is no trend without a date column", async () => {
    const { trend } = await getDashboard(db, undated, EMPTY_FILTERS);
    expect(trend).toEqual({ status: "unavailable", reason: expect.stringMatching(/date column/i) });
  });

  it("breaks topics down by sentiment", async () => {
    const { topics } = await getDashboard(db, upload, EMPTY_FILTERS);
    expect(topics.find((t) => t.id === "delivery")).toMatchObject({ total: 14, negative: 14, positive: 0 });
    expect(topics.find((t) => t.id === "price")).toMatchObject({ total: 13, positive: 13 });
  });

  it("lists keywords that set each sentiment apart", async () => {
    const { keywords } = await getDashboard(db, upload, EMPTY_FILTERS);
    expect(keywords.negative.map((k) => k.term)).toEqual(expect.arrayContaining(["terrible", "late"]));
    expect(keywords.positive.map((k) => k.term)).toContain("love");
  });

  it("applies product and rating filters", async () => {
    const byProduct = await getDashboard(db, upload, { ...EMPTY_FILTERS, product: "Kettle" });
    expect(byProduct.totals.labeled).toBe(20);
    const highRated = await getDashboard(db, upload, { ...EMPTY_FILTERS, ratingMin: 4 });
    expect(highRated.sentiment).toEqual({ positive: 13, neutral: 0, negative: 0 });
  });

  it("puts negative, high-confidence reviews first in the read-first list", async () => {
    const { readFirst } = await getDashboard(db, upload, EMPTY_FILTERS);
    expect(readFirst).toHaveLength(5);
    expect(readFirst.every((r) => r.sentiment === "negative")).toBe(true);
  });
});

describe("searchReviews", () => {
  it("pages through all reviews", async () => {
    const page = await searchReviews(db, upload.id, EMPTY_FILTERS, 1);
    expect(page).toMatchObject({ total: 40, page: 1, pageCount: 2 });
    expect(page.rows).toHaveLength(25);
  });

  it("finds reviews by keyword and combines it with filters", async () => {
    expect((await searchReviews(db, upload.id, { ...EMPTY_FILTERS, q: "late" }, 1)).total).toBe(14);
    expect((await searchReviews(db, upload.id, { ...EMPTY_FILTERS, q: "kett" }, 1)).total).toBe(26);
    expect((await searchReviews(db, upload.id, { ...EMPTY_FILTERS, q: "late", product: "Kettle" }, 1)).total).toBe(7);
    expect((await searchReviews(db, upload.id, { ...EMPTY_FILTERS, sentiment: "positive" }, 1)).total).toBe(13);
  });
});

describe("mixed opinions", () => {
  // Like the mock, but flags reviews that turn on "but" as mixing praise and complaints.
  const mixedAware = new (class extends MockProvider {
    async analyze(items: Parameters<MockProvider["analyze"]>[0]) {
      return (await super.analyze(items)).map((r, i) => ({ ...r, mixedOpinion: /\bbut\b/i.test(items[i].text) }));
    }
  })();
  let mixedUpload: UploadRecord;

  beforeAll(async () => {
    mixedUpload = await createUpload(
      db,
      {
        name: "Mixed",
        fileName: "mixed.csv",
        columnMap: { text: "Review", date: null, rating: null, product: null },
        dateFormat: null,
        ratingScale: null,
        totalRows: 4,
      },
      mixedAware,
    );
    await ingestRows(db, mixedUpload, [
      { rowNumber: 2, text: "I love the design but the lid is terrible and leaks" },
      { rowNumber: 3, text: "Great value, but the delivery was late" },
      { rowNumber: 4, text: TEXT.positive },
      { rowNumber: 5, text: TEXT.negative },
    ]);
    await startAnalysis(db, mixedUpload.id);
    await analyzeNextBatch(db, mixedAware, mixedUpload.id);
  });

  it("counts labeled reviews that mix praise and complaints", async () => {
    const dashboard = await getDashboard(db, mixedUpload, EMPTY_FILTERS);
    expect(dashboard.totals).toMatchObject({ labeled: 4, mixedOpinion: 2 });
  });

  it("filters the review list to mixed opinions", async () => {
    const page = await searchReviews(db, mixedUpload.id, { ...EMPTY_FILTERS, opinion: "mixed" }, 1);
    expect(page.total).toBe(2);
    expect(page.rows.map((r) => r.rowNumber)).toEqual([2, 3]);
  });
});

describe("label check", () => {
  const SPANISH = "El producto llegó tarde y la caja estaba rota, pero el vendedor fue muy amable.";
  let handLabeled: UploadRecord;

  beforeAll(async () => {
    handLabeled = await createUpload(
      db,
      {
        name: "Hand labels",
        fileName: "hand.csv",
        columnMap: { text: "Review", date: null, rating: "Stars", product: null, label: "My label" },
        dateFormat: null,
        ratingScale: 5,
        totalRows: 9,
      },
      mock,
    );
    await ingestRows(db, handLabeled, [
      { rowNumber: 2, text: TEXT.positive, rating: "5", label: "positive" },
      { rowNumber: 3, text: TEXT.negative, rating: "1", label: "Negative" },
      { rowNumber: 4, text: TEXT.neutral, rating: "3", label: "positive" },
      { rowNumber: 5, text: TEXT.negative, rating: "1", label: "neutral" },
      { rowNumber: 6, text: TEXT.positive, rating: "5" },
      { rowNumber: 7, text: TEXT.positive, rating: "5", label: "maybe" },
      { rowNumber: 8, text: SPANISH, label: "negative" },
      { rowNumber: 9, text: TEXT.neutral, label: "neutral" },
      { rowNumber: 10, text: TEXT.neutral, label: "neutral" },
    ]);
    await analyzeAll(handLabeled.id);
    await db.query(
      `update reviews set status = case row_number when 9 then 'failed' else 'pending' end,
         sentiment = null, confidence = null, confidence_reasons = '{}'
       where upload_id = $1::uuid and row_number in (9, 10)`,
      [handLabeled.id],
    );
  });

  it("compares the labels with your own and counts what it leaves out", async () => {
    const { check } = await getDashboard(db, handLabeled, EMPTY_FILTERS);
    expect(check).toMatchObject({
      source: "label",
      eligible: 4,
      agree: 2,
      excluded: { missing: 1, invalid: 1, notLabeled: 1, failed: 1, pending: 1 },
    });
    // Rows are your label; columns are ReviewLens's label.
    expect(check?.matrix).toEqual({
      positive: { positive: 1, neutral: 1, negative: 0 },
      neutral: { positive: 0, neutral: 0, negative: 1 },
      negative: { positive: 0, neutral: 0, negative: 1 },
    });
  });

  it("lists the disagreements, most confident first", async () => {
    const { check } = await getDashboard(db, handLabeled, EMPTY_FILTERS);
    expect(check?.disagreements.map((r) => [r.rowNumber, r.referenceLabel, r.sentiment])).toEqual([
      [5, "neutral", "negative"],
      [4, "positive", "neutral"],
    ]);
  });

  it("splits agreement by confidence level", async () => {
    const { check } = await getDashboard(db, handLabeled, EMPTY_FILTERS);
    const { rows } = await searchReviews(db, handLabeled.id, EMPTY_FILTERS, 1);
    for (const level of CONFIDENCE_LEVELS) {
      const atLevel = rows.filter((r) => r.status === "labeled" && r.referenceLabel && r.confidence === level);
      expect(check?.byConfidence[level]).toEqual({
        total: atLevel.length,
        agree: atLevel.filter((r) => r.sentiment === r.referenceLabel).length,
      });
    }
  });

  it("filters the review list to disagreements and matches", async () => {
    const disagree = await searchReviews(db, handLabeled.id, { ...EMPTY_FILTERS, check: "disagree" }, 1);
    expect(disagree.rows.map((r) => [r.rowNumber, r.referenceLabel, r.sentiment])).toEqual([
      [4, "positive", "neutral"],
      [5, "neutral", "negative"],
    ]);
    const agree = await searchReviews(db, handLabeled.id, { ...EMPTY_FILTERS, check: "agree" }, 1);
    expect(agree.rows.map((r) => r.rowNumber)).toEqual([2, 3]);
  });

  it("checks against the ratings instead when there is no label column", async () => {
    const { check } = await getDashboard(db, upload, EMPTY_FILTERS);
    expect(check).toMatchObject({
      source: "rating",
      eligible: 40,
      agree: 40,
      excluded: { missing: 0, invalid: 0, notLabeled: 0, failed: 0, pending: 0 },
    });
  });

  it("leaves reviews without a usable rating out of the rating alignment", async () => {
    const rated = await createUpload(
      db,
      {
        name: "Rated",
        fileName: "rated.csv",
        columnMap: { text: "Review", date: null, rating: "Stars", product: null },
        dateFormat: null,
        ratingScale: 5,
        totalRows: 4,
      },
      mock,
    );
    await ingestRows(db, rated, [
      { rowNumber: 2, text: TEXT.positive, rating: "5" },
      { rowNumber: 3, text: TEXT.positive, rating: "2" },
      { rowNumber: 4, text: TEXT.negative },
      { rowNumber: 5, text: TEXT.negative, rating: "great" },
    ]);
    await analyzeAll(rated.id);
    const { check } = await getDashboard(db, rated, EMPTY_FILTERS);
    expect(check).toMatchObject({ source: "rating", eligible: 2, agree: 1, excluded: { missing: 1, invalid: 1 } });
    const disagree = await searchReviews(db, rated.id, { ...EMPTY_FILTERS, check: "disagree" }, 1);
    expect(disagree.rows.map((r) => [r.rowNumber, r.ratingLabel, r.sentiment])).toEqual([[3, "negative", "positive"]]);
    // A rating is never stored as the person's own label.
    expect(disagree.rows[0].referenceLabel).toBeNull();
  });

  it("works out the rating's label in the database exactly as the app does", async () => {
    const grids: Record<RatingScale, number[]> = {
      5: [0, 1, 1.5, 2, 2.01, 2.02, 2.5, 3, 3.5, 3.97, 3.98, 4, 4.5, 5],
      10: [0, 1, 3, 3.25, 3.26, 4, 7, 7.7, 7.71, 7.75, 8, 10],
      100: [0, 10, 25, 25.49, 25.5, 26, 50, 74, 74.49, 74.5, 75, 100],
    };
    for (const [scale, ratings] of Object.entries(grids)) {
      const ratingScale = Number(scale) as RatingScale;
      const grid = await createUpload(
        db,
        {
          name: `Scale ${scale}`,
          fileName: "grid.csv",
          columnMap: { text: "Review", date: null, rating: "Stars", product: null },
          dateFormat: null,
          ratingScale,
          totalRows: ratings.length,
        },
        mock,
      );
      await ingestRows(
        db,
        grid,
        ratings.map((rating, i) => ({ rowNumber: i + 2, text: TEXT.neutral, rating: String(rating) })),
      );
      const { rows } = await searchReviews(db, grid.id, EMPTY_FILTERS, 1, 100);
      expect(rows.map((r) => [r.rating, r.ratingLabel])).toEqual(
        ratings.map((rating) => [rating, sentimentFromRating(rating, ratingScale)]),
      );
    }
  });

  it("has nothing to compare without labels or ratings", async () => {
    const { check } = await getDashboard(db, undated, EMPTY_FILTERS);
    expect(check).toBeNull();
  });
});

describe("getFilterOptions and listIssues", () => {
  it("returns products, date range and rating range", async () => {
    expect(await getFilterOptions(db, upload.id)).toEqual({
      products: [
        { name: "Kettle", count: 20 },
        { name: "Toaster", count: 20 },
      ],
      minDate: "2026-01-01",
      maxDate: "2026-04-20",
      minRating: 1,
      maxRating: 5,
    });
  });

  it("returns an empty issue list for a clean upload", async () => {
    expect(await listIssues(db, upload.id, 1)).toMatchObject({ total: 0, rows: [] });
  });
});
