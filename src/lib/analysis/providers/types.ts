import type { Sentiment } from "@/lib/types";
import type { Certainty } from "../confidence";

export type ProviderId = "basic" | "anthropic" | "mock";

export type ProviderItem = { id: number; text: string };

export type ProviderResult = {
  id: number;
  sentiment: Sentiment;
  certainty: Certainty;
  mixedOpinion: boolean;
  mixedLanguage: boolean;
  /** The provider's raw answer, stored for debugging and evaluation. */
  output: Record<string, unknown>;
};

/**
 * Anything that can label review text. Upload processing and the dashboard only use this
 * interface, so a provider can be swapped without touching them.
 */
export interface SentimentProvider {
  readonly id: ProviderId;
  readonly model: string;
  /** Short name shown to users, e.g. "Basic mode (VADER word list)". */
  readonly label: string;
  /** True when review text leaves this server. */
  readonly external: boolean;
  /** True when the provider can label reviews that mix two languages. */
  readonly supportsMixedLanguage: boolean;
  analyze(items: ProviderItem[]): Promise<ProviderResult[]>;
}

/** A provider failure. `retryable` is false for problems that retrying cannot fix, such as a bad key. */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
