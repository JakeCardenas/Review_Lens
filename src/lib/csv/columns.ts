import type { ColumnField, ColumnMap } from "@/lib/types";

export function normalizeHeader(header: string): string {
  return header
    .replace(/^﻿/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const PERSONAL_WORDS = new Set([
  "email", "e", "mail", "phone", "mobile", "telephone", "tel", "address", "street", "zip", "postal", "postcode",
  "ip", "username", "user", "reviewer", "author", "customer", "member", "account", "contact", "handle",
  "firstname", "lastname", "fullname", "order", "birthday", "dob", "gender", "age",
]);
const NAME_OK_WORDS = new Set(["product", "item", "sku", "brand", "store", "shop", "model", "category"]);
const FIELD_WORDS = new Set([
  "review", "reviews", "comment", "comments", "feedback", "text", "body", "content", "message", "opinion",
  "rating", "ratings", "stars", "star", "score", "date", "time", "created", "posted", "product", "item", "sku",
]);

/** True for columns that look like they identify a person. These are never uploaded. */
/**
 * Why a parsed CSV's header row can't be used, or null. One column is fine: a file that holds only
 * the review text has no comma to detect, so the parser's delimiter warning is not a problem.
 */
export function csvColumnsProblem(headers: string[]): string | null {
  return headers.length
    ? null
    : "ReviewLens couldn't find any columns. Make sure the first line names the columns and the file is saved as CSV (comma-separated).";
}

export function isPersonalColumn(header: string): boolean {
  const words = normalizeHeader(header).split(" ").filter(Boolean);
  if (words.some((w) => FIELD_WORDS.has(w))) return false;
  if (words.includes("name")) return !words.some((w) => NAME_OK_WORDS.has(w));
  return words.some((w) => PERSONAL_WORDS.has(w));
}

type Rule = { exact: string[]; contains: string[] };

const RULES: Record<ColumnField, Rule> = {
  text: {
    exact: [
      "review", "review text", "review body", "review content", "reviews", "text", "comment", "comments",
      "feedback", "body", "content", "message", "customer review", "customer feedback", "review comment", "opinion",
    ],
    contains: ["review", "comment", "feedback"],
  },
  date: {
    exact: ["date", "review date", "created", "created at", "timestamp", "posted", "posted at", "submitted", "submitted at", "time"],
    contains: ["date", "time"],
  },
  rating: {
    exact: ["rating", "stars", "star rating", "score", "rate", "review rating", "overall", "overall rating"],
    contains: ["rating", "star", "score"],
  },
  product: {
    exact: ["product", "product name", "item", "item name", "sku", "product id", "product title", "model"],
    contains: ["product", "item"],
  },
};

function score(header: string, rule: Rule): number {
  const name = normalizeHeader(header);
  if (rule.exact.includes(name)) return 2;
  const words = name.split(" ");
  return rule.contains.some((word) => words.includes(word)) ? 1 : 0;
}

/** Suggests which header holds each field. Personal columns are never suggested. */
export function guessColumnMapping(headers: string[]): ColumnMap {
  const available = headers.filter((h) => !isPersonalColumn(h));
  const used = new Set<string>();
  const result: ColumnMap = { text: null, date: null, rating: null, product: null };
  for (const field of ["text", "rating", "date", "product"] as const) {
    let best: string | null = null;
    let bestScore = 0;
    for (const header of available) {
      if (used.has(header)) continue;
      const s = score(header, RULES[field]);
      if (s > bestScore) {
        best = header;
        bestScore = s;
      }
    }
    if (best) {
      result[field] = best;
      used.add(best);
    }
  }
  return result;
}
