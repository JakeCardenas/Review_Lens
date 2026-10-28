import type { NextRequest } from "next/server";
import { startAnalysis } from "@/lib/server/analyze";
import { requireApiUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { errorResponse, json } from "@/lib/server/http";

/** Ends the import step; the browser then calls /analyze until every review is processed. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/uploads/[id]/start">) {
  try {
    const user = await requireApiUser(request);
    const { id } = await ctx.params;
    return json({ progress: await startAnalysis(getDb(), user.id, id) });
  } catch (error) {
    return errorResponse(error);
  }
}
