import vader from "vader-sentiment";
import type { Sentiment } from "@/lib/types";
import type { Certainty } from "../confidence";
import type { ProviderItem, ProviderResult, SentimentProvider } from "./types";

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Local, rule-based sentiment from the VADER word list. Nothing leaves the server. */
export class BasicProvider implements SentimentProvider {
  readonly id = "basic" as const;
  readonly model = "vader-sentiment-1.1.3";
  readonly label = "Basic mode (VADER word list)";
  readonly external = false;
  readonly supportsMixedLanguage = false;

  async analyze(items: ProviderItem[]): Promise<ProviderResult[]> {
    return items.map(({ id, text }) => {
      const { neg, neu, pos, compound } = vader.SentimentIntensityAnalyzer.polarity_scores(text);
      const sentiment: Sentiment = compound >= 0.05 ? "positive" : compound <= -0.05 ? "negative" : "neutral";
      const strength = Math.abs(compound);
      const opinionShare = pos + neg;
      let certainty: Certainty;
      if (sentiment === "neutral") certainty = opinionShare >= 0.1 ? "unclear" : "leaning";
      else if (strength >= 0.6 && opinionShare >= 0.15) certainty = "clear";
      else if (strength >= 0.3) certainty = "leaning";
      else certainty = "unclear";
      return {
        id,
        sentiment,
        certainty,
        mixedOpinion: pos >= 0.15 && neg >= 0.15,
        mixedLanguage: false,
        output: { compound: round(compound), pos: round(pos), neu: round(neu), neg: round(neg) },
      };
    });
  }
}
