import "server-only";
import type { z } from "zod";
import { ProviderError } from "@/lib/analysis/providers/types";
import { AppError } from "./errors";

const NO_STORE = { "Cache-Control": "no-store" };

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: NO_STORE });
}

/** Turns any error into a JSON response whose message is safe to show. Never includes review text. */
export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) return json({ error: { code: error.code, message: error.message } }, error.status);
  if (error instanceof ProviderError) {
    const code = error.code ?? (error.retryable ? "PROVIDER_UNAVAILABLE" : "PROVIDER_REJECTED");
    const status = error.code === "FREE_TIER_DAILY_LIMIT" ? 429 : error.retryable ? 503 : 502;
    return json({ error: { code, message: error.message } }, status);
  }
  console.error("[api] unexpected error:", (error as Error)?.message ?? error);
  return json({ error: { code: "SERVER_ERROR", message: "Something went wrong on the server. Please try again." } }, 500);
}

/** Reads and validates a JSON body, refusing anything larger than `maxBytes`. */
export async function readJson<T>(request: Request, schema: z.ZodType<T>, maxBytes: number): Promise<T> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new AppError("TOO_LARGE", "This request is too large. Send fewer rows at a time.", 413);
  const text = await request.text();
  if (text.length > maxBytes) throw new AppError("TOO_LARGE", "This request is too large. Send fewer rows at a time.", 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new AppError("BAD_JSON", "The request body isn't valid JSON.", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? issue.path.join(".") : "body";
    throw new AppError("INVALID_INPUT", `Invalid request (${where}): ${issue?.message ?? "unexpected value"}`.slice(0, 240), 400);
  }
  return parsed.data;
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "reviewlens"
  );
}
