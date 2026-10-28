import type { NextRequest } from "next/server";
import { retryFailed } from "@/lib/server/analyze";
import { requireApiUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { errorResponse, json } from "@/lib/server/http";

/** Puts failed reviews back in the queue. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/uploads/[id]/retry">) {
  try {
    const user = await requireApiUser(request);
    const { id } = await ctx.params;
    return json({ progress: await retryFailed(getDb(), user.id, id) });
  } catch (error) {
    return errorResponse(error);
  }
}
