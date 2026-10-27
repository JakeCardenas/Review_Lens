import type { NextRequest } from "next/server";
import { getProvider } from "@/lib/analysis/providers";
import { analyzeNextBatch } from "@/lib/server/analyze";
import { getDb } from "@/lib/server/db";
import { errorResponse, json } from "@/lib/server/http";

// One batch normally takes seconds; this leaves room for a slow AI response and one retry.
export const maxDuration = 120;

/** Analyzes the next batch of pending reviews and returns progress. */
export async function POST(_request: NextRequest, ctx: RouteContext<"/api/uploads/[id]/analyze">) {
  try {
    const { id } = await ctx.params;
    return json(await analyzeNextBatch(getDb(), getProvider(), id));
  } catch (error) {
    return errorResponse(error);
  }
}
