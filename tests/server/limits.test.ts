import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/server/db-types";
import { LIMIT_DEFAULTS, limitsFromEnv, nextPacificMidnight, pacificDay, reserve } from "@/lib/server/limits";
import { createTestDb } from "../helpers/pglite";

describe("Pacific days", () => {
  it("uses the date in Pacific time, when Gemini's daily quota resets", () => {
    expect(pacificDay(new Date("2026-10-29T06:00:00Z"))).toBe("2026-10-28"); // 11 p.m. PDT
    expect(pacificDay(new Date("2026-10-29T07:00:00Z"))).toBe("2026-10-29");
  });

  it("finds the next Pacific midnight, before and after daylight saving time ends", () => {
    expect(nextPacificMidnight(new Date("2026-10-29T06:00:00Z")).toISOString()).toBe("2026-10-29T07:00:00.000Z");
    expect(nextPacificMidnight(new Date("2026-11-02T10:00:00Z")).toISOString()).toBe("2026-11-03T08:00:00.000Z");
  });
});

describe("limitsFromEnv", () => {
  it("uses the defaults and ignores values that aren't positive whole numbers", () => {
    expect(LIMIT_DEFAULTS).toEqual({ uploadsPerDay: 10, maxStoredUploads: 25, aiReviewsPerUserPerDay: 2500, aiReviewsPerDay: 10000 });
    expect(limitsFromEnv({})).toEqual(LIMIT_DEFAULTS);
    expect(
      limitsFromEnv({ UPLOADS_PER_DAY: "3", AI_REVIEWS_PER_USER_PER_DAY: "abc", AI_REVIEWS_PER_DAY: "-5", MAX_STORED_UPLOADS: "0" }),
    ).toEqual({ ...LIMIT_DEFAULTS, uploadsPerDay: 3 });
  });
});

describe("reserve", () => {
  let db: Db;
  let close: () => Promise<void>;
  const now = new Date("2026-10-28T12:00:00Z");

  beforeAll(async () => {
    ({ db, close } = await createTestDb());
  });

  afterAll(() => close());

  it("grants up to the limit, then nothing", async () => {
    const ask = (wanted: number) => reserve(db, { scope: "ai_reviews", subject: "user-a", limit: 50, wanted, now });
    expect(await ask(25)).toBe(25);
    expect(await ask(25)).toBe(25);
    expect(await ask(25)).toBe(0);
  });

  it("grants only what is left when a request would go over", async () => {
    const ask = (wanted: number) => reserve(db, { scope: "ai_reviews", subject: "user-b", limit: 50, wanted, now });
    expect(await ask(40)).toBe(40);
    expect(await ask(25)).toBe(10);
  });

  it("counts each subject, scope and day separately", async () => {
    const tomorrow = new Date("2026-10-29T12:00:00Z");
    expect(await reserve(db, { scope: "ai_reviews", subject: "user-c", limit: 5, wanted: 5, now })).toBe(5);
    expect(await reserve(db, { scope: "ai_reviews", subject: "user-d", limit: 5, wanted: 5, now })).toBe(5);
    expect(await reserve(db, { scope: "uploads", subject: "user-c", limit: 5, wanted: 5, now })).toBe(5);
    expect(await reserve(db, { scope: "ai_reviews", subject: "user-c", limit: 5, wanted: 5, now: tomorrow })).toBe(5);
  });

  it("never grants more than the limit to requests made at the same time", async () => {
    const ask = () => reserve(db, { scope: "ai_reviews", subject: "user-e", limit: 50, wanted: 30, now });
    const granted = await Promise.all([ask(), ask(), ask()]);
    expect(granted.reduce((sum, n) => sum + n, 0)).toBe(50);
  });
});
