"use client";

import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, FileSpreadsheet, Lock, UploadCloud } from "lucide-react";
import { JourneyPath } from "@/components/journey-path";
import { SENTIMENT_META } from "@/components/sentiment";
import { Button, Notice } from "@/components/ui";
import { api, ApiRequestError, withRetry } from "@/lib/client-api";
import { csvColumnsProblem, guessColumnMapping, isPersonalColumn, textColumnProblem } from "@/lib/csv/columns";
import { cleanText, looksMisencoded, maskPersonalData } from "@/lib/csv/clean";
import { detectDateFormat, detectRatingScale, labelColumnLooksValid, type DateFormatGuess } from "@/lib/csv/parse-values";
import { prepareRow } from "@/lib/csv/prepare";
import { formatDate, formatNumber, plural } from "@/lib/format";
import { wizardJourneyStep } from "@/lib/journey";
import { LIMITS } from "@/lib/limits";
import type { ColumnField, ColumnMap, DateFormat, RatingScale, RawRow } from "@/lib/types";

export type WizardProviderInfo = { label: string; external: boolean; problem: string | null };

type ParsedFile = {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  warnings: string[];
};

type Step = "choose" | "map" | "preview" | "import";

/** "date", "date and rating", "date, rating and product". */
function listWords(words: string[]): string {
  return words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

const FIELDS: { id: ColumnField; label: string; help: string; required?: boolean }[] = [
  { id: "text", label: "Review text", help: "What the customer wrote. Required.", required: true },
  { id: "date", label: "Date", help: "Used for the timeline and the date filter." },
  { id: "rating", label: "Rating", help: "Stars or score. Used for filters and to double-check confidence." },
  { id: "product", label: "Product", help: "Product or item name. Used for the product filter." },
  {
    id: "label",
    label: "Your label",
    help: "Your own positive, neutral or negative label for each review. ReviewLens checks its labels against yours.",
  },
];

type ImportState =
  | { phase: "idle" }
  | { phase: "running"; label: string; sent: number; total: number }
  | { phase: "error"; message: string; uploadId: string | null; nextChunk: number; sent: number; total: number };

function chunkRows(rows: RawRow[]): RawRow[][] {
  const chunks: RawRow[][] = [];
  let current: RawRow[] = [];
  let size = 0;
  for (const row of rows) {
    const rowSize = JSON.stringify(row).length;
    if (current.length && (current.length >= LIMITS.maxRowsPerRequest || size + rowSize > LIMITS.maxRequestBytes)) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(row);
    size += rowSize;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

function columnValues(rows: Record<string, string>[], header: string | null, limit = 1000): string[] {
  if (!header) return [];
  return rows.slice(0, limit).map((row) => row[header] ?? "");
}

function sampleValues(rows: Record<string, string>[], header: string): string[] {
  const samples: string[] = [];
  for (const row of rows) {
    const value = (row[header] ?? "").trim();
    if (value) samples.push(value.length > 40 ? `${value.slice(0, 39)}…` : value);
    if (samples.length === 3) break;
  }
  return samples;
}

function parseCsv(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header, index) => header.replace(/^﻿/, "").trim() || `Column ${index + 1}`,
      complete(results) {
        const headers = results.meta.fields ?? [];
        const columnsProblem = csvColumnsProblem(headers);
        if (columnsProblem) {
          reject(new Error(columnsProblem));
          return;
        }
        const rows = results.data.filter((row) => row && typeof row === "object");
        if (!rows.length) {
          reject(new Error("The file has a header row but no reviews under it."));
          return;
        }
        if (rows.length > LIMITS.maxRows) {
          reject(
            new Error(
              `This file has ${formatNumber(rows.length)} rows. ReviewLens handles up to ${formatNumber(LIMITS.maxRows)} per upload, so split the file and upload each part.`,
            ),
          );
          return;
        }
        const warnings: string[] = [];
        const mismatched = results.errors.filter((e) => e.type === "FieldMismatch").length;
        if (mismatched) {
          warnings.push(`${plural(mismatched, "row")} had a different number of columns than the header and may be shifted.`);
        }
        const sample = rows
          .slice(0, 300)
          .map((row) => Object.values(row).join(" "))
          .join(" ");
        if (looksMisencoded(sample)) {
          warnings.push("Some characters look garbled. If accents or emoji look wrong, save the file as “CSV UTF-8” and upload it again.");
        }
        resolve({ fileName: file.name, headers, rows, warnings });
      },
      error(error) {
        reject(new Error(`The file couldn't be read: ${error.message}`));
      },
    });
  });
}

