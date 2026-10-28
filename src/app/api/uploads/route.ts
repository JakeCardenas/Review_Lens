import { getProvider } from "@/lib/analysis/providers";
import { CreateUploadBody } from "@/lib/contracts";
import { isPersonalColumn } from "@/lib/csv/columns";
import { requireApiUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { AppError } from "@/lib/server/errors";
import { errorResponse, json, readJson } from "@/lib/server/http";
import { checkDataNotice, createUploadForUser } from "@/lib/server/uploads";

/** Creates an upload for the signed-in account from the column mapping. Rows are sent separately in chunks. */
export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const body = await readJson(request, CreateUploadBody, 20_000);
    const mapped = Object.values(body.columnMap).filter((h): h is string => h !== null);
    const personal = mapped.find(isPersonalColumn);
    if (personal) {
      throw new AppError(
        "PERSONAL_COLUMN",
        `The column “${personal}” looks like personal information and can't be imported.`,
        400,
      );
    }
    const provider = getProvider();
    checkDataNotice(provider, body.dataNotice);
    const upload = await createUploadForUser(getDb(), body, provider, user.id);
    return json({ upload: { id: upload.id, status: upload.status } }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
