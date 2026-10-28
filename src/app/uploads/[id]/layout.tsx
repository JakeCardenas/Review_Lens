import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { DeleteUploadButton } from "@/components/upload-actions";
import { UploadNav } from "@/components/upload-nav";
import { ModeBadge } from "@/components/mode-badge";
import { StatusPill } from "@/components/ui";
import { formatDateTime, formatNumber } from "@/lib/format";
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
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 sm:gap-10">
      <header className="grid min-w-0 gap-6">
        <Link href="/" className="no-print press nav-label inline-flex w-fit items-center gap-1.5 rounded-control py-1 pr-2 text-[13px] text-accent-ink">
          <ArrowLeft aria-hidden className="size-4" strokeWidth={3} />
          All uploads
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
          <div className="min-w-0 flex-1 basis-[26rem]">
            <h1 className="font-display text-heading-sm font-black text-brand-display [overflow-wrap:anywhere] sm:text-heading">{upload.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusPill status={upload.status} paused={progress?.paused} />
              <ModeBadge provider={upload.provider} />
            </div>
            <p className="mt-3 text-[15px] text-ink-2 [overflow-wrap:anywhere]">
              {upload.fileName}, {formatNumber(upload.totalRows)} rows, uploaded {formatDateTime(upload.createdAt)}. Labeled with{" "}
              {providerLabel(upload.provider, upload.model)}.
            </p>
          </div>
          <div className="no-print flex flex-wrap items-center gap-3">
            <DeleteUploadButton uploadId={upload.id} name={upload.name} />
          </div>
        </div>
        <UploadNav uploadId={upload.id} />
      </header>
      {children}
    </div>
  );
}
