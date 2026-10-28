import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MockProvider } from "@/lib/analysis/providers/mock";
import { analyzeNextBatch, startAnalysis } from "@/lib/server/analyze";
import { getDashboard } from "@/lib/server/dashboard";
import type { Db } from "@/lib/server/db-types";
import { csvCell, describeFilters, reviewCsvLines, summaryCsv } from "@/lib/server/export";
import { buildWhere, EMPTY_FILTERS, filtersToQuery, parseFilters } from "@/lib/server/filters";
import { ingestRows } from "@/lib/server/ingest";
import { createUpload, type UploadRecord } from "@/lib/server/uploads";
import { createTestDb } from "../helpers/pglite";

describe("csvCell", () => {
  it("neutralizes cells a spreadsheet would run as formulas", () => {
    expect(csvCell("=SUM(A1:A9)")).toBe("'=SUM(A1:A9)");
    expect(csvCell("+1 555")).toBe("'+1 555");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell("-2+3")).toBe("'-2+3");
  });

  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell('He said "hi", then left')).toBe('"He said ""hi"", then left"');
    expect(csvCell("line one\nline two")).toBe('"line one\nline two"');
  });

  it("writes numbers and empty values plainly", () => {
    expect(csvCell(4.5)).toBe("4.5");
    expect(csvCell(-1)).toBe("-1");
    expect(csvCell(null)).toBe("");
  });
});

describe("parseFilters", () => {
  it("keeps valid values and drops invalid ones", () => {
    const filters = parseFilters(
      new URLSearchParams("from=2026-01-01&to=bad&rating_min=4&rating_max=9x&sentiment=happy&topic=delivery&q=%20%20late%20&product=Kettle"),
    );
    expect(filters).toEqual({
      ...EMPTY_FILTERS,
      from: "2026-01-01",
      ratingMin: 4,
      topic: "delivery",
      q: "late",
      product: "Kettle",
    });
  });

  it("reads the mixed-opinion filter and keeps it in links", () => {
    expect(parseFilters(new URLSearchParams("opinion=mixed")).opinion).toBe("mixed");
    expect(parseFilters(new URLSearchParams("opinion=happy")).opinion).toBeNull();
    expect(filtersToQuery({ opinion: "mixed" })).toBe("opinion=mixed");
  });

  it("reads the label-check filter and keeps it in links", () => {
    expect(parseFilters(new URLSearchParams("check=disagree")).check).toBe("disagree");
    expect(parseFilters(new URLSearchParams("check=agree")).check).toBe("agree");
    expect(parseFilters(new URLSearchParams("check=maybe")).check).toBeNull();
    expect(filtersToQuery({ check: "disagree" })).toBe("check=disagree");
    expect(describeFilters({ ...EMPTY_FILTERS, check: "disagree" })).toBe("Agreement check: disagreements");
  });

  it("reads plain objects from Next.js search params", () => {
    expect(parseFilters({ sentiment: "negative", confidence: ["low", "high"] })).toMatchObject({
      sentiment: "negative",
      confidence: "low",
    });
  });
});

describe("buildWhere", () => {
  it("numbers parameters after the upload id and escapes LIKE wildcards", () => {
    const where = buildWhere("u-1", { ...EMPTY_FILTERS, product: "Kettle", q: "100%_off" });
    expect(where.params).toEqual(["u-1", "Kettle", "100%_off", "%100\\%\\_off%"]);
    expect(where.sql).toContain("r.product = $2");
    expect(where.sql).toContain("websearch_to_tsquery('english', $3)");
    expect(where.sql).toContain("r.text ilike $4");
  });
});