export function UploadWizard({ provider }: { provider: WizardProviderInfo }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [mapping, setMapping] = useState<ColumnMap>({ text: null, date: null, rating: null, product: null, label: null });
  const [dateChoice, setDateChoice] = useState<DateFormat | null>(null);
  const [ratingScale, setRatingScale] = useState<RatingScale>(5);
  const [name, setName] = useState("");
  const [importState, setImportState] = useState<ImportState>({ phase: "idle" });
  const [noticeAccepted, setNoticeAccepted] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);

  const headers = parsed?.headers ?? [];
  const personal = headers.filter(isPersonalColumn);
  const selectable = headers.filter((h) => !isPersonalColumn(h));
  const usedHeaders = new Set(Object.values(mapping).filter(Boolean));
  const ignored = selectable.filter((h) => !usedHeaders.has(h));

  const detectedDate: DateFormatGuess = useMemo(
    () => (parsed && mapping.date ? detectDateFormat(columnValues(parsed.rows, mapping.date)) : "none"),
    [parsed, mapping.date],
  );
  const labelColumnOk = useMemo(
    () => !parsed || !mapping.label || labelColumnLooksValid(columnValues(parsed.rows, mapping.label)),
    [parsed, mapping.label],
  );
  const dateFormat: DateFormat | null =
    detectedDate === "ymd" || detectedDate === "mdy" || detectedDate === "dmy" ? detectedDate : dateChoice;

  const rawRows: RawRow[] = useMemo(() => {
    if (!parsed || !mapping.text) return [];
    const pick = (row: Record<string, string>, header: string | null, max: number) =>
      header ? (row[header] ?? "").slice(0, max) : null;
    // Clean and mask in the browser as well, so emails and phone numbers never leave this device.
    // The server repeats both steps and never relies on this.
    const scrub = (value: string, max: number) => maskPersonalData(cleanText(value)).slice(0, max);
    return parsed.rows.map((row, index) => ({
      rowNumber: index + 2,
      text: scrub(row[mapping.text!] ?? "", LIMITS.maxRawTextLength),
      date: pick(row, mapping.date, 100),
      rating: pick(row, mapping.rating, 50),
      product: mapping.product ? scrub(row[mapping.product] ?? "", 500) : null,
      label: mapping.label ? scrub(row[mapping.label] ?? "", 50) : null,
    }));
  }, [parsed, mapping]);

  const preview = useMemo(() => {
    if (step !== "preview" && step !== "import") return null;
    const options = { dateFormat: mapping.date ? dateFormat : null, ratingScale: mapping.rating ? ratingScale : null };
    const prepared = rawRows.map((row) => prepareRow(row, options));
    const issues = prepared.flatMap((row) => row.issues);
    const texts = prepared.filter((row) => row.text).map((row) => row.text!.toLowerCase());
    return {
      firstRows: prepared.slice(0, 10),
      ready: prepared.filter((row) => row.text).length,
      skipped: issues.filter((i) => i.severity === "error").length,
      warnings: issues.filter((i) => i.severity === "warning"),
      sampleIssues: issues.slice(0, 5),
      duplicates: texts.length - new Set(texts).size,
      labels: prepared.filter((row) => row.text && row.referenceLabel).length,
    };
  }, [step, rawRows, mapping.date, mapping.rating, dateFormat, ratingScale]);

  const importing = importState.phase === "running";
  useEffect(() => {
    if (!importing) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [importing]);

  async function chooseFile(file: File | undefined) {
    if (!file) return;
    setFileError(null);
    if (!/\.csv$/i.test(file.name)) {
      setFileError("Choose a .csv file. In Excel or Google Sheets, use File → Save as or Download → CSV.");
      return;
    }
    if (file.size > LIMITS.maxFileBytes) {
      setFileError(`This file is ${(file.size / 1024 / 1024).toFixed(1)} MB. ReviewLens accepts CSV files up to 5 MB.`);
      return;
    }
    setReading(true);
    try {
      const result = await parseCsv(file);
      const guess = guessColumnMapping(result.headers);
      // A column named like a label but holding something else (0 and 1, say) is left for the person to choose.
      if (guess.label && !labelColumnLooksValid(columnValues(result.rows, guess.label))) guess.label = null;
      const scale = detectRatingScale(columnValues(result.rows, guess.rating));
      setParsed(result);
      setMapping(guess);
      setDateChoice(null);
      setRatingScale(scale ?? 5);
      setName(file.name.replace(/\.csv$/i, "").slice(0, 120));
      setStep("map");
    } catch (error) {
      setFileError((error as Error).message);
    } finally {
      setReading(false);
    }
  }

  function updateField(field: ColumnField, header: string) {
    const value = header || null;
    setMapping((current) => ({ ...current, [field]: value }));
    if (field === "date") setDateChoice(null);
    if (field === "rating" && parsed && value) setRatingScale(detectRatingScale(columnValues(parsed.rows, value)) ?? 5);
  }

  const textProblem = useMemo(
    () => (parsed && mapping.text ? textColumnProblem(columnValues(parsed.rows, mapping.text)) : null),
    [parsed, mapping.text],
  );
  const mappingProblem = !mapping.text
    ? "Choose the column that holds the review text."
    : textProblem
      ? textProblem
      : mapping.date && detectedDate === "ambiguous" && !dateChoice
        ? "Tell ReviewLens whether the dates are month first or day first."
        : !name.trim()
          ? "Give this upload a name."
          : null;

  async function runImport(resume?: Extract<ImportState, { phase: "error" }>) {
    if (!parsed || !mapping.text) return;
    const chunks = chunkRows(rawRows);
    let uploadId = resume?.uploadId ?? null;
    let sent = resume?.sent ?? 0;
    let next = resume?.nextChunk ?? 0;
    setStep("import");
    try {
      if (!uploadId) {
        setImportState({ phase: "running", label: "Creating the upload", sent, total: rawRows.length });
        const created = await withRetry(() =>
          api<{ upload: { id: string } }>("/api/uploads", {
            method: "POST",
            body: JSON.stringify({
              name: name.trim(),
              fileName: parsed.fileName.slice(0, 255),
              columnMap: mapping,
              dateFormat: mapping.date ? dateFormat : null,
              ratingScale: mapping.rating ? ratingScale : null,
              totalRows: rawRows.length,
              ...(provider.external && noticeAccepted ? { dataNotice: "accepted" } : {}),
            }),
          }),
        );
        uploadId = created.upload.id;
      }
      for (; next < chunks.length; next++) {
        setImportState({ phase: "running", label: "Sending reviews", sent, total: rawRows.length });
        const chunk = chunks[next];
        await withRetry(() =>
          api(`/api/uploads/${uploadId}/rows`, { method: "POST", body: JSON.stringify({ rows: chunk }) }),
        );
        sent += chunk.length;
      }
      setImportState({ phase: "running", label: "Starting analysis", sent, total: rawRows.length });
      await withRetry(() => api(`/api/uploads/${uploadId}/start`, { method: "POST" }));
      router.push(`/uploads/${uploadId}/analyze`);
    } catch (error) {
      setImportState({
        phase: "error",
        message: error instanceof ApiRequestError ? error.message : "The import stopped unexpectedly.",
        uploadId,
        nextChunk: next,
        sent,
        total: rawRows.length,
      });
    }
  }

  // The optional columns fold away unless one needs an answer (a date order) or a fix (a label column).
  const optionalMatched = FIELDS.filter((field) => !field.required && mapping[field.id]).map((field) => field.label.toLowerCase());
  const optionalSummary = optionalMatched.length
    ? `Matched: ${listWords(optionalMatched)}.`
    : "Dates, ratings, products or your own labels, if your file has them.";
  const optionalNeedsAttention =
    (Boolean(mapping.date) && (detectedDate === "ambiguous" || detectedDate === "none")) || (Boolean(mapping.label) && !labelColumnOk);

  /** One column choice with its help, examples and any follow-up question (date order, rating scale). */
  function renderField(field: (typeof FIELDS)[number]) {
    const id = `map-${field.id}`;
    const current = mapping[field.id];
    return (
      <div key={field.id} className="grid gap-1.5 sm:grid-cols-[180px_1fr] sm:items-start sm:gap-4">
        <label htmlFor={id} className="pt-3 font-bold">
          {field.label}
          {!field.required && <span className="font-normal text-ink-2"> (optional)</span>}
        </label>
        <div className="min-w-0">
          <select
            id={id}
            value={current ?? ""}
            onChange={(e) => updateField(field.id, e.target.value)}
            className="min-h-12 w-full rounded-control border-2 border-field bg-surface px-3.5 font-semibold text-ink hover:border-ink-3 focus-visible:border-accent"
            aria-describedby={`${id}-help`}
          >
            <option value="">{field.required ? "Choose a column" : "Not in this file"}</option>
            {selectable.map((header) => (
              <option key={header} value={header} disabled={usedHeaders.has(header) && header !== current}>
                {header}
              </option>
            ))}
          </select>
          <p id={`${id}-help`} className="mt-1 text-sm text-ink-2">
            {current ? `Examples: ${sampleValues(parsed?.rows ?? [], current).join(", ") || "all empty"}` : field.help}
          </p>

          {field.id === "date" && current && (
            <div className="mt-2 text-sm">
              {detectedDate === "ymd" && <p className="text-ink-2">Dates look like 2026-03-04 (year first).</p>}
              {detectedDate === "mdy" && <p className="text-ink-2">Dates are month first, like 03/25/2026.</p>}
              {detectedDate === "dmy" && <p className="text-ink-2">Dates are day first, like 25/03/2026.</p>}
              {detectedDate === "none" && (
                <p className="text-warn-ink">No readable dates in this column. Reviews will be kept without a date.</p>
              )}
              {detectedDate === "ambiguous" && (
                <fieldset className="mt-1 grid gap-2 rounded-control bg-warn-soft p-3">
                  <legend className="sr-only">Date order</legend>
                  <p className="font-semibold text-ink">Is 03/04/2026 March 4 or 3 April?</p>
                  {(
                    [
                      ["mdy", "Month first: 03/04/2026 is March 4"],
                      ["dmy", "Day first: 03/04/2026 is 3 April"],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value} className="flex min-h-10 items-center gap-2">
                      <input
                        type="radio"
                        name="date-order"
                        value={value}
                        checked={dateChoice === value}
                        onChange={() => setDateChoice(value)}
                        className="size-4 accent-[var(--brand)]"
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
              )}
            </div>
          )}

          {field.id === "text" && textProblem && (
            <p className="mt-2 text-sm font-bold text-danger" role="alert">
              {textProblem}
            </p>
          )}

          {field.id === "label" && !current && (
            <p className="mt-2 text-sm text-warn-ink">
              No label column is matched, so there will be no label check. If your file has your own labels, choose
              that column here.
            </p>
          )}

          {field.id === "label" && current && (
            <p className={`mt-2 text-sm ${labelColumnOk ? "text-ink-2" : "text-warn-ink"}`}>
              {labelColumnOk
                ? "ReviewLens will compare its labels with these. They are never sent to the AI."
                : "Most values here aren't positive, neutral or negative. Reviews with other values are left out of the label check."}
            </p>
          )}

          {field.id === "rating" && current && (
            <label className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink-2">Ratings are out of</span>
              <select
                value={ratingScale}
                onChange={(e) => setRatingScale(Number(e.target.value) as RatingScale)}
                className="min-h-11 rounded-control border-2 border-field bg-surface px-2.5 font-semibold text-ink hover:border-ink-3 focus-visible:border-accent"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={100}>100</option>
              </select>
            </label>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <JourneyPath current={wizardJourneyStep(step)} />

      {provider.problem && (
        <Notice tone="error" title="Analysis isn't configured correctly">
          {provider.problem} Fix the environment variable and reload this page.
        </Notice>
      )}

      {step === "choose" && (
        <section className="grid gap-4">
          <label
            htmlFor="csv-file"
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void chooseFile(e.dataTransfer.files[0]);
            }}
            className={`group flex cursor-pointer flex-col items-center rounded-card border-2 border-dashed px-6 py-14 text-center transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-ink ${
              dragging ? "border-brand bg-brand-soft" : "border-line-strong bg-surface hover:border-accent hover:bg-accent-soft"
            }`}
          >
            <span className="grid size-16 place-items-center rounded-card bg-brand-soft text-brand-ink">
              <UploadCloud aria-hidden className="size-8" />
            </span>
            <span className="mt-5 text-subheading font-extrabold text-ink">
              {reading ? "Reading your file…" : dragging ? "Drop the file to use it" : "Choose a CSV to get started"}
            </span>
            <span className="mt-1 text-[15px] text-ink-2">or drag it here. Up to 5 MB and 5,000 reviews.</span>
            <span aria-hidden className="mt-6 inline-flex min-h-12 items-center rounded-full bg-brand px-6 text-[16px] font-bold text-on-brand group-hover:bg-brand-hover">
              Browse files
            </span>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              disabled={reading}
              onChange={(e) => {
                void chooseFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {fileError && <Notice tone="error" title="This file can't be used">{fileError}</Notice>}
          <div className="rounded-card bg-surface-2 p-5 text-[15px] text-ink-2">
            <p className="font-semibold text-ink">What the file needs</p>
            <ul className="mt-2 grid gap-1.5">
              <li>A header row naming the columns, and one review per row.</li>
              <li>A column with the review text. Date, rating and product columns are optional.</li>
              <li>Columns with names, emails or customer IDs are left out automatically.</li>
            </ul>
            <a href="/sample-reviews.csv" download className="mt-2 inline-flex py-1 font-extrabold text-accent-ink underline decoration-brand-ink/30 decoration-2 underline-offset-[3px] hover:decoration-brand-ink">
              Download a sample CSV
            </a>
          </div>
        </section>
      )}

      {step === "map" && parsed && (
        <section className="grid gap-4">
          <div className="flex items-center gap-3 rounded-card bg-surface-2 p-4">
            <FileSpreadsheet aria-hidden className="size-6 shrink-0 text-brand-ink" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{parsed.fileName}</p>
              <p className="text-sm text-ink-2">
                {plural(parsed.rows.length, "row")}, {plural(parsed.headers.length, "column")}
              </p>
            </div>
          </div>
          {parsed.warnings.map((warning) => (
            <Notice key={warning} tone="warning" title="Check the file">
              {warning}
            </Notice>
          ))}

          <div className="grid gap-5">
            <div>
              <h2 className="text-subheading font-extrabold text-ink">Which column has the reviews?</h2>
              <p className="mt-1 text-[15px] text-ink-2">ReviewLens picked the likely one. Only the columns you match are sent to ReviewLens.</p>
            </div>
            {FIELDS.filter((field) => field.required).map(renderField)}

            <details
              open={optionalOpen || optionalNeedsAttention}
              onToggle={(event) => setOptionalOpen(event.currentTarget.open)}
              className="group rounded-card border border-line"
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-card px-4 py-3 hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="block font-bold text-ink">More details (optional)</span>
                  <span className="block text-[15px] text-ink-2">{optionalSummary}</span>
                </span>
                <ChevronDown aria-hidden className="size-5 shrink-0 text-ink-2 transition-transform duration-150 group-open:rotate-180" />
              </summary>
              <div className="grid gap-5 border-t border-line px-4 py-5">{FIELDS.filter((field) => !field.required).map(renderField)}</div>
            </details>

            <div className="grid gap-1.5 sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <label htmlFor="upload-name" className="font-bold">
                Upload name
              </label>
              <input
                id="upload-name"
                value={name}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
                className="min-h-12 w-full rounded-control border-2 border-field bg-surface px-3.5 font-semibold text-ink hover:border-ink-3 focus-visible:border-accent"
              />
            </div>
          </div>

          <div className="grid gap-3 rounded-card bg-surface-2 p-5 text-[15px]">
            <p className="flex items-center gap-2 font-semibold">
              <Lock aria-hidden className="size-4 text-brand-ink" />
              Stays on this device
            </p>
            {personal.length > 0 && (
              <p className="text-ink-2">
                <span className="font-semibold text-ink">Personal information, never uploaded:</span> {personal.join(", ")}
              </p>
            )}
            <p className="text-ink-2">
              <span className="font-semibold text-ink">Other columns left out:</span> {ignored.length ? ignored.join(", ") : "none"}
            </p>
          </div>

          {mappingProblem && <p className="text-sm text-ink-2" role="status">{mappingProblem}</p>}
          <div className="flex flex-wrap justify-between gap-3">
            <Button variant="secondary" onClick={() => setStep("choose")}>
              Choose another file
            </Button>
            <Button onClick={() => setStep("preview")} disabled={Boolean(mappingProblem)}>
              Check preview
            </Button>
          </div>
        </section>
      )}

      {(step === "preview" || step === "import") && parsed && preview && (
        <section className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-card bg-surface-2 p-4">
              <p className="text-[15px] font-bold text-ink-2">Ready to analyze</p>
              <p className="mt-3 font-display text-heading-sm font-black leading-none text-ink tabular">{formatNumber(preview.ready)}</p>
            </div>
            <div className="rounded-card bg-surface-2 p-4">
              <p className="text-[15px] font-bold text-ink-2">Skipped, no review text</p>
              <p className="mt-3 font-display text-heading-sm font-black leading-none text-ink tabular">{formatNumber(preview.skipped)}</p>
            </div>
            <div className="rounded-card bg-surface-2 p-4">
              <p className="text-[15px] font-bold text-ink-2">Kept with a warning</p>
              <p className="mt-3 font-display text-heading-sm font-black leading-none text-ink tabular">{formatNumber(preview.warnings.length)}</p>
            </div>
          </div>

          {preview.sampleIssues.length > 0 && (
            <Notice tone="warning" title="Some rows need attention">
              <ul className="mt-1 grid gap-1">
                {preview.sampleIssues.map((issue) => (
                  <li key={`${issue.rowNumber}-${issue.code}`}>{issue.message}</li>
                ))}
              </ul>
              {preview.skipped + preview.warnings.length > preview.sampleIssues.length && (
                <p className="mt-1">{"You'll see the full list on the Data issues tab after import."}</p>
              )}
            </Notice>
          )}
          {preview.duplicates > 0 && (
            <Notice title={`${plural(preview.duplicates, "review")} repeat earlier text`}>
              {"They'll be kept and counted. Remove them from the file first if they're accidental copies."}
            </Notice>
          )}

          {mapping.label ? (
            <Notice tone="success" title={`Label check is on: ${plural(preview.labels, "review")} with your label in “${mapping.label}”`}>
              The dashboard will compare ReviewLens&apos;s labels with yours. Your labels are never sent to the AI.
            </Notice>
          ) : (
            <Notice title="Label check is off: no Your label column">
              {mapping.rating
                ? "The dashboard will compare labels with the star ratings instead, which are only a rough guide. "
                : ""}
              To compare with your own labels, go back to the columns and match Your label.
            </Notice>
          )}

          <div className="min-w-0 rounded-card border border-line bg-surface">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5">
              <h2 className="text-subheading font-extrabold text-ink">Preview of the first 10 rows</h2>
              <p className="text-sm text-ink-2">This is exactly what will be saved.</p>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-y border-line bg-surface-2 text-ink-2">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-semibold">Row</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Review text</th>
                    {mapping.date && <th scope="col" className="px-4 py-2 font-semibold">Date</th>}
                    {mapping.rating && <th scope="col" className="px-4 py-2 font-semibold">Rating</th>}
                    {mapping.product && <th scope="col" className="px-4 py-2 font-semibold">Product</th>}
                    {mapping.label && <th scope="col" className="px-4 py-2 font-semibold">Your label</th>}
                  </tr>
                </thead>
                <tbody>
                  {preview.firstRows.map((row) => (
                    <tr key={row.rowNumber} className="border-b border-line last:border-0 align-top">
                      <td className="px-4 py-2.5 tabular text-ink-2">{row.rowNumber}</td>
                      <td className="max-w-md px-4 py-2.5">
                        {row.text ? (
                          <span className="line-clamp-3">{row.text}</span>
                        ) : (
                          <span className="font-semibold text-danger">Skipped: no review text</span>
                        )}
                      </td>
                      {mapping.date && <td className="px-4 py-2.5 whitespace-nowrap">{row.reviewDate ? formatDate(row.reviewDate) : "None"}</td>}
                      {mapping.rating && <td className="px-4 py-2.5 tabular">{row.rating ?? "None"}</td>}
                      {mapping.product && <td className="px-4 py-2.5">{row.product ?? "None"}</td>}
                      {mapping.label && <td className="px-4 py-2.5">{row.referenceLabel ? SENTIMENT_META[row.referenceLabel].label : "None"}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {provider.external ? (
            <Notice tone="warning" title="Google will receive this file's review text">
              <div className="grid gap-2">
                <p>
                  AI mode sends the review text to Google&apos;s Gemini API on its free tier, with emails, phone numbers and links
                  masked first. Nothing else from the file is sent. English, Tagalog and Taglish reviews are labeled.
                </p>
                <p>
                  On the free tier, Google may use what you send to improve its products, and people at Google may read it. Only
                  upload public reviews with nothing sensitive or personal in them.
                </p>
                <p>
                  Free use has per-minute and daily limits. This file needs about{" "}
                  {plural(Math.ceil(preview.ready / LIMITS.batchSize), "request")} to Gemini. If a limit is reached, analysis
                  pauses and says when to continue.
                </p>
                <label htmlFor="data-notice" className="flex items-start gap-3 font-medium text-ink">
                  <input
                    id="data-notice"
                    type="checkbox"
                    checked={noticeAccepted}
                    disabled={step !== "preview"}
                    onChange={(event) => setNoticeAccepted(event.target.checked)}
                    className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
                  />
                  I understand, and this file has only public reviews with nothing sensitive or personal in them.
                </label>
              </div>
            </Notice>
          ) : (
            <Notice title="Basic mode">
              Reviews are labeled on this server with the VADER word list. Nothing is sent to an AI service. Labels are less
              accurate than AI mode and never marked High confidence.
            </Notice>
          )}

          {step === "preview" && (
            <div className="flex flex-wrap justify-between gap-3">
              <Button variant="secondary" onClick={() => setStep("map")}>
                Back to columns
              </Button>
              <Button
                onClick={() => void runImport()}
                disabled={!preview.ready || Boolean(provider.problem) || (provider.external && !noticeAccepted)}
              >
                Import and analyze {plural(preview.ready, "review")}
              </Button>
            </div>
          )}

          {step === "import" && (
            <div className="grid gap-3 rounded-card bg-surface-2 p-5" aria-live="polite">
              {importState.phase === "running" && (
                <>
                  <p className="font-semibold">{importState.label}…</p>
                  <div className="meter" aria-hidden>
                    <div
                      className="meter-fill"
                      style={{ transform: `scaleX(${importState.sent / Math.max(1, importState.total)})` }}
                    />
                  </div>
                  <p className="text-sm text-ink-2 tabular">
                    {formatNumber(importState.sent)} of {formatNumber(importState.total)} rows sent. Keep this page open.
                  </p>
                </>
              )}
              {importState.phase === "error" && (
                <Notice
                  tone="error"
                  title="The import stopped"
                  action={
                    <Button size="sm" onClick={() => void runImport(importState)}>
                      Try again
                    </Button>
                  }
                >
                  {importState.message} {formatNumber(importState.sent)} of {formatNumber(importState.total)} rows were sent. Trying again
                  continues where it stopped.
                </Notice>
              )}
              {importState.phase === "idle" && (
                <p className="flex items-center gap-2 text-sm text-ink-2">
                  <CheckCircle2 aria-hidden className="size-4" /> Preparing…
                </p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
