/** Human-readable name for the method that labeled an upload. Safe to use in the browser. */
export function providerLabel(provider: string, model: string): string {
  if (provider === "gemini") return `AI mode (Gemini free tier, ${model})`;
  if (provider === "basic") return "Basic mode (VADER word list)";
  if (provider === "mock") return "Test provider";
  return `${provider} (${model})`;
}
