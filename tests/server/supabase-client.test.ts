import { describe, expect, it, vi } from "vitest";

const cookies = vi.fn(async () => ({ getAll: () => [], set: () => {} }));
vi.mock("next/headers", () => ({ cookies }));

const { createSupabaseServerClient } = await import("@/lib/supabase/server");

describe("createSupabaseServerClient", () => {
  it("reads the request's cookies before reporting missing settings, so pages that need sign-in are never prerendered", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    await expect(createSupabaseServerClient()).rejects.toMatchObject({ code: "AUTH_NOT_CONFIGURED" });
    expect(cookies).toHaveBeenCalled();
  });
});
