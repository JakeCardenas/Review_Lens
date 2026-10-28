import Link from "next/link";
import { connection } from "next/server";
import { ChevronRight, Download, Info, Upload } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { JourneyPath } from "@/components/journey-path";
import { ModeBadge } from "@/components/mode-badge";
import { SentimentLegend, SentimentStackedBar } from "@/components/sentiment";
import { ButtonLink, Notice, StatusPill } from "@/components/ui";
import { getProviderInfo } from "@/lib/analysis/providers";
import { formatDateTime, formatNumber, plural } from "@/lib/format";
import { JOURNEY_STEPS, uploadJourneyStep } from "@/lib/journey";
import { requireUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { AppError } from "@/lib/server/errors";
import { listUploads, type UploadListItem } from "@/lib/server/uploads";

const STEP_HELP = [
  "Choose a CSV file with one review per row.",
  "Tell ReviewLens which column holds the review text. Dates, ratings and products are optional.",
  "ReviewLens labels each review positive, neutral or negative.",
  "See how customers feel, what they mention most and which reviews to read first.",
];

/** No uploads yet: a short welcome, one action and the four steps. */
function Welcome() {
  return (
    <section className="mx-auto grid max-w-3xl justify-items-center gap-6 text-center">
      <BrandMark height={180} priority />
      <div className="grid gap-3">
        <h1 className="font-display text-heading-sm font-black text-brand-display sm:text-heading">Welcome to ReviewLens</h1>
        <p className="mx-auto max-w-xl text-body text-ink-2">
          Upload a CSV of customer reviews and see how customers feel and what they talk about, without reading every review.
        </p>
      </div>
      <ButtonLink href="/upload" data-home-upload>
        <Upload aria-hidden className="size-5" strokeWidth={2.75} />
        Upload reviews
      </ButtonLink>
      <div className="mt-6 w-full rounded-card border-2 border-line p-6 text-left sm:p-8">
        <h2 className="nav-label text-center text-[13px] text-ink-2">How it works</h2>
        <div className="mt-6">
          <JourneyPath current={0} label="How ReviewLens works" />
        </div>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2">
          {JOURNEY_STEPS.map((step, i) => (
            <li key={step} className="flex gap-3">
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft font-display font-black text-brand-ink">
                {i + 1}
              </span>
              <span>
                <span className="block font-extrabold text-ink">{step}</span>
                <span className="block text-[15px] text-ink-2">{STEP_HELP[i]}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-center text-[15px] text-ink-2">
          No file yet?{" "}
          <a
            href="/sample-reviews.csv"
            download
            className="inline-flex items-center gap-1 font-bold text-accent-ink underline decoration-accent/50 decoration-2 underline-offset-[3px]"
          >
            <Download aria-hidden className="size-4" />
            Download a sample CSV
          </a>
        </p>
      </div>
    </section>
  );
}

/** The most recent upload: where it is on the path and the one thing to do next. */
function LatestUpload({ upload }: { upload: UploadListItem }) {
  const step = uploadJourneyStep(upload.status);
  return (
    <section aria-labelledby="latest-title" className="min-w-0 rounded-card border-2 border-line bg-surface p-5 sm:p-8">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="nav-label mr-2 text-[13px] text-ink-2">Latest upload</h2>
        <StatusPill status={upload.status} />
        <ModeBadge provider={upload.provider} />
      </div>
      <p id="latest-title" title={upload.name} className="mt-3 line-clamp-3 text-2xl font-extrabold text-ink [overflow-wrap:anywhere] sm:text-heading-sm">
        {upload.name}
      </p>
      <p className="mt-1 text-[15px] text-ink-2 [overflow-wrap:anywhere]">
        {upload.fileName}, {plural(upload.totalRows, "row")}, uploaded {formatDateTime(upload.createdAt)}
      </p>

      <div className="mt-8">
        <JourneyPath current={step} />
      </div>

      {step === 0 && (
        <div className="mt-8 flex flex-wrap items-center gap-4 border-t-2 border-line pt-6">
          <ButtonLink href="/upload">Upload again</ButtonLink>
          <p className="max-w-md text-[15px] text-ink-2">The page was closed before every row was sent, so this file needs to be uploaded again.</p>
        </div>
      )}
      {step === 2 && (
        <div className="mt-8 flex flex-wrap items-center gap-4 border-t-2 border-line pt-6">
          <ButtonLink href={`/uploads/${upload.id}/analyze`}>Continue analysis</ButtonLink>
          <p className="max-w-md text-[15px] text-ink-2">
            {formatNumber(upload.labeled)} of {plural(upload.totalRows, "review")} labeled so far.
          </p>
        </div>
      )}
      {step === 3 && (
        <div className="mt-8 grid gap-5 border-t-2 border-line pt-6">
          {upload.labeled ? (
            <>
              <p className="text-ink-2">
                <span className="font-display text-heading-sm font-black text-ink">{formatNumber(upload.labeled)}</span> reviews analyzed
              </p>
              <SentimentStackedBar counts={upload.sentiment} className="h-5" />
              <SentimentLegend counts={upload.sentiment} />
            </>
          ) : (
            <p className="text-[15px] text-ink-2">No reviews in this file could be labeled.</p>
          )}
          <div>
            <ButtonLink href={`/uploads/${upload.id}`}>See insights</ButtonLink>
          </div>
        </div>
      )}
    </section>
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
  const [latest, ...earlier] = uploads;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10">
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

      {!setupProblem && !latest && <Welcome />}

      {latest && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-2xl">
              <h1 className="font-display text-heading-sm font-black text-brand-display sm:text-heading">Your reviews</h1>
              <p className="mt-2 text-body text-ink-2">Pick up where you left off, or upload another file.</p>
            </div>
            <ButtonLink href="/upload" data-home-upload>
              <Upload aria-hidden className="size-5" strokeWidth={2.75} />
              Upload reviews
            </ButtonLink>
          </div>

          <LatestUpload upload={latest} />

          {earlier.length > 0 && (
            <section aria-labelledby="earlier-title" className="grid grid-cols-[minmax(0,1fr)] gap-3">
              <h2 id="earlier-title" className="nav-label text-[13px] text-ink-2">
                Earlier uploads
              </h2>
              <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
                {earlier.map((upload) => {
                  const step = uploadJourneyStep(upload.status);
                  const href = step === 2 ? `/uploads/${upload.id}/analyze` : `/uploads/${upload.id}`;
                  return (
                    <li key={upload.id}>
                      <Link href={href} className="sticker group flex items-center gap-4 rounded-card bg-surface px-5 py-4">
                        {/* On phones the status sits under the name, so the name and date keep the full width. */}
                        <span className="flex min-w-0 flex-1 flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
                          <span className="w-full min-w-0 sm:flex-1">
                            <span title={upload.name} className="block truncate font-extrabold text-ink group-hover:text-accent-ink">
                              {upload.name}
                            </span>
                            <span className="mt-0.5 block truncate text-[15px] text-ink-2">
                              {step === 3 ? `${plural(upload.labeled, "review")} analyzed` : step === 2 ? "Analysis in progress" : "Import didn't finish"},{" "}
                              {formatDateTime(upload.createdAt)}
                            </span>
                          </span>
                          <StatusPill status={upload.status} />
                        </span>
                        <ChevronRight
                          aria-hidden
                          className="size-6 shrink-0 text-line-strong transition-transform group-hover:translate-x-0.5 group-hover:text-accent-ink"
                          strokeWidth={3}
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {!provider.problem && (
            <p className="flex items-start gap-2 text-[15px] text-ink-2">
              <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-ink" strokeWidth={2.5} />
              <span>
                New uploads use {provider.label}.{" "}
                {provider.external
                  ? "Masked review text is sent to Google's Gemini free tier, where Google may use it to improve its products. Use only public, non-sensitive reviews."
                  : "Nothing is sent to an AI service."}
              </span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
