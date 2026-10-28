import { connection } from "next/server";
import { Suspense } from "react";
import { DeleteUploadButton, ExportLinks } from "@/components/upload-actions";
import { UploadNav } from "@/components/upload-nav";
import { ModeBadge } from "@/components/mode-badge";
import { StatusPill } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { providerLabel } from "@/lib/provider-label";
import { requireOwnedUpload } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { getProgress } from "@/lib/server/uploads";

export default async function UploadLayout({ children, params }: LayoutProps<"/uploads/[id]">) {
  await connection();
  const { id } = await params;
  const db = getDb();
  const { user, upload } = await requireOwnedUpload(id, `/uploads/${id}`);
  const progress = await getProgress(db, user.id, id);

  return (
    <div className="grid gap-6">
      <header className="grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 break-words font-display text-3xl font-semibold tracking-tight">{upload.name}</h1>
              <StatusPill status={upload.status} paused={progress?.paused} />
              <ModeBadge provider={upload.provider} />
            </div>
            <p className="mt-1 text-sm text-ink-2">
              {upload.fileName}, uploaded {formatDateTime(upload.createdAt)}. Labeled with {providerLabel(upload.provider, upload.model)}.
            </p>
          </div>
          <div className="no-print flex flex-wrap items-center gap-2">
            <Suspense fallback={null}>
              <ExportLinks uploadId={upload.id} />
            </Suspense>
            <DeleteUploadButton uploadId={upload.id} name={upload.name} />
          </div>
        </div>
        <UploadNav uploadId={upload.id} />
      </header>
      {children}
    </div>
  );
}
