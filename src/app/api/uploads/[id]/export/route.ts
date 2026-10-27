import type { NextRequest } from "next/server";
import { getDashboard } from "@/lib/server/dashboard";
import { getDb } from "@/lib/server/db";
import { notFound } from "@/lib/server/errors";
import { reviewCsvLines, summaryCsv } from "@/lib/server/export";
import { dashboardFilters, parseFilters } from "@/lib/server/filters";
import { errorResponse, slugify } from "@/lib/server/http";
import { getUpload } from "@/lib/server/uploads";

const BOM = "﻿"; // lets Excel open UTF-8 files (accents, emoji) correctly

function csvHeaders(fileName: string) {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Cache-Control": "no-store",
  };
}

/** ?type=reviews (default) streams the labeled dataset; ?type=summary returns the summary report. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/uploads/[id]/export">) {
  try {
    const { id } = await ctx.params;
    const db = getDb();
    const upload = await getUpload(db, id);
    if (!upload) throw notFound();
    const params = request.nextUrl.searchParams;
    const filters = parseFilters(params);
    const slug = slugify(upload.name);

    if (params.get("type") === "summary") {
      const summaryFilters = dashboardFilters(filters);
      const dashboard = await getDashboard(db, upload, summaryFilters);
      return new Response(BOM + summaryCsv(upload, dashboard, summaryFilters), {
        headers: csvHeaders(`${slug}-summary.csv`),
      });
    }

    const encoder = new TextEncoder();
    const lines = reviewCsvLines(db, upload.id, filters);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(BOM));
      },
      async pull(controller) {
        const next = await lines.next();
        if (next.done) controller.close();
        else controller.enqueue(encoder.encode(next.value));
      },
      async cancel() {
        await lines.return(undefined);
      },
    });
    return new Response(stream, { headers: csvHeaders(`${slug}-labeled-reviews.csv`) });
  } catch (error) {
    return errorResponse(error);
  }
}
