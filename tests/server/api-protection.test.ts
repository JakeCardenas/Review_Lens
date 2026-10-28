import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MockProvider } from "@/lib/analysis/providers/mock";
import type { Db } from "@/lib/server/db-types";
import { ingestRows } from "@/lib/server/ingest";
import { createUpload, type OwnedUpload } from "@/lib/server/uploads";
import { createTestDb, newOwner } from "../helpers/pglite";

let db: Db;
let close: () => Promise<void>;
let signedInAs: string | null = null;

vi.mock("@/lib/server/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/db")>()),
  getDb: () => db,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getClaims: async () => ({ data: signedInAs ? { claims: { sub: signedInAs, email: "synthetic@example.com" } } : null, error: null }),
    },
  }),
}));
process.env.SENTIMENT_PROVIDER = "basic";

const uploads = await import("@/app/api/uploads/route");
const one = await import("@/app/api/uploads/[id]/route");
const rows = await import("@/app/api/uploads/[id]/rows/route");
const start = await import("@/app/api/uploads/[id]/start/route");
const analyze = await import("@/app/api/uploads/[id]/analyze/route");
const retry = await import("@/app/api/uploads/[id]/retry/route");
const exporter = await import("@/app/api/uploads/[id]/export/route");

const alice = newOwner();
const bob = newOwner();
const SITE = "https://review-lens.example";
let upload: OwnedUpload;

function call(method: string, path: string, body?: unknown, origin = SITE) {
  return new NextRequest(`${SITE}${path}`, {
    method,
    headers: { host: "review-lens.example", origin, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

/** Every upload action, as [name, run]. */
const actions = (id: string): [string, () => Promise<Response>][] => [
  ["progress", () => one.GET(call("GET", `/api/uploads/${id}`), ctx(id))],
  ["delete", () => one.DELETE(call("DELETE", `/api/uploads/${id}`), ctx(id))],
  ["rows", () => rows.POST(call("POST", `/api/uploads/${id}/rows`, { rows: [{ rowNumber: 2, text: "Planted review" }] }), ctx(id))],
  ["start", () => start.POST(call("POST", `/api/uploads/${id}/start`), ctx(id))],
  ["analyze", () => analyze.POST(call("POST", `/api/uploads/${id}/analyze`), ctx(id))],
  ["retry", () => retry.POST(call("POST", `/api/uploads/${id}/retry`), ctx(id))],
  ["export reviews", () => exporter.GET(call("GET", `/api/uploads/${id}/export?type=reviews`), ctx(id))],
  ["export summary", () => exporter.GET(call("GET", `/api/uploads/${id}/export?type=summary`), ctx(id))],
];

const NEW_UPLOAD = {
  name: "Mine",
  fileName: "mine.csv",
  columnMap: { text: "Review", date: null, rating: null, product: null },
  dateFormat: null,
  ratingScale: null,
  totalRows: 2,
};

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  upload = await createUpload(db, { ...NEW_UPLOAD, totalRows: 3 }, new MockProvider(), alice);
  await ingestRows(db, upload, [{ rowNumber: 2, text: "I love this kettle" }]);
});

afterAll(() => close());

beforeEach(() => {
  signedInAs = null;
});

describe("API protection", () => {
  it("answers every action with 401 when nobody is signed in", async () => {
    expect((await uploads.POST(call("POST", "/api/uploads", NEW_UPLOAD))).status).toBe(401);
    for (const [name, run] of actions(upload.id)) {
      expect([name, (await run()).status]).toEqual([name, 401]);
    }
  });

  it("answers another account's upload exactly like a missing one, and changes nothing", async () => {
    signedInAs = bob;
    for (const [name, run] of actions(upload.id)) {
      const response = await run();
      expect([name, response.status]).toEqual([name, 404]);
    }
    expect(await db.query(`select count(*)::int as n from reviews where upload_id = $1::uuid`, [upload.id])).toEqual([{ n: 1 }]);
    expect(await db.query(`select status from uploads where id = $1::uuid`, [upload.id])).toEqual([{ status: "importing" }]);
  });

  it("lets the owner use their upload", async () => {
    signedInAs = alice;
    expect((await one.GET(call("GET", `/api/uploads/${upload.id}`), ctx(upload.id))).status).toBe(200);
    expect((await exporter.GET(call("GET", `/api/uploads/${upload.id}/export?type=reviews`), ctx(upload.id))).status).toBe(200);
  });

  it("blocks changes requested from another site", async () => {
    signedInAs = alice;
    const response = await start.POST(call("POST", `/api/uploads/${upload.id}/start`, undefined, "https://evil.example"), ctx(upload.id));
    expect(response.status).toBe(403);
    expect(await db.query(`select status from uploads where id = $1::uuid`, [upload.id])).toEqual([{ status: "importing" }]);
  });

  it("creates new uploads for the signed-in account only", async () => {
    signedInAs = bob;
    const response = await uploads.POST(call("POST", "/api/uploads", NEW_UPLOAD));
    expect(response.status).toBe(201);
    const { upload: created } = (await response.json()) as { upload: { id: string } };
    expect(await db.query(`select owner_id from uploads where id = $1::uuid`, [created.id])).toEqual([{ owner_id: bob }]);
  });
});
