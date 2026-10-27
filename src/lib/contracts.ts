import { z } from "zod";
import { LIMITS } from "./limits";

const header = z.string().trim().min(1).max(200);

/** Body of POST /api/uploads. Only header names are sent, never cell values. */
export const CreateUploadBody = z
  .object({
    name: z.string().trim().min(1).max(120),
    fileName: z.string().trim().min(1).max(255),
    columnMap: z
      .object({ text: header, date: header.nullable(), rating: header.nullable(), product: header.nullable() })
      .strict(),
    dateFormat: z.enum(["ymd", "mdy", "dmy"]).nullable(),
    ratingScale: z.union([z.literal(5), z.literal(10), z.literal(100)]).nullable(),
    totalRows: z.number().int().min(1).max(LIMITS.maxRows),
    /** Required in AI mode: the person accepted that masked review text goes to Google's free tier. */
    dataNotice: z.literal("accepted").optional(),
  })
  .strict();

export type CreateUploadBody = z.infer<typeof CreateUploadBody>;

/** One mapped CSV row. `.strict()` rejects any extra field, so unmapped columns can't be sent. */
export const RawRowBody = z
  .object({
    rowNumber: z.number().int().min(2).max(LIMITS.maxRows + 1),
    text: z.string().max(LIMITS.maxRawTextLength),
    date: z.string().max(100).nullable().optional(),
    rating: z.string().max(50).nullable().optional(),
    product: z.string().max(500).nullable().optional(),
  })
  .strict();

export const RowsBody = z.object({ rows: z.array(RawRowBody).min(1).max(LIMITS.maxRowsPerRequest) }).strict();

export type ApiError = { error: { code: string; message: string } };
