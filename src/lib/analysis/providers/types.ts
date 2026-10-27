import type { Sentiment } from "@/lib/types";
import type { Certainty } from "../confidence";
import type { TopicId } from "../topics";

export type ProviderId = "basic" | "gemini" | "mock";

export type ProviderItem = { id: number; text: string };

export type ProviderResult = {
  id: number;
  sentiment: Sentiment;
  certainty: Certainty;
  mixedOpinion: boolean;
  mixedLanguage: boolean;
  /** Topics the provider found itself. When absent, topics come from ReviewLens's word lists. */
  topics?: TopicId[];
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

/**
 * A provider failure. `retryable` is false for problems that retrying cannot fix, such as a bad key
 * or a used-up daily quota. `retryAfterMs` asks the caller to wait that long and try the same reviews
 * again without counting it as a failed attempt (a per-minute limit).
 */
export class ProviderError extends Error {
  readonly code: string | undefined;
  readonly retryAfterMs: number | undefined;

  constructor(
    message: string,
    readonly retryable: boolean,
    options: { code?: string; retryAfterMs?: number } = {},
  ) {
    super(message);
    this.name = "ProviderError";
    this.code = options.code;
    this.retryAfterMs = options.retryAfterMs;
  }
}
