import "server-only";
import { AnthropicProvider } from "./anthropic";
import { BasicProvider } from "./basic";
import { resolveProviderConfig } from "./config";
import { ProviderError, type ProviderId, type SentimentProvider } from "./types";

export type ProviderInfo = {
  id: ProviderId | null;
  label: string;
  model: string | null;
  external: boolean;
  /** Set when the environment variables are inconsistent; uploads are blocked until fixed. */
  problem: string | null;
};

let cached: { key: string; provider: SentimentProvider | ProviderError } | null = null;

function build(): SentimentProvider | ProviderError {
  const config = resolveProviderConfig(process.env);
  if (config.kind === "basic") return new BasicProvider();
  if (config.kind === "anthropic") return new AnthropicProvider({ apiKey: config.apiKey, model: config.model });
  return new ProviderError(config.message, false);
}

function current(): SentimentProvider | ProviderError {
  const key = [process.env.SENTIMENT_PROVIDER, process.env.ANTHROPIC_MODEL, Boolean(process.env.ANTHROPIC_API_KEY)].join("|");
  if (!cached || cached.key !== key) cached = { key, provider: build() };
  return cached.provider;
}

/** The configured provider. Throws a non-retryable ProviderError when the configuration is invalid. */
export function getProvider(): SentimentProvider {
  const provider = current();
  if (provider instanceof ProviderError) throw provider;
  return provider;
}

/** What the UI shows about analysis mode. Never includes keys. */
export function getProviderInfo(): ProviderInfo {
  const provider = current();
  if (provider instanceof ProviderError) {
    return { id: null, label: "Not configured", model: null, external: false, problem: provider.message };
  }
  return { id: provider.id, label: provider.label, model: provider.model, external: provider.external, problem: null };
}
