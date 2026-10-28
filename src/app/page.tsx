import Link from "next/link";
import { connection } from "next/server";
import { FileSpreadsheet, Plus } from "lucide-react";
import { ModeBadge } from "@/components/mode-badge";
import { ButtonLink, EmptyState, Notice, StatusPill } from "@/components/ui";
import { getProviderInfo } from "@/lib/analysis/providers";
import { formatDateTime, formatNumber, formatPercent } from "@/lib/format";
import { requireUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { AppError } from "@/lib/server/errors";
import { listUploads, type UploadListItem } from "@/lib/server/uploads";

function SentimentStrip({ upload }: { upload: UploadListItem }) {
  const { positive, neutral, negative } = upload.sentiment;
  if (!upload.labeled) return <p className="text-sm text-ink-2">Not analyzed yet</p>;
  return (
    <div className="grid gap-1.5">
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
        <span className="bg-pos" style={{ flex: positive }} />
        <span className="bg-neu" style={{ flex: neutral }} />
        <span className="bg-neg" style={{ flex: negative }} />
      </div>
      <p className="text-sm text-ink-2 tabular">
        {formatPercent(positive, upload.labeled)} positive, {formatPercent(negative, upload.labeled)} negative, of{" "}
        {formatNumber(upload.labeled)} labeled
      </p>
    </div>
  );
}

export default async function HomePage() {
  await connection();
  const user = await requireUser("/");
  const provider = getProviderInfo();
  let uploads: UploadListItem[] = [];
  let setupProblem: string | null = null;
  try {
    uploads = await listUploads(getDb(), user.id);
  } catch (error) {
    if (error instanceof AppError && error.code === "DATABASE_NOT_CONFIGURED") setupProblem = error.message;
    else throw error;
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Your uploads</h1>
          <p className="mt-2 text-ink-2">
            Upload a CSV of customer reviews to see how customers feel and what they talk about, without reading every review.
          </p>
        </div>
        {uploads.length > 0 && (
          <ButtonLink href="/upload">
            <Plus aria-hidden className="size-4" />
            New upload
          </ButtonLink>
        )}
      </div>

      {setupProblem && (
        <Notice tone="error" title="ReviewLens isn't connected to a database">
          {setupProblem}
        </Notice>
      )}
      {provider.problem && (
        <Notice tone="error" title="Analysis isn't configured correctly">
          {provider.problem}
        </Notice>
      )}
      {!provider.problem && (
        <p className="text-sm text-ink-2">
          Analysis method: {provider.label}.{" "}
          {provider.external
            ? "Masked review text is sent to Google's Gemini free tier, where Google may use it to improve its products. Use only public, non-sensitive reviews."
            : "Nothing is sent to an AI service."}
        </p>
      )}

      {!setupProblem && uploads.length === 0 && (
        <EmptyState
          icon={<FileSpreadsheet aria-hidden className="size-6" />}
          title="No uploads yet"
          action={
            <>
              <ButtonLink href="/upload">Upload a CSV</ButtonLink>
              <a
                href="/sample-reviews.csv"
                download
                className="press inline-flex min-h-11 items-center rounded-control px-4 font-semibold text-brand-ink hover:bg-brand-soft"
              >
                Download a sample CSV
              </a>
            </>
          }
        >
          Start with a file that has one review per row. The sample has 150 made-up reviews to try things out.
        </EmptyState>
      )}

      {uploads.length > 0 && (
        <ul className="overflow-hidden rounded-card border border-line bg-surface">
          {uploads.map((upload) => {
            const href =
              upload.status === "analyzing" || upload.status === "importing" ? `/uploads/${upload.id}/analyze` : `/uploads/${upload.id}`;
            return (
              <li key={upload.id} className="border-b border-line last:border-0">
                <Link href={href} className="press grid gap-3 px-5 py-4 hover:bg-surface-2 sm:grid-cols-[1fr_minmax(220px,320px)] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold">{upload.name}</span>
                      <StatusPill status={upload.status} />
                      <ModeBadge provider={upload.provider} />
                    </div>
                    <p className="mt-0.5 truncate text-sm text-ink-2">
                      {upload.fileName}, {formatNumber(upload.totalRows)} rows, {formatDateTime(upload.createdAt)}
                    </p>
                    {(upload.notLabeled > 0 || upload.failed > 0) && (
                      <p className="mt-0.5 text-sm text-warn-ink">
                        {[
                          upload.notLabeled > 0 && `${formatNumber(upload.notLabeled)} not labeled (language)`,
                          upload.failed > 0 && `${formatNumber(upload.failed)} failed`,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                  <SentimentStrip upload={upload} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
