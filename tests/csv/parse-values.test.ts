import { describe, expect, it } from "vitest";
import { detectDateFormat, detectRatingScale, parseDate, parseRating } from "@/lib/csv/parse-values";

describe("detectDateFormat", () => {
  it("returns ymd when every date is ISO", () => {
    expect(detectDateFormat(["2025-03-04", "2025-12-30T10:00:00Z", ""])).toBe("ymd");
  });

  it("detects day-first dates from a day above 12", () => {
    expect(detectDateFormat(["03/04/2025", "25/04/2025"])).toBe("dmy");
  });

  it("detects month-first dates from a day above 12", () => {
    expect(detectDateFormat(["03/04/2025", "04/25/2025"])).toBe("mdy");
  });

  it("reports ambiguity instead of guessing", () => {
    expect(detectDateFormat(["03/04/2025", "11/12/2025"])).toBe("ambiguous");
  });

  it("returns none when nothing looks like a date", () => {
    expect(detectDateFormat(["", "soon", "n/a"])).toBe("none");
  });
});

describe("parseDate", () => {
  it("parses ISO dates and datetimes", () => {
    expect(parseDate("2025-03-04", "ymd")).toBe("2025-03-04");
    expect(parseDate("2025-03-04 18:22", null)).toBe("2025-03-04");
  });

  it("uses the chosen order for slash dates", () => {
    expect(parseDate("03/04/2025", "mdy")).toBe("2025-03-04");
    expect(parseDate("03/04/2025", "dmy")).toBe("2025-04-03");
  });

  it("refuses to guess a slash date without an order", () => {
    expect(parseDate("03/04/2025", null)).toBeNull();
  });

  it("parses month names", () => {
    expect(parseDate("Oct 3, 2025", null)).toBe("2025-10-03");
    expect(parseDate("3 October 2025", null)).toBe("2025-10-03");
  });

  it("rejects impossible or out-of-range dates", () => {
    expect(parseDate("2025-02-30", "ymd")).toBeNull();
    expect(parseDate("1890-01-01", "ymd")).toBeNull();
    expect(parseDate("2999-01-01", "ymd")).toBeNull();
    expect(parseDate("tomorrow", "ymd")).toBeNull();
  });
});

describe("detectRatingScale", () => {
  it("finds a 1-5 scale", () => {
    expect(detectRatingScale(["1", "5", "4.5", ""])).toBe(5);
  });

  it("finds a 1-10 scale", () => {
    expect(detectRatingScale(["7", "10", "3"])).toBe(10);
  });

  it("reads the denominator of fractions", () => {
    expect(detectRatingScale(["8/10", "6/10"])).toBe(10);
  });

  it("ignores a rare out-of-range value when picking the scale", () => {
    const values = [...Array(40).fill("5"), ...Array(30).fill("1"), "6"];
    expect(detectRatingScale(values)).toBe(5);
  });

  it("returns null when no rating is numeric", () => {
    expect(detectRatingScale(["great", ""])).toBeNull();
  });
});

describe("parseRating", () => {
  it("reads plain numbers, fractions, words and stars", () => {
    expect(parseRating("4", 5)).toBe(4);
    expect(parseRating("4,5", 5)).toBe(4.5);
    expect(parseRating("4/5", 5)).toBe(4);
    expect(parseRating("8/10", 5)).toBe(4);
    expect(parseRating("4 out of 5 stars", 5)).toBe(4);
    expect(parseRating("★★★★☆", 5)).toBe(4);
  });

  it("returns null for values outside the scale or unreadable", () => {
    expect(parseRating("11", 5)).toBeNull();
    expect(parseRating("-1", 5)).toBeNull();
    expect(parseRating("good", 5)).toBeNull();
  });
});
