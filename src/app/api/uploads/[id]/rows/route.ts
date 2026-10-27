import type { NextRequest } from "next/server";
import { RowsBody } from "@/lib/contracts";
import { LIMITS } from "@/lib/limits";
import { getDb } from "@/lib/server/db";
import { notFound } from "@/lib/server/errors";
import { errorResponse, json, readJson } from "@/lib/server/http";
import { ingestRows } from "@/lib/server/ingest";
import { getUpload } from "@/lib/server/uploads";

/** Receives up to 500 mapped rows, cleans them and stores them as pending reviews. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/uploads/[id]/rows">) {
  try {
    const { id } = await ctx.params;
    const db = getDb();
    const upload = await getUpload(db, id);
    if (!upload) throw notFound();
    const { rows } = await readJson(request, RowsBody, LIMITS.maxRequestBytes + 100_000);
    return json(await ingestRows(db, upload, rows));
  } catch (error) {
    return errorResponse(error);
  }
}
