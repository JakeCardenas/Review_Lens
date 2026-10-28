import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GeminiProvider } from "@/lib/analysis/providers/gemini";
import { analyzeNextBatch, startAnalysis } from "@/lib/server/analyze";
import type { Db } from "@/lib/server/db-types";
import { ingestRows } from "@/lib/server/ingest";
import { createUpload } from "@/lib/server/uploads";
import { fakeGemini } from "../helpers/gemini";
import { createTestDb, newOwner } from "../helpers/pglite";

const OWNER = newOwner();

// Made-up Taglish reviews in the style of the pilot's misses; none are pilot reviews.
const LUKEWARM = "Okay naman yung payong, medyo manipis lang yung tela pero gumagana naman";
const LETDOWN = "Maganda sana yung kulay kaso sira na yung zipper pagdating, sayang";

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});

afterAll(() => close());

async function analyzeWith(provider: GeminiProvider, texts: string[]) {
  const upload = await createUpload(
    db,
    {
      name: "Mixed",
      fileName: "mixed.csv",
      columnMap: { text: "Review", date: null, rating: null, product: null },
      dateFormat: null,
      ratingScale: null,
      totalRows: texts.length,
    },
    provider,
    OWNER,
  );
  await ingestRows(db, upload, texts.map((text, i) => ({ rowNumber: i + 2, text })));
  await startAnalysis(db, OWNER, upload.id);
  await analyzeNextBatch(db, provider, OWNER, upload.id);
  return db.query<{ sentiment: string; confidence: string; confidence_reasons: string[] }>(
    `select sentiment, confidence, confidence_reasons from reviews where upload_id = $1::uuid order by row_number`,
    [upload.id],
  );
}

describe("mixed Filipino reviews in AI mode", () => {
  it("keeps a mixed review visible as low confidence when it is labeled one way", async () => {
    const gemini = fakeGemini((review) => ({
      sentiment: review.text === LUKEWARM ? "neutral" : "negative",
      mixed_opinion: true,
      language: "taglish",
    }));
    const provider = new GeminiProvider({ apiKey: "test-key", model: "gemini-3.5-flash-lite", fetch: gemini.fetch });
    expect(await analyzeWith(provider, [LUKEWARM, LETDOWN])).toEqual([
      { sentiment: "neutral", confidence: "medium", confidence_reasons: ["model_clear", "mixed_opinion"] },
      { sentiment: "negative", confidence: "low", confidence_reasons: ["model_clear", "mixed_opinion", "mixed_one_side"] },
    ]);
  });

  it("tells Gemini how to read lukewarm, let-down and mixed reviews", async () => {
    const gemini = fakeGemini();
    const provider = new GeminiProvider({ apiKey: "test-key", model: "gemini-3.5-flash-lite", fetch: gemini.fetch });
    await analyzeWith(provider, [LUKEWARM]);
    const prompt = gemini.calls[0].body.systemInstruction.parts[0].text;
    // Neutral covers lukewarm acceptance and evenly weighted mixes; a real problem stays negative.
    expect(prompt).toMatch(/"okay naman"/);
    expect(prompt).toMatch(/neither side clearly outweighs the other/);
    expect(prompt).toMatch(/broken, fake, missing parts, wrong item, doesn't work/);
    // "X sana" (it would have been X) is a letdown, not praise.
    expect(prompt).toMatch(/"maganda sana"/);
    // Mixed reviews that could be read as neutral are "leaning", not "clear".
    expect(prompt).toMatch(/a mixed review that could be read as neutral/);
    // Texting shorthand seen in Shopee reviews.
    expect(prompt).toMatch(/\bndi\b(\/\w+)* = hindi/);
  });
});
