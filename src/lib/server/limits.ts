import type { Db } from "./db-types";

/** Daily limits that keep one account (or everyone together) from using up the Gemini free tier. */
export type Limits = {
  /** New uploads one account can start per day. Deleting an upload doesn't give one back. */
  uploadsPerDay: number;
  /** Uploads one account can keep at once. */
  maxStoredUploads: number;
  /** Reviews one account can send to Gemini per day. */
  aiReviewsPerUserPerDay: number;
  /** Reviews the whole app can send to Gemini per day. */
  aiReviewsPerDay: number;
};

export const LIMIT_DEFAULTS: Limits = {
  uploadsPerDay: 10,
  maxStoredUploads: 25,
  aiReviewsPerUserPerDay: 2500,
  aiReviewsPerDay: 10000,
};

const ENV_NAMES: Record<keyof Limits, string> = {
  uploadsPerDay: "UPLOADS_PER_DAY",
  maxStoredUploads: "MAX_STORED_UPLOADS",
  aiReviewsPerUserPerDay: "AI_REVIEWS_PER_USER_PER_DAY",
  aiReviewsPerDay: "AI_REVIEWS_PER_DAY",
};

/** The limits, with any positive whole numbers set in the environment replacing the defaults. */
export function limitsFromEnv(env: Record<string, string | undefined> = process.env): Limits {
  const limits = { ...LIMIT_DEFAULTS };
  for (const key of Object.keys(ENV_NAMES) as (keyof Limits)[]) {
    const value = env[ENV_NAMES[key]]?.trim();
    if (value && /^\d+$/.test(value) && Number(value) > 0) limits[key] = Number(value);
  }
  return limits;
}

const TIME_ZONE = "America/Los_Angeles";
const dateInPacific = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const hourInPacific = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23" });

/** Today's date in Pacific time (YYYY-MM-DD). Gemini's daily free-tier quota resets at midnight there too. */
export function pacificDay(now: Date): string {
  return dateInPacific.format(now);
}

/** The moment the next Pacific day starts, when the daily limits reset. */
export function nextPacificMidnight(now: Date): Date {
  const [year, month, day] = pacificDay(now).split("-").map(Number);
  // Pacific midnight is 07:00 or 08:00 UTC depending on daylight saving time.
  for (const hour of [7, 8]) {
    const candidate = new Date(Date.UTC(year, month - 1, day + 1, hour));
    if (Number(hourInPacific.format(candidate)) === 0) return candidate;
  }
  return new Date(Date.UTC(year, month - 1, day + 1, 8));
}

export type Reservation = {
  /** What is being counted, such as "ai_reviews" or "uploads". */
  scope: string;
  /** Whose count it is: an account id, or "all" for the whole app. */
  subject: string;
  limit: number;
  wanted: number;
  now?: Date;
};

/**
 * Takes up to `wanted` from today's allowance and returns how much was granted (0 when the limit is
 * reached). The row is locked while it is read and updated, so requests made at the same time can't
 * together go over the limit.
 */
export async function reserve(db: Db, { scope, subject, limit, wanted, now = new Date() }: Reservation): Promise<number> {
  if (wanted <= 0) return 0;
  const day = pacificDay(now);
  return db.transaction(async (tx) => {
    await tx.query(
      `insert into usage_counters (scope, subject, day) values ($1, $2, $3::date) on conflict do nothing`,
      [scope, subject, day],
    );
    const [row] = await tx.query<{ used: number }>(
      `select used from usage_counters where scope = $1 and subject = $2 and day = $3::date for update`,
      [scope, subject, day],
    );
    const granted = Math.max(0, Math.min(wanted, limit - row.used));
    if (granted > 0) {
      await tx.query(
        `update usage_counters set used = used + $4 where scope = $1 and subject = $2 and day = $3::date`,
        [scope, subject, day, granted],
      );
    }
    return granted;
  });
}

/** Gives back part of a reservation that wasn't used. */
export async function release(
  db: Db,
  { scope, subject, amount, now = new Date() }: { scope: string; subject: string; amount: number; now?: Date },
): Promise<void> {
  if (amount <= 0) return;
  await db.query(
    `update usage_counters set used = greatest(used - $4, 0) where scope = $1 and subject = $2 and day = $3::date`,
    [scope, subject, pacificDay(now), amount],
  );
}

/** Who ran out when a Gemini batch gets no allowance: the account, or the whole app. */
export type AiLimitHit = "account" | "app";

/**
 * Takes up to `wanted` reviews from both the account's and the app's daily Gemini allowance.
 * Whatever the app limit turns away is given back to the account, so it isn't charged for it.
 */
export async function reserveAiReviews(
  db: Db,
  ownerId: string,
  wanted: number,
  limits: Limits,
  now: Date = new Date(),
): Promise<{ granted: number; stoppedBy: AiLimitHit | null }> {
  const fromAccount = await reserve(db, { scope: "ai_reviews", subject: ownerId, limit: limits.aiReviewsPerUserPerDay, wanted, now });
  if (!fromAccount) return { granted: 0, stoppedBy: "account" };
  const fromApp = await reserve(db, { scope: "ai_reviews", subject: "all", limit: limits.aiReviewsPerDay, wanted: fromAccount, now });
  await release(db, { scope: "ai_reviews", subject: ownerId, amount: fromAccount - fromApp, now });
  return { granted: fromApp, stoppedBy: fromApp ? null : "app" };
}
