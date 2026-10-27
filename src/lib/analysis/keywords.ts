import { SENTIMENTS, type Sentiment } from "@/lib/types";
import { FUNCTION_WORDS, NEGATIONS } from "./english";
import { TAGALOG_FUNCTION_WORDS, TAGALOG_NEGATIONS, TAGALOG_SPELLINGS } from "./tagalog";

const MAX_KEYWORDS = 30;
const MASK = /\[(?:email|phone|link|handle|number)\]/gi;

function isNegation(token: string): boolean {
  return NEGATIONS.has(token) || TAGALOG_NEGATIONS.has(token);
}

function isUsefulWord(token: string): boolean {
  return (
    token.length >= 3 &&
    !FUNCTION_WORDS.has(token) &&
    !TAGALOG_FUNCTION_WORDS.has(token) &&
    !TAGALOG_NEGATIONS.has(token) &&
    !/^\d+$/.test(token)
  );
}

/** Unique words and two-word phrases worth counting, in reading order. */
export function extractKeywords(text: string): string[] {
  const found = new Set<string>();
  const clauses = text.replace(MASK, " | ").toLowerCase().replace(/’/g, "'").split(/[.!?;:,()|\n]+/);
  for (const clause of clauses) {
    const tokens = (clause.match(/[\p{L}\p{N}]+(?:'\p{L}+)?/gu) ?? []).map((t) => TAGALOG_SPELLINGS.get(t) ?? t);
    tokens.forEach((token, i) => {
      if (isUsefulWord(token)) found.add(token);
      const next = tokens[i + 1];
      if (next && isUsefulWord(next) && (isUsefulWord(token) || isNegation(token))) found.add(`${token} ${next}`);
    });
    if (found.size >= MAX_KEYWORDS) break;
  }
  return [...found].slice(0, MAX_KEYWORDS);
}

export type KeywordCount = { sentiment: Sentiment; term: string; n: number };
export type RankedKeyword = { term: string; count: number; share: number };
export type KeywordsBySentiment = Record<Sentiment, RankedKeyword[]>;

/**
 * Picks, for each sentiment, keywords found in at least `minCount` reviews that are more
 * common in that sentiment than in the others. `share` is the fraction of that sentiment's reviews.
 */
export function rankKeywords(
  rows: KeywordCount[],
  totals: Record<Sentiment, number>,
  limit = 8,
  minCount = 2,
): KeywordsBySentiment {
  const counts = new Map<string, Record<Sentiment, number>>();
  for (const { sentiment, term, n } of rows) {
    const entry = counts.get(term) ?? { positive: 0, neutral: 0, negative: 0 };
    entry[sentiment] += n;
    counts.set(term, entry);
  }

  const result = { positive: [], neutral: [], negative: [] } as KeywordsBySentiment;
  for (const sentiment of SENTIMENTS) {
    const total = totals[sentiment];
    if (!total) continue;
    const otherTotal = SENTIMENTS.filter((s) => s !== sentiment).reduce((sum, s) => sum + totals[s], 0);
    const ranked: RankedKeyword[] = [];
    for (const [term, entry] of counts) {
      const count = entry[sentiment];
      if (count < minCount) continue;
      const share = count / total;
      const otherCount = SENTIMENTS.filter((s) => s !== sentiment).reduce((sum, s) => sum + entry[s], 0);
      const otherShare = otherTotal ? otherCount / otherTotal : 0;
      if (share > otherShare) ranked.push({ term, count, share: Math.round(share * 100) / 100 });
    }
    ranked.sort((a, b) => b.count - a.count || b.share - a.share || a.term.localeCompare(b.term));
    result[sentiment] = ranked.slice(0, limit);
  }
  return result;
}
