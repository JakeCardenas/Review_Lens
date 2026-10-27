export const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5-5";

export type ProviderConfig =
  | { kind: "basic" }
  | { kind: "anthropic"; apiKey: string; model: string }
  | { kind: "misconfigured"; message: string };

/**
 * Chooses the sentiment provider from environment variables. Review text only goes to an
 * external provider when its API key is set and Basic mode is not forced.
 */
export function resolveProviderConfig(env: Record<string, string | undefined>): ProviderConfig {
  const choice = (env.SENTIMENT_PROVIDER ?? "auto").trim().toLowerCase();
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  const model = env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;

  if (choice === "basic") return { kind: "basic" };
  if (choice === "anthropic") {
    return apiKey
      ? { kind: "anthropic", apiKey, model }
      : { kind: "misconfigured", message: "SENTIMENT_PROVIDER is set to anthropic but ANTHROPIC_API_KEY is empty." };
  }
  if (choice === "auto" || choice === "") return apiKey ? { kind: "anthropic", apiKey, model } : { kind: "basic" };
  return {
    kind: "misconfigured",
    message: `SENTIMENT_PROVIDER must be "auto", "basic" or "anthropic" (got "${env.SENTIMENT_PROVIDER}").`,
  };
}
