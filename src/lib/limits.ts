/** Limits shared by the browser and the server. The server always re-checks them. */
export const LIMITS = {
  maxFileBytes: 5 * 1024 * 1024,
  maxRows: 5_000,
  maxRowsPerRequest: 500,
  maxRequestBytes: 1_500_000,
  batchSize: 25,
  maxAttempts: 3,
  maxTextLength: 4_000,
  maxRawTextLength: 6_000,
  maxProductLength: 200,
  /** Rows that sit in "processing" longer than this are handed out again. */
  staleClaimMinutes: 2,
} as const;
