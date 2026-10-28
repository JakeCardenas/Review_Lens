import Link from "next/link";
import { connection } from "next/server";
import { ChevronRight, Download, FileSpreadsheet, Info, Plus } from "lucide-react";
import { ModeBadge } from "@/components/mode-badge";
import { SentimentLegend, SentimentStackedBar } from "@/components/sentiment";
import { ButtonLink, EmptyState, Notice, PageHeader, StatusPill, buttonClasses } from "@/components/ui";
import { getProviderInfo } from "@/lib/analysis/providers";
import { formatDateTime, formatNumber } from "@/lib/format";
import { requireUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { AppError } from "@/lib/server/errors";
import { listUploads, type UploadListItem } from "@/lib/server/uploads";

function UploadSentiment({ upload }: { upload: UploadListItem }) {
  if (!upload.labeled) return <p className="text-sm text-ink-2">Not analyzed yet</p>;
  return (
    <div className="grid gap-2">
      <SentimentStackedBar counts={upload.sentiment} className="h-2.5" />
      <SentimentLegend counts={upload.sentiment} compact />
      <p className="text-[13px] text-ink-3 tabular">Shares of {formatNumber(upload.labeled)} labeled reviews</p>
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
    <div className="grid gap-8">
      <PageHeader
        art
        title="Your uploads"
        description="Upload a CSV of customer reviews to see how customers feel and what they talk about, without reading every review."
        actions={
          uploads.length > 0 && (
            <ButtonLink href="/upload">
              <Plus aria-hidden className="size-4" strokeWidth={2.75} />
              New upload
            </ButtonLink>
          )
        }
      />

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
        <p className="flex items-start gap-3 rounded-card border-2 border-line px-4 py-3 text-[15px] text-ink-2">
          <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-ink" strokeWidth={2.5} />
          <span>
            New uploads use {provider.label}.{" "}
            {provider.external
              ? "Masked review text is sent to Google's Gemini free tier, where Google may use it to improve its products. Use only public, non-sensitive reviews."
              : "Nothing is sent to an AI service."}
          </span>
        </p>
      )}

      {!setupProblem && uploads.length === 0 && (
        <EmptyState
          mascot
          title="No uploads yet"
          action={
            <>
              <ButtonLink href="/upload">
                <FileSpreadsheet aria-hidden className="size-4" />
                Upload a CSV
              </ButtonLink>
              <a href="/sample-reviews.csv" download className={buttonClasses("secondary")}>
                <Download aria-hidden className="size-4" />
                Download a sample CSV
              </a>
            </>
          }
        >
          Start with a file that has one review per row. The sample has 150 made-up reviews to try things out.
        </EmptyState>
      )}

      {uploads.length > 0 && (
        <section aria-labelledby="uploads-heading" className="grid gap-3">
          <h2 id="uploads-heading" className="sr-only">
            Uploads
          </h2>
          <ul className="grid gap-4">
            {uploads.map((upload) => {
              const inProgress = upload.status === "analyzing" || upload.status === "importing";
              const href = inProgress ? `/uploads/${upload.id}/analyze` : `/uploads/${upload.id}`;
              return (
                <li key={upload.id}>
                  <Link
                    href={href}
                    className="sticker group grid gap-4 rounded-card bg-surface px-5 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)_auto] sm:items-center sm:gap-6 sm:px-6 sm:py-5"
                  >
                    <div className="min-w-0">
                      <p title={upload.name} className="truncate text-subheading font-extrabold text-ink group-hover:text-accent-ink">
                        {upload.name}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusPill status={upload.status} />
                        <ModeBadge provider={upload.provider} />
                      </div>
                      <p title={upload.fileName} className="mt-2 truncate text-[15px] text-ink-2">
                        {upload.fileName}, {formatNumber(upload.totalRows)} rows, {formatDateTime(upload.createdAt)}
                      </p>
                      {(upload.notLabeled > 0 || upload.failed > 0) && (
                        <p className="mt-1 text-sm font-semibold text-warn-ink">
                          {[
                            upload.notLabeled > 0 && `${formatNumber(upload.notLabeled)} not labeled (language)`,
                            upload.failed > 0 && `${formatNumber(upload.failed)} failed`,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                    {inProgress ? (
                      <p className="text-sm font-semibold text-warn-ink">Analysis in progress. Open to see how far along it is.</p>
                    ) : (
                      <UploadSentiment upload={upload} />
                    )}
                    <ChevronRight aria-hidden className="hidden size-6 text-line-strong transition-transform group-hover:translate-x-0.5 group-hover:text-accent-ink sm:block" strokeWidth={3} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
