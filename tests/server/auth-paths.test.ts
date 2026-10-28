import { describe, expect, it } from "vitest";
import { isApiPath, isPublicPath, safeNextPath } from "@/lib/auth/paths";

describe("safeNextPath", () => {
  it("keeps paths on this site", () => {
    expect(safeNextPath("/uploads/abc/reviews?check=disagree")).toBe("/uploads/abc/reviews?check=disagree");
    expect(safeNextPath("/")).toBe("/");
  });

  it("refuses anything that could lead to another site", () => {
    for (const value of [
      "//evil.example",
      "https://evil.example",
      "/\\evil.example",
      "/\t/evil.example",
      "/\r\nSet-Cookie: x=1",
      "javascript:alert(1)",
      "uploads",
      "",
      null,
      42,
    ]) {
      expect(safeNextPath(value)).toBe("/");
    }
  });

  it("refuses paths that only become another site after the URL is tidied", () => {
    for (const value of [
      "/.//evil.example",
      "/..//evil.example",
      "/%2e//evil.example",
      "//reviewlens.invalid//evil.example",
      "/.//reviewlens.invalid//evil.example/login",
    ]) {
      expect(safeNextPath(value)).toBe("/");
      // The sign-in page and the sign-in action each check `next`, so two passes must hold too.
      expect(safeNextPath(safeNextPath(value))).toBe("/");
    }
  });

  it("doesn't send people back to the sign-in pages", () => {
    expect(safeNextPath("/sign-in?next=/upload")).toBe("/");
    expect(safeNextPath("/sign-up", "/upload")).toBe("/upload");
  });
});

describe("path classes", () => {
  it("lets anyone open the account pages, and nothing else", () => {
    for (const path of ["/sign-in", "/sign-up", "/forgot-password", "/check-email", "/auth/confirm"]) {
      expect(isPublicPath(path)).toBe(true);
    }
    for (const path of ["/", "/upload", "/uploads/abc", "/uploads/abc/report", "/reset-password", "/api/uploads", "/sign-in-other"]) {
      expect(isPublicPath(path)).toBe(false);
    }
  });

  it("tells API routes apart from pages", () => {
    expect(isApiPath("/api/uploads/abc/export")).toBe(true);
    expect(isApiPath("/apis")).toBe(false);
    expect(isApiPath("/uploads/abc")).toBe(false);
  });
});
