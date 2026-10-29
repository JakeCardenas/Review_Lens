import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (c: unknown[], h: Record<string, string>) => void } }) => ({
    auth: {
      async getClaims() {
        // Supabase refreshes the session while verifying it, writing new cookies and no-cache headers.
        options.cookies.setAll([{ name: "sb-test-auth-token", value: "refreshed", options: { path: "/" } }], {
          "cache-control": "private, no-cache, no-store, must-revalidate, max-age=0",
        });
        return getClaims();
      },
    },
  }),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://synthetic.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_synthetic";
const { proxy, config } = await import("@/proxy");

const signedOut = () => getClaims.mockResolvedValue({ data: null, error: null });
const signedIn = () =>
  getClaims.mockResolvedValue({ data: { claims: { sub: "0f9b3c7e-5d2a-4e8b-9c1d-2a3b4c5d6e7f" } }, error: null });
const visit = (path: string) => proxy(new NextRequest(`https://review-lens.example${path}`));

beforeEach(() => getClaims.mockReset());

describe("proxy", () => {
  it("sends signed-out visitors to sign in, keeping refreshed cookies and no-cache headers", async () => {
    signedOut();
    const response = await visit("/uploads/abc/reviews?check=disagree");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://review-lens.example/sign-in?next=%2Fuploads%2Fabc%2Freviews%3Fcheck%3Ddisagree",
    );
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe("refreshed");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("answers signed-out API calls with 401 instead of a redirect", async () => {
    signedOut();
    const response = await visit("/api/uploads/abc/export");
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "SIGN_IN_REQUIRED", message: "Sign in to continue." } });
  });

  it("lets anyone open the account pages", async () => {
    signedOut();
    expect((await visit("/sign-up")).headers.get("x-middleware-next")).toBe("1");
  });

  it("shows signed-out visitors the welcome page at /, and still sends them to sign in everywhere else", async () => {
    signedOut();
    expect((await visit("/")).headers.get("x-middleware-next")).toBe("1");
    expect((await visit("/upload")).headers.get("location")).toBe("https://review-lens.example/sign-in?next=%2Fupload");
  });

  it("leaves the app icons and web app manifest alone, since browsers fetch them without a session", () => {
    const runsOn = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);
    for (const path of ["/manifest.webmanifest", "/favicon.ico", "/icon.png", "/apple-icon.png", "/icons/icon-512.png", "/brand/spup-seal.png"]) {
      expect(runsOn(path), path).toBe(false);
    }
    for (const path of ["/", "/uploads/abc", "/api/uploads", "/sign-in"]) {
      expect(runsOn(path), path).toBe(true);
    }
  });

  it("lets signed-in people through, and skips the sign-in page for them", async () => {
    signedIn();
    expect((await visit("/uploads/abc")).headers.get("x-middleware-next")).toBe("1");
    const response = await visit("/sign-in");
    expect(response.headers.get("location")).toBe("https://review-lens.example/");
  });
});
