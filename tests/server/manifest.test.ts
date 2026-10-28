import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("web app manifest", () => {
  it("names the app and opens it at the home screen in its own window", () => {
    const m = manifest();
    expect(m.name).toBe("ReviewLens");
    expect(m.short_name).toBe("ReviewLens");
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
    expect(m.background_color).toBe("#ffffff");
  });

  it("uses the square logo at 192 and 512 pixels, and every file exists", () => {
    const icons = manifest().icons ?? [];
    expect(icons.map((icon) => icon.sizes)).toEqual(["192x192", "512x512"]);
    for (const icon of icons) {
      expect(icon.type).toBe("image/png");
      expect(existsSync(join(process.cwd(), "public", icon.src)), icon.src).toBe(true);
    }
  });

  it("doesn't offer a maskable icon, so Android never crops the square logo", () => {
    expect((manifest().icons ?? []).some((icon) => icon.purpose?.includes("maskable"))).toBe(false);
  });
});
