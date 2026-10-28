import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GeminiProvider } from "@/lib/analysis/providers/gemini";
import { MockProvider } from "@/lib/analysis/providers/mock";
import type { ProviderItem } from "@/lib/analysis/providers/types";
import { analyzeNextBatch, startAnalysis } from "@/lib/server/analyze";
import type { Db } from "@/lib/server/db-types";
import { ingestRows } from "@/lib/server/ingest";
import { createUpload } from "@/lib/server/uploads";
import { fakeGemini } from "../helpers/gemini";
import { createTestDb } from "../helpers/pglite";

const LABELED = {
  name: "Private labels",
  fileName: "labels.csv",
  columnMap: { text: "Review", date: null, rating: null, product: null, label: "Hand label X7" },
  dateFormat: null,
  ratingScale: null,
  totalRows: 3,
};
// Label spellings that appear nowhere but the label column, so finding one in a request means a leak.
const ROWS = [
  { rowNumber: 2, text: "The kettle boils water quickly", label: "positibo" },
  { rowNumber: 3, text: "Ang bag ay kulay asul", label: "negatibo" },
  { rowNumber: 4, text: "It arrived on Tuesday", label: "NEUTRO" },
];
const LEAKS = ["positibo", "negatibo", "NEUTRO", "Hand label X7"];

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});

afterAll(() => close());

describe("your own labels stay out of the model", () => {
  it("are stored, but only each review's id and text reach the provider", async () => {
    const seen: ProviderItem[] = [];
    const spy = new (class extends MockProvider {
      async analyze(items: ProviderItem[]) {
        seen.push(...items);
        return super.analyze(items);
      }
    })();
    const upload = await createUpload(db, LABELED, spy);
    await ingestRows(db, upload, ROWS);
    await startAnalysis(db, upload.id);
    await analyzeNextBatch(db, spy, upload.id);

    expect(
      await db.query(`select reference_label from reviews where upload_id = $1::uuid order by row_number`, [upload.id]),
    ).toEqual([{ reference_label: "positive" }, { reference_label: "negative" }, { reference_label: "neutral" }]);
    expect(seen).toHaveLength(3);
    for (const item of seen) expect(Object.keys(item).sort()).toEqual(["id", "text"]);
  });

  it("are never sent to Gemini, in the prompt or with the reviews", async () => {
    const gemini = fakeGemini();
    const provider = new GeminiProvider({ apiKey: "test-key", model: "gemini-3.5-flash-lite", fetch: gemini.fetch });
    const upload = await createUpload(db, LABELED, provider);
    await ingestRows(db, upload, ROWS);
    await startAnalysis(db, upload.id);
    await analyzeNextBatch(db, provider, upload.id);

    expect(gemini.calls).toHaveLength(1);
    const [call] = gemini.calls;
    expect(call.reviews.map((r) => Object.keys(r).sort())).toEqual([
      ["id", "text"],
      ["id", "text"],
      ["id", "text"],
    ]);
    expect(call.reviews.map((r) => r.text)).toEqual(ROWS.map((r) => r.text));
    for (const leak of LEAKS) expect(call.raw).not.toContain(leak);
  });

  it("sends only each review's id and text even when a caller passes more", async () => {
    const gemini = fakeGemini();
    const provider = new GeminiProvider({ apiKey: "test-key", model: "gemini-3.5-flash-lite", fetch: gemini.fetch });
    const item = { id: 1, text: "Okay lang", referenceLabel: "negative", label: "negatibo" };
    await provider.analyze([item as ProviderItem]);
    expect(gemini.calls[0].reviews).toEqual([{ id: 1, text: "Okay lang" }]);
  });
});
