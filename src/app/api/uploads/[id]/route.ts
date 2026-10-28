import type { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { notFound } from "@/lib/server/errors";
import { errorResponse, json } from "@/lib/server/http";
import { deleteUpload, getProgress } from "@/lib/server/uploads";

/** Import and analysis progress for one upload. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/uploads/[id]">) {
  try {
    const user = await requireApiUser(request);
    const { id } = await ctx.params;
    const progress = await getProgress(getDb(), user.id, id);
    if (!progress) throw notFound();
    return json({ progress });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Deletes an upload with all of its reviews and messages. */
export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/uploads/[id]">) {
  try {
    const user = await requireApiUser(request);
    const { id } = await ctx.params;
    if (!(await deleteUpload(getDb(), user.id, id))) throw notFound();
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
