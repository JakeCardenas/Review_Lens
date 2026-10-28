import { beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { getClaims } }) }));

const { assertSameOrigin, getCurrentUser, requireApiUser, requireUser } = await import("@/lib/server/auth");

const ID = "0f9b3c7e-5d2a-4e8b-9c1d-2a3b4c5d6e7f";
const signedIn = (claims: Record<string, unknown> = {}) =>
  getClaims.mockResolvedValue({ data: { claims: { sub: ID, email: "synthetic@example.com", ...claims } }, error: null });

const request = (method: string, headers: Record<string, string>) =>
  new Request("https://review-lens.example/api/uploads", { method, headers: { host: "review-lens.example", ...headers } });

beforeEach(() => getClaims.mockReset());

describe("getCurrentUser", () => {
  it("returns the account from verified token claims", async () => {
    signedIn();
    expect(await getCurrentUser()).toEqual({ id: ID, email: "synthetic@example.com" });
  });

  it("returns no one for a missing, invalid or anonymous session", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    expect(await getCurrentUser()).toBeNull();
    getClaims.mockResolvedValue({ data: null, error: new Error("invalid JWT") });
    expect(await getCurrentUser()).toBeNull();
    signedIn({ is_anonymous: true });
    expect(await getCurrentUser()).toBeNull();
    signedIn({ sub: "not-a-uuid" });
    expect(await getCurrentUser()).toBeNull();
  });
});

describe("requireUser and requireApiUser", () => {
  it("sends signed-out visitors to sign in, then back to the page they wanted", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    await expect(requireUser("/uploads/abc?tab=reviews")).rejects.toMatchObject({
      digest: expect.stringContaining("/sign-in?next=%2Fuploads%2Fabc%3Ftab%3Dreviews"),
    });
  });

  it("answers signed-out API calls with 401", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    await expect(requireApiUser(request("GET", {}))).rejects.toMatchObject({ status: 401, code: "SIGN_IN_REQUIRED" });
    signedIn();
    await expect(requireApiUser(request("GET", {}))).resolves.toEqual({ id: ID, email: "synthetic@example.com" });
  });

  it("blocks changes requested from another site, even with a valid session", async () => {
    signedIn();
    await expect(requireApiUser(request("POST", { origin: "https://evil.example" }))).rejects.toMatchObject({
      status: 403,
      code: "CROSS_SITE_REQUEST",
    });
    await expect(requireApiUser(request("DELETE", { origin: "https://review-lens.example" }))).resolves.toBeTruthy();
  });
});

describe("assertSameOrigin", () => {
  it("accepts this site and requests without an Origin header", () => {
    expect(() => assertSameOrigin(request("POST", { origin: "https://review-lens.example" }))).not.toThrow();
    expect(() => assertSameOrigin(request("POST", {}))).not.toThrow();
    expect(() =>
      assertSameOrigin(request("POST", { origin: "https://app.example", "x-forwarded-host": "app.example" })),
    ).not.toThrow();
  });

  it("rejects other sites and opaque origins", () => {
    expect(() => assertSameOrigin(request("POST", { origin: "https://evil.example" }))).toThrow(/another site/);
    expect(() => assertSameOrigin(request("POST", { origin: "null" }))).toThrow(/another site/);
  });
});
