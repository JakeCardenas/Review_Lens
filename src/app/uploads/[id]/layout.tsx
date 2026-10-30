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
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10">
      <header className="grid min-w-0 gap-5">
        <div className="min-w-0">
          <Link href="/" className="no-print press -ml-1 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-control px-1 text-[15px] font-bold text-accent-ink">
            <ArrowLeft aria-hidden className="size-4" strokeWidth={3} />
            All uploads
          </Link>
          <h1
            title={upload.name}
            className="mt-1 line-clamp-2 font-display text-[1.75rem] font-black leading-tight text-ink [overflow-wrap:anywhere] sm:text-heading-sm"
          >
            {upload.name}
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-2">
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