describe("exports", () => {
  let db: Db;
  let close: () => Promise<void>;
  let upload: UploadRecord;
  const mock = new MockProvider();

  beforeAll(async () => {
    ({ db, close } = await createTestDb());
    upload = await createUpload(
      db,
      {
        name: "Export test",
        fileName: "export.csv",
        columnMap: { text: "Review", date: null, rating: "Stars", product: null },
        dateFormat: null,
        ratingScale: 5,
        totalRows: 2,
      },
      mock,
    );
    await ingestRows(db, upload, [
      { rowNumber: 2, text: "=HYPERLINK(\"x\") love it, write to me@example.com", rating: "5" },
      { rowNumber: 3, text: "Terrible, delivery was late", rating: "1" },
    ]);
    await startAnalysis(db, upload.id);
    await analyzeNextBatch(db, mock, upload.id);
  });

  afterAll(() => close());

  it("exports every labeled review with masked, formula-safe text", async () => {
    const lines: string[] = [];
    for await (const line of reviewCsvLines(db, upload, EMPTY_FILTERS)) lines.push(line);
    expect(lines[0]).toBe(
      "row_number,review_text,review_date,rating,product,sentiment,your_label,rating_suggests,confidence,confidence_reasons,topics,language_status,status,note\r\n",
    );
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("'=HYPERLINK");
    expect(lines[1]).toContain("[email]");
    expect(lines[2]).toMatch(/^3,"Terrible, delivery was late",,1,,negative,,negative,/);
  });

  it("adds the rating alignment to the summary, marked as a rough proxy", async () => {
    const dashboard = await getDashboard(db, upload, EMPTY_FILTERS);
    const csv = summaryCsv(upload, dashboard, EMPTY_FILTERS);
    expect(csv).toContain("\r\nRating alignment\r\n");
    expect(csv).toContain('Compared with,"Star ratings (4–5 stars = positive, 3 = neutral, 1–2 = negative)"\r\n');
    expect(csv).toContain("Eligible reviews,2\r\n");
    expect(csv).toContain("Labels that match,2,100.0%\r\n");
    expect(csv).toContain("Not counted: no rating,0\r\n");
    expect(csv).toContain(
      "Stars suggest,ReviewLens: Positive,ReviewLens: Neutral,ReviewLens: Negative\r\nPositive,1,0,0\r\nNeutral,0,0,0\r\nNegative,0,0,1\r\n",
    );
    expect(csv).toMatch(/proxy/);
    expect(csv).not.toContain("Precision");
  });

  it("adds your labels, what was left out and per-label scores to the exports", async () => {
    const labeled = await createUpload(
      db,
      {
        name: "Labeled export",
        fileName: "labeled.csv",
        columnMap: { text: "Review", date: null, rating: null, product: null, label: "My label" },
        dateFormat: null,
        ratingScale: null,
        totalRows: 4,
      },
      mock,
    );
    await ingestRows(db, labeled, [
      { rowNumber: 2, text: "I love it", label: "positive" },
      { rowNumber: 3, text: "Terrible, it broke", label: "negative" },
      { rowNumber: 4, text: "It is blue", label: "negative" },
      { rowNumber: 5, text: "Great value" },
    ]);
    await startAnalysis(db, labeled.id);
    await analyzeNextBatch(db, mock, labeled.id);

    const lines: string[] = [];
    for await (const line of reviewCsvLines(db, labeled, EMPTY_FILTERS)) lines.push(line);
    expect(lines[3]).toMatch(/^4,It is blue,,,,neutral,negative,,/);

    const csv = summaryCsv(labeled, await getDashboard(db, labeled, EMPTY_FILTERS), EMPTY_FILTERS);
    expect(csv).toContain("\r\nLabel check\r\n");
    expect(csv).toContain('Compared with,"Your labels (column ""My label"")"\r\n');
    expect(csv).toContain("Eligible reviews,3\r\n");
    expect(csv).toContain("Labels that match,2,66.7%\r\n");
    expect(csv).toContain("Not counted: no label,1\r\n");
    expect(csv).toContain("Label,Your label count,ReviewLens count,Precision,Recall,F1\r\n");
    expect(csv).toContain("Positive,1,1,1.00,1.00,1.00\r\n");
    expect(csv).toContain("Neutral,0,1,0.00,n/a,n/a\r\n");
    expect(csv).toContain("Negative,2,1,1.00,0.50,0.67\r\n");
  });

  it("writes a summary with totals, sentiment shares and topics", async () => {
    const dashboard = await getDashboard(db, upload, EMPTY_FILTERS);
    const csv = summaryCsv(upload, dashboard, EMPTY_FILTERS);
    expect(csv).toContain("Reviews labeled,2");
    expect(csv).toContain("Positive,1,50.0%");
    expect(csv).toContain("Delivery & shipping,1");
  });
});
