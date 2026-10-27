import type { DateFormat, RatingScale } from "@/lib/types";

export type DateFormatGuess = DateFormat | "ambiguous" | "none";

const ISO = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T].*)?$/;
const NUMERIC = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})(?:[ T,].*)?$/;
const DAY_MONTH_NAME = /^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?,?\s+(\d{4})\b/i;
const MONTH_NAME_DAY = /^([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i;

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function monthFromName(name: string): number | null {
  const index = MONTHS.indexOf(name.slice(0, 3).toLowerCase());
  return index === -1 ? null : index + 1;
}

function fullYear(year: string): number {
  if (year.length === 4) return Number(year);
  const twoDigit = Number(year);
  const currentTwoDigit = new Date().getUTCFullYear() % 100;
  return twoDigit <= currentTwoDigit + 1 ? 2000 + twoDigit : 1900 + twoDigit;
}

function toIsoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  const earliest = Date.UTC(1990, 0, 1);
  const latest = Date.now() + 24 * 60 * 60 * 1000;
  if (date.getTime() < earliest || date.getTime() > latest) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * Looks at sample values and decides whether slash dates are month-first or day-first.
 * Returns "ambiguous" rather than guessing when every value could be either.
 */
export function detectDateFormat(values: string[]): DateFormatGuess {
  let sawIsoOrNamed = false;
  let sawNumeric = false;
  let firstAbove12 = false;
  let secondAbove12 = false;
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    if (ISO.test(value) || DAY_MONTH_NAME.test(value) || MONTH_NAME_DAY.test(value)) {
      sawIsoOrNamed = true;
      continue;
    }
    const match = NUMERIC.exec(value);
    if (!match) continue;
    sawNumeric = true;
    if (Number(match[1]) > 12) firstAbove12 = true;
    if (Number(match[2]) > 12) secondAbove12 = true;
  }
  if (sawNumeric) {
    if (firstAbove12 && !secondAbove12) return "dmy";
    if (secondAbove12 && !firstAbove12) return "mdy";
    return "ambiguous";
  }
  return sawIsoOrNamed ? "ymd" : "none";
}

/** Returns an ISO date (YYYY-MM-DD) or null. Slash dates need a day/month order. */
export function parseDate(raw: string | null | undefined, format: DateFormat | null): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  let match = ISO.exec(value);
  if (match) return toIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));

  match = DAY_MONTH_NAME.exec(value);
  if (match) {
    const month = monthFromName(match[2]);
    return month ? toIsoDate(Number(match[3]), month, Number(match[1])) : null;
  }

  match = MONTH_NAME_DAY.exec(value);
  if (match) {
    const month = monthFromName(match[1]);
    return month ? toIsoDate(Number(match[3]), month, Number(match[2])) : null;
  }

  match = NUMERIC.exec(value);
  if (match && (format === "mdy" || format === "dmy")) {
    const [first, second] = [Number(match[1]), Number(match[2])];
    const year = fullYear(match[3]);
    return format === "mdy" ? toIsoDate(year, first, second) : toIsoDate(year, second, first);
  }
  return null;
}

type RatingParts = { value: number; outOf: number | null };

function readRating(raw: string): RatingParts | null {
  const value = raw.trim();
  if (!value) return null;

  const stars = value.match(/★/g)?.length ?? 0;
  if (stars > 0 && /^[★☆\s]+$/.test(value)) return { value: stars, outOf: value.replace(/\s/g, "").length };

  const normalized = value.replace(/(\d),(\d)/g, "$1.$2");
  const fraction = normalized.match(/^(-?\d+(?:\.\d+)?)\s*(?:\/|out of)\s*(\d+(?:\.\d+)?)/i);
  if (fraction) return { value: Number(fraction[1]), outOf: Number(fraction[2]) };

  const plain = normalized.match(/^(-?\d+(?:\.\d+)?)(?:\s*(?:stars?|pts?|points?))?$/i);
  if (plain) return { value: Number(plain[1]), outOf: null };
  return null;
}

/**
 * Picks the smallest rating scale (5, 10 or 100) that covers at least 95% of the readable values,
 * so one mistyped rating is reported as out of range instead of changing the scale.
 */
export function detectRatingScale(values: string[]): RatingScale | null {
  const seen: number[] = [];
  for (const raw of values) {
    const parts = readRating(raw);
    const value = parts ? (parts.outOf ?? parts.value) : NaN;
    if (Number.isFinite(value) && value > 0) seen.push(value);
  }
  if (!seen.length) return null;
  for (const scale of [5, 10, 100] as const) {
    if (seen.filter((v) => v <= scale).length / seen.length >= 0.95) return scale;
  }
  return null;
}

/** Returns a rating on the given scale, or null when it is unreadable or out of range. */
export function parseRating(raw: string | null | undefined, scale: RatingScale): number | null {
  const parts = readRating(raw ?? "");
  if (!parts) return null;
  let value = parts.value;
  if (parts.outOf && parts.outOf > 0 && parts.outOf !== scale) value = (value / parts.outOf) * scale;
  if (!Number.isFinite(value) || value < 0 || value > scale) return null;
  return Math.round(value * 100) / 100;
}
