/** Error from one of ReviewLens's own API routes, carrying the message the server wrote for the user. */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
  } catch {
    throw new ApiRequestError("Couldn't reach the server. Check your connection and try again.", 0, "NETWORK");
  }
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiRequestError(
      body?.error?.message ?? `The server answered with an error (${response.status}).`,
      response.status,
      body?.error?.code ?? null,
    );
  }
  return body as T;
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Retries network failures and server errors (5xx); gives up at once on request errors (4xx). */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const retryable = error instanceof ApiRequestError && (error.status === 0 || error.status >= 500);
      if (!retryable || attempt >= attempts) throw error;
      await sleep(1000 * 2 ** (attempt - 1));
    }
  }
}
