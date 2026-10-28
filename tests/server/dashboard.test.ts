import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MockProvider } from "@/lib/analysis/providers/mock";
import { analyzeNextBatch, startAnalysis } from "@/lib/server/analyze";
import { getDashboard } from "@/lib/server/dashboard";
import type { Db } from "@/lib/server/db-types";
import { EMPTY_FILTERS } from "@/lib/server/filters";
import { ingestRows } from "@/lib/server/ingest";
import { getFilterOptions, listIssues, searchReviews } from "@/lib/server/reviews";
import { createUpload, type UploadRecord } from "@/lib/server/uploads";
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
