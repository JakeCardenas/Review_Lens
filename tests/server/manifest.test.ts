import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("web app manifest", () => {
  it("names the app and opens it at the uploads list in its own window", () => {
    const m = manifest();
    expect(m.name).toBe("ReviewLens");
    expect(m.short_name).toBe("ReviewLens");
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
  });

  it("lists home-screen icons, including a maskable one, and every file exists", () => {
    const icons = manifest().icons ?? [];
    expect(icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect(icons.some((icon) => icon.purpose === "maskable")).toBe(true);
    for (const icon of icons) {
      expect(existsSync(join(process.cwd(), "public", icon.src)), icon.src).toBe(true);
    }
  });
});
