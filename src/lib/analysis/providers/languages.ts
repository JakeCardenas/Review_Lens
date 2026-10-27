import type { ProviderId } from "./types";

/** Languages (ISO 639-3) each provider can label. Reviews in other languages are left unlabeled. */
const PROVIDER_LANGUAGES: Record<ProviderId, readonly string[]> = {
  basic: ["eng"],
  gemini: ["eng", "tgl"],
  mock: ["eng", "tgl"],
};

export function providerLanguages(providerId: string): readonly string[] {
  return PROVIDER_LANGUAGES[providerId as ProviderId] ?? ["eng"];
}
