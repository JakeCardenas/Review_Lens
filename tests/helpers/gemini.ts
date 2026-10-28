import type { FetchLike } from "@/lib/analysis/providers/gemini";

type GeminiRequestBody = {
  systemInstruction: { parts: { text: string }[] };
  contents: { role: string; parts: { text: string }[] }[];
};

export type GeminiCall = {
  url: string;
  /** The request body exactly as it would leave the server. */
  raw: string;
  body: GeminiRequestBody;
  /** The reviews inside the request's user message. */
  reviews: Record<string, unknown>[];
};

/**
 * A stand-in for the Gemini API, so tests never call Google. It records every request and answers
 * each review with a neutral, clear English label, changed by whatever `answer` returns for it.
 */
export function fakeGemini(answer: (review: { id: number; text: string }) => Record<string, unknown> = () => ({})) {
  const calls: GeminiCall[] = [];
  const fetch: FetchLike = async (url, init) => {
    const raw = String(init.body);
    const body = JSON.parse(raw) as GeminiRequestBody;
    const reviews = (JSON.parse(body.contents[0].parts[0].text) as { reviews: Record<string, unknown>[] }).reviews;
    calls.push({ url, raw, body, reviews });
    const results = reviews.map((review) => ({
      id: review.id,
      sentiment: "neutral",
      certainty: "clear",
      mixed_opinion: false,
      language: "english",
      topics: [],
      ...answer(review as { id: number; text: string }),
    }));
    return new Response(
      JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ results }) }] }, finishReason: "STOP" }] }),
      { status: 200 },
    );
  };
  return { fetch, calls };
}
