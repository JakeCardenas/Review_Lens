import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { UploadNav } from "@/components/upload-nav";
import { ModeBadge } from "@/components/mode-badge";
import { StatusPill } from "@/components/ui";
import { formatDateTime, plural } from "@/lib/format";
import { requireOwnedUpload } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { getProgress } from "@/lib/server/uploads";

/** A compact title area for every upload page: back link, name, status and file, then the section tabs. */
export default async function UploadLayout({ children, params }: LayoutProps<"/uploads/[id]">) {
  await connection();
  const { id } = await params;
  const db = getDb();
  const { user, upload } = await requireOwnedUpload(id, `/uploads/${id}`);
  const progress = await getProgress(db, user.id, id);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <header className="grid min-w-0 gap-5">
        <Link href="/" className="no-print press inline-flex w-fit items-center gap-1.5 rounded-control py-1 pr-2 text-[15px] font-bold text-accent-ink">
          <ArrowLeft aria-hidden className="size-4" strokeWidth={3} />
          All uploads
        </Link>
        <div className="min-w-0">
          <h1
            title={upload.name}
            className="line-clamp-3 font-display text-[1.75rem] font-black leading-tight text-ink [overflow-wrap:anywhere] sm:text-heading-sm"
          >
            {upload.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <StatusPill status={upload.status} paused={progress?.paused} />
            <ModeBadge provider={upload.provider} />
            <span className="text-[15px] text-ink-2 [overflow-wrap:anywhere]">
              {upload.fileName}, {plural(upload.totalRows, "row")}, uploaded {formatDateTime(upload.createdAt)}
            </span>
          </div>
        </div>
        <UploadNav uploadId={upload.id} />
      </header>
      {children}
    </div>
  );
}
