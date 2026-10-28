import { readFileSync } from "node:fs";
import { join } from "node:path";
import Papa from "papaparse";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MockProvider } from "@/lib/analysis/providers/mock";
import { guessColumnMapping, textColumnProblem } from "@/lib/csv/columns";
import { detectRatingScale, labelColumnLooksValid } from "@/lib/csv/parse-values";
import { analyzeNextBatch, startAnalysis } from "@/lib/server/analyze";
import { getDashboard } from "@/lib/server/dashboard";
import type { Db } from "@/lib/server/db-types";
import { EMPTY_FILTERS } from "@/lib/server/filters";
import { ingestRows } from "@/lib/server/ingest";
import { createUpload } from "@/lib/server/uploads";
import { createTestDb, newOwner } from "../helpers/pglite";

// A synthetic file anyone can upload to check the label check end to end. None of it is real review data.
const FIXTURE = readFileSync(join(process.cwd(), "fixtures", "label-check-sample.csv"), "utf8");

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});

afterAll(() => close());

describe("label-check fixture", () => {
  it("runs through the upload flow and shows the label check, with blank and unreadable labels left out", async () => {
    const { data: rows, meta } = Papa.parse<Record<string, string>>(FIXTURE, { header: true, skipEmptyLines: "greedy" });
    const mapping = guessColumnMapping(meta.fields ?? []);
    expect(mapping).toMatchObject({ text: "review_text", rating: "stars", label: "my_label" });
    expect(textColumnProblem(rows.map((r) => r.review_text))).toBeNull();
    expect(labelColumnLooksValid(rows.map((r) => r.my_label))).toBe(true);

    const owner = newOwner();
    const mock = new MockProvider();
    const upload = await createUpload(
      db,
      {
        name: "Fixture",
        fileName: "label-check-sample.csv",
        columnMap: mapping,
        dateFormat: null,
        ratingScale: detectRatingScale(rows.map((r) => r.stars)),
        totalRows: rows.length,
      },
      mock,
      owner,
    );
    await ingestRows(
      db,
      upload,
      rows.map((r, i) => ({ rowNumber: i + 2, text: r.review_text, rating: r.stars, label: r.my_label })),
    );
    await startAnalysis(db, owner, upload.id);
    await analyzeNextBatch(db, mock, owner, upload.id);

    const { check } = await getDashboard(db, upload, EMPTY_FILTERS);
    expect(rows).toHaveLength(20);
    expect(check).toMatchObject({ source: "label", eligible: 18, excluded: { missing: 1, invalid: 1, notLabeled: 0, failed: 0 } });
    const counted = Object.values(check!.matrix).flatMap((row) => Object.values(row)).reduce((sum, n) => sum + n, 0);
    expect(counted).toBe(18);
  });
});
