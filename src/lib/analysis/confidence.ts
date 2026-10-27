import type { Confidence, LanguageStatus, RatingScale, Sentiment } from "@/lib/types";

export type Certainty = "clear" | "leaning" | "unclear";

export type ReasonCode =
  | "model_clear"
  | "model_leaning"
  | "model_unclear"
  | "wordlist_strong"
  | "wordlist_weak"
  | "rating_agrees"
  | "rating_partly_agrees"
  | "rating_disagrees"
  | "mixed_opinion"
  | "short_text"
  | "mixed_language"
  | "language_uncertain"
  | "basic_mode";

export const REASON_TEXT: Record<ReasonCode, string> = {
  model_clear: "The AI model found the wording clear.",
  model_leaning: "The AI model leaned toward this label but wasn't certain.",
  model_unclear: "The AI model found the wording unclear.",
  wordlist_strong: "Several opinion words point the same way.",
  wordlist_weak: "Few or conflicting opinion words were found.",
  rating_agrees: "The star rating agrees with the label.",
  rating_partly_agrees: "The star rating only partly agrees with the label.",
  rating_disagrees: "The star rating disagrees with the wording.",
  mixed_opinion: "The review mixes praise and complaints.",
  short_text: "The review is very short.",
  mixed_language: "The review mixes languages.",
  language_uncertain: "The review is too short to confirm its language.",
  basic_mode: "Basic mode never marks a label as High.",
};

export type ConfidenceInput = {
  mode: "ai" | "basic" | "mock";
  sentiment: Sentiment;
  certainty: Certainty;
  mixedOpinion: boolean;
  mixedLanguage: boolean;
  wordCount: number;
  languageStatus: LanguageStatus;
  /** Rating placed between 0 (lowest) and 1 (highest), or null when there is no rating. */
  ratingPosition: number | null;
};

const LEVELS: Confidence[] = ["low", "medium", "high"];

export function ratingPosition(rating: number | null, scale: RatingScale | null): number | null {
  if (rating === null || !scale) return null;
  const min = scale === 100 ? 0 : 1;
  const position = Math.min(1, Math.max(0, (rating - min) / (scale - min)));
  return Math.round(position * 100) / 100;
}

/**
 * Turns the model's own certainty plus simple checks into High / Medium / Low.
 * This is a ranking of how sure the label is, not a probability of being correct.
 */
export function computeConfidence(input: ConfidenceInput): { level: Confidence; reasons: ReasonCode[] } {
  const basic = input.mode === "basic";
  let rank = input.certainty === "clear" ? 2 : input.certainty === "leaning" ? (basic ? 0 : 1) : 0;
  const reasons: ReasonCode[] = basic
    ? [input.certainty === "clear" ? "wordlist_strong" : "wordlist_weak"]
    : [input.certainty === "clear" ? "model_clear" : input.certainty === "leaning" ? "model_leaning" : "model_unclear"];
  const cap = (max: number, reason: ReasonCode) => {
    if (rank > max) rank = max;
    reasons.push(reason);
  };

  if (input.ratingPosition !== null) {
    const r = input.ratingPosition;
    const expected: Sentiment = r >= 0.75 ? "positive" : r <= 0.25 ? "negative" : "neutral";
    const opposite =
      (input.sentiment === "positive" && expected === "negative") ||
      (input.sentiment === "negative" && expected === "positive");
    if (input.sentiment === expected) reasons.push("rating_agrees");
    else if (opposite) cap(0, "rating_disagrees");
    else cap(1, "rating_partly_agrees");
  }
  if (input.mixedOpinion) cap(1, "mixed_opinion");
  if (input.wordCount < 4) cap(1, "short_text");
  if (input.mixedLanguage || input.languageStatus === "mixed") cap(0, "mixed_language");
  else if (input.languageStatus === "undetermined") cap(1, "language_uncertain");
  if (basic && rank > 1) cap(1, "basic_mode");

  return { level: LEVELS[rank], reasons };
}
