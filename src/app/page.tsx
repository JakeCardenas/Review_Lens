import Link from "next/link";
import { connection } from "next/server";
import { ChevronRight, Download, Info, Upload } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { JourneyPath } from "@/components/journey-path";
import { ModeBadge } from "@/components/mode-badge";
import { PublicWelcome } from "@/components/public-welcome";
import { SentimentStackedBar } from "@/components/sentiment";
import { ButtonLink, Notice, StatusPill, linkClasses } from "@/components/ui";
import { getProviderInfo } from "@/lib/analysis/providers";
import { formatDateTime, formatNumber, formatPercent, plural } from "@/lib/format";
import { JOURNEY_STEPS, uploadJourneyStep } from "@/lib/journey";
import { getCurrentUser, requireUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { AppError } from "@/lib/server/errors";
import { listUploads, type UploadListItem } from "@/lib/server/uploads";

const STEP_HELP = [
  "Choose a CSV file with one review per row.",
  "Tell ReviewLens which column holds the review text. Dates, ratings and products are optional.",
  "ReviewLens reads every review and labels it positive, neutral or negative.",
  "See how customers feel and what they mention most.",
];

/** No uploads yet: a short welcome, one clear action and the four steps in plain words. */
function Welcome() {
  return (
    <section aria-labelledby="welcome-title" className="mx-auto grid w-full max-w-3xl justify-items-center gap-6 text-center">
      <BrandMark height={120} priority />
      <div className="grid gap-3">
        <h1 id="welcome-title" className="font-display text-[2rem] font-black leading-tight text-ink sm:text-[2.75rem]">
          Let&apos;s see what your customers are saying
        </h1>
        <p className="mx-auto max-w-xl text-body text-ink-2">
          Upload a CSV of customer reviews. ReviewLens sorts them into positive, neutral and negative, and shows what people mention
          most.
        </p>
      </div>
      <ButtonLink href="/upload" data-home-upload>
        <Upload aria-hidden className="size-5" strokeWidth={2.75} />
        Upload reviews
      </ButtonLink>
      <p className="text-[15px] text-ink-2">
        No file yet?{" "}
        <a href="/sample-reviews.csv" download className={`${linkClasses} inline-flex items-center gap-1`}>
          <Download aria-hidden className="size-4" />
          Download a sample CSV
        </a>
      </p>

      <div className="mt-6 w-full rounded-card bg-accent-soft p-6 text-left sm:p-8">
        <h2 className="text-subheading font-extrabold text-ink">How it works</h2>
        <ol className="mt-5 grid gap-5 sm:grid-cols-2">
          {JOURNEY_STEPS.map((step, i) => (
            <li key={step} className="flex gap-3">
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-brand font-display font-black text-on-brand">
                {i + 1}
              </span>
              <span>
                <span className="block font-extrabold text-ink">{step}</span>
                <span className="block text-[15px] text-ink-2">{STEP_HELP[i]}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** The most recent upload: its status and the one thing to do next. The step path shows only while it's unfinished. */
function LatestUpload({ upload }: { upload: UploadListItem }) {
  const step = uploadJourneyStep(upload.status);
  return (
    <section aria-labelledby="latest-title" className="grid min-w-0 gap-4">
      <h2 id="latest-title" className="text-subheading font-extrabold text-ink">
        Latest upload
      </h2>
      <div className="min-w-0 rounded-card border-2 border-line p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={upload.status} />
          <ModeBadge provider={upload.provider} />
        </div>
        <p title={upload.name} className="mt-3 line-clamp-2 text-2xl font-extrabold leading-tight text-ink [overflow-wrap:anywhere]">
          {upload.name}
        </p>
        <p className="mt-1 text-[15px] text-ink-2 [overflow-wrap:anywhere]">
          {upload.fileName}, {plural(upload.totalRows, "row")}, uploaded {formatDateTime(upload.createdAt)}
        </p>

        {step === 0 && (
          <div className="mt-6 grid justify-items-start gap-4">
            <p className="max-w-xl text-body text-ink">This upload stopped before every row was saved. Upload the file again to finish it.</p>
            <ButtonLink href="/upload" variant="secondary">
              Upload again
            </ButtonLink>
          </div>
        )}
        {step === 2 && (
          <div className="mt-6 grid gap-5">
            <JourneyPath current={2} />
            <p className="text-body text-ink">
              {formatNumber(upload.labeled)} of {plural(upload.totalRows, "review")} labeled so far.
            </p>
            <div>
              <ButtonLink href={`/uploads/${upload.id}/analyze`} variant="secondary">
                Continue analysis
              </ButtonLink>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="mt-6 grid gap-4">
            {upload.labeled ? (
              <>
                <p className="text-body text-ink">
                  <span className="font-extrabold">{plural(upload.labeled, "review")} analyzed.</span>{" "}
                  {formatPercent(upload.sentiment.positive, upload.labeled)} positive,{" "}
                  {formatPercent(upload.sentiment.negative, upload.labeled)} negative.
                </p>
                <SentimentStackedBar counts={upload.sentiment} className="h-3" />
              </>
            ) : (
              <p className="text-body text-ink">ReviewLens couldn&apos;t label any reviews in this file.</p>
            )}
            <div className="mt-1">
              <ButtonLink href={`/uploads/${upload.id}`} variant="secondary">
                See insights
              </ButtonLink>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default async function HomePage() {
  await connection();
  // Signed-out visitors get the public welcome page. Everything below needs an account.
  if (!(await getCurrentUser())) return <PublicWelcome />;
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
        <Notice tone="error" title="Analysis isn't set up correctly">
          {provider.problem}
        </Notice>
      )}

      {!setupProblem && !latest && <Welcome />}

      {latest && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-2xl">
              <h1 className="font-display text-[2rem] font-black leading-tight text-ink sm:text-[2.5rem]">Your reviews</h1>
              <p className="mt-2 text-body text-ink-2">Upload a new file, or pick up where you left off.</p>
            </div>
            <ButtonLink href="/upload" data-home-upload>
              <Upload aria-hidden className="size-5" strokeWidth={2.75} />
              Upload reviews
            </ButtonLink>
          </div>

          <LatestUpload upload={latest} />

          {earlier.length > 0 && (
            <section aria-labelledby="earlier-title" className="grid grid-cols-[minmax(0,1fr)] gap-4">
              <h2 id="earlier-title" className="text-subheading font-extrabold text-ink">
                Earlier uploads
              </h2>
              <ul className="grid grid-cols-[minmax(0,1fr)] divide-y-2 divide-line overflow-hidden rounded-card border-2 border-line">
                {earlier.map((upload) => {
                  const step = uploadJourneyStep(upload.status);
                  const href = step === 2 ? `/uploads/${upload.id}/analyze` : `/uploads/${upload.id}`;
                  return (
                    <li key={upload.id}>
                      <Link
                        href={href}
                        className="group flex items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-surface-2 focus-visible:-outline-offset-4"
                      >
                        {/* On phones the status sits under the name, so the name and date keep the full width. */}
                        <span className="flex min-w-0 flex-1 flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
                          <span className="w-full min-w-0 sm:flex-1">
                            <span title={upload.name} className="block truncate font-extrabold text-ink">
                              {upload.name}
                            </span>
                            <span className="mt-0.5 block truncate text-[15px] text-ink-2">
                              {step === 3 ? `${plural(upload.labeled, "review")} analyzed` : step === 2 ? "Still analyzing" : "Didn't finish importing"},{" "}
                              {formatDateTime(upload.createdAt)}
                            </span>
                          </span>
                          <StatusPill status={upload.status} />
                        </span>
                        <ChevronRight aria-hidden className="size-5 shrink-0 text-line-strong group-hover:text-ink-2" strokeWidth={3} />
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
                {provider.external
                  ? `New uploads use ${provider.label}. Masked review text is sent to Google's Gemini free tier, where Google may use it to improve its products, so upload only public, non-sensitive reviews.`
                  : `New uploads use ${provider.label}, which reads English only. Nothing is sent to an AI service.`}
              </span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
