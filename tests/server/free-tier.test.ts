import { describe, expect, it } from "vitest";
import { ProviderError } from "@/lib/analysis/providers/types";
import { CreateUploadBody } from "@/lib/contracts";
import { errorResponse } from "@/lib/server/http";
import { checkDataNotice } from "@/lib/server/uploads";

function thrown(fn: () => void): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return null;
}

describe("checkDataNotice", () => {
  it("refuses an AI-mode upload until the free-tier data notice is accepted", () => {
    expect(thrown(() => checkDataNotice({ external: true }, undefined))).toMatchObject({
      code: "DATA_NOTICE_REQUIRED",
      status: 400,
    });
  });

  it("allows an AI-mode upload once the notice is accepted", () => {
    expect(thrown(() => checkDataNotice({ external: true }, "accepted"))).toBeNull();
  });

  it("needs no notice in Basic mode, where nothing leaves the server", () => {
    expect(thrown(() => checkDataNotice({ external: false }, undefined))).toBeNull();
  });

  it("accepts only an explicit acceptance in the upload request", () => {
    const body = {
      name: "Shopee pilot",
      fileName: "filipino-check-30.csv",
      columnMap: { text: "review_text", date: null, rating: null, product: null },
      dateFormat: null,
      ratingScale: null,
      totalRows: 30,
    };
    expect(CreateUploadBody.safeParse({ ...body, dataNotice: "accepted" }).success).toBe(true);
    expect(CreateUploadBody.safeParse({ ...body, dataNotice: "yes" }).success).toBe(false);
  });
});

describe("errorResponse for free-tier limits", () => {
  it("reports a used-up daily limit as 429 with its own code", async () => {
    const response = errorResponse(
      new ProviderError("The Gemini free tier's daily limit is used up.", false, { code: "FREE_TIER_DAILY_LIMIT" }),
    );
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ error: { code: "FREE_TIER_DAILY_LIMIT" } });
  });

  it("keeps the general codes for other provider failures", async () => {
    const response = errorResponse(new ProviderError("Check GEMINI_API_KEY.", false, { code: "GEMINI_KEY_REJECTED" }));
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: { code: "GEMINI_KEY_REJECTED" } });
  });
});
