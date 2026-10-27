import type { ProviderItem, ProviderResult, SentimentProvider } from "./types";

/** Deterministic provider for tests. Never used by the running app. */
export class MockProvider implements SentimentProvider {
  readonly id = "mock" as const;
  readonly model = "mock-1";
  readonly label = "Test provider";
  readonly external = false;
  readonly supportsMixedLanguage = true;

  async analyze(items: ProviderItem[]): Promise<ProviderResult[]> {
    return items.map(({ id, text }) => {
      const sentiment = /\b(love|great|excellent|perfect)\b/i.test(text)
        ? "positive"
        : /\b(hate|terrible|broke|broken|awful|late|rude)\b/i.test(text)
          ? "negative"
          : "neutral";
      return {
        id,
        sentiment,
        certainty: sentiment === "neutral" ? "leaning" : "clear",
        mixedOpinion: false,
        mixedLanguage: false,
        output: { rule: sentiment },
      };
    });
  }
}
