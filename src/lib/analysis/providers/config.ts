/**
 * Gemini text models listed as "Free of charge" on the free tier of
 * https://ai.google.dev/gemini-api/docs/pricing (checked 2026-10-27). Google can change this list;
 * check the pricing page before adding a model.
 */
export const FREE_TIER_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
] as const;

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

export type ProviderConfig =
  | { kind: "basic" }
  | { kind: "gemini"; apiKey: string; model: string }
  | { kind: "misconfigured"; message: string };

/**
 * Chooses the sentiment provider from environment variables. Review text only goes to Google when
 * GEMINI_API_KEY is set and Basic mode is not forced. No paid provider is ever chosen.
 */
export function resolveProviderConfig(env: Record<string, string | undefined>): ProviderConfig {
  const choice = (env.SENTIMENT_PROVIDER ?? "auto").trim().toLowerCase();
  const apiKey = env.GEMINI_API_KEY?.trim();
  const model = env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  if (choice === "basic") return { kind: "basic" };
  if (choice !== "auto" && choice !== "" && choice !== "gemini") {
    return {
      kind: "misconfigured",
      message: `SENTIMENT_PROVIDER must be "auto", "basic" or "gemini" (got "${env.SENTIMENT_PROVIDER}"). ReviewLens no longer uses paid AI providers.`,
    };
  }
  if (!apiKey) {
    return choice === "gemini"
      ? { kind: "misconfigured", message: "SENTIMENT_PROVIDER is set to gemini but GEMINI_API_KEY is empty." }
      : { kind: "basic" };
  }
  if (!(FREE_TIER_MODELS as readonly string[]).includes(model)) {
    return {
      kind: "misconfigured",
      message: `GEMINI_MODEL "${model}" isn't one of the free-tier models ReviewLens allows: ${FREE_TIER_MODELS.join(", ")}.`,
    };
  }
  return { kind: "gemini", apiKey, model };
}
