import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const APP = join(process.cwd(), "src", "app");
// Pages anyone may open: signing up, signing in, confirming an email, asking for a reset link.
const PUBLIC = new Set([
  "(auth)/sign-in/page.tsx",
  "(auth)/sign-up/page.tsx",
  "(auth)/check-email/page.tsx",
  "(auth)/forgot-password/page.tsx",
  "auth/confirm/route.ts",
]);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe("server-side access checks", () => {
  const entries = files(APP)
    .filter((path) => /\/(page\.tsx|route\.ts|layout\.tsx)$/.test(path))
    .map((path) => ({ path: relative(APP, path), source: readFileSync(path, "utf8") }));

  it("covers every page and API route, apart from the public account pages", () => {
    const unguarded = entries
      .filter(({ path }) => !PUBLIC.has(path) && path !== "layout.tsx")
      .filter(({ source }) => !/\b(requireUser|requireOwnedUpload|requireApiUser)\(/.test(source))
      .map(({ path }) => path);
    expect(unguarded).toEqual([]);
  });

  it("finds the routes it is meant to check", () => {
    const paths = entries.map(({ path }) => path);
    expect(paths).toEqual(expect.arrayContaining(["api/uploads/route.ts", "api/uploads/[id]/export/route.ts", "uploads/[id]/page.tsx"]));
  });
});
