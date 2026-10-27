"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, ButtonLink, Notice } from "@/components/ui";
import { api, ApiRequestError, sleep } from "@/lib/client-api";
import { formatNumber, plural } from "@/lib/format";
import type { Progress } from "@/lib/server/uploads";

type BatchResponse = { processed: number; batchError: string | null; retryAfterMs: number | null; progress: Progress };

/** Consecutive per-minute waits before analysis pauses instead of waiting again (about five minutes). */
const MAX_WAITS = 10;

/** Drives analysis from the browser: one request per batch until every review is processed. */
export function AnalyzeProgress({
  uploadId,
  initial,
  methodLabel,
}: {
  uploadId: string;
  initial: Progress;
  methodLabel: string;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState(initial);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState("Analysis stopped");
  const [note, setNote] = useState<string | null>(null);
  const [waitingForLimit, setWaitingForLimit] = useState(false);
  const stopRef = useRef(false);
  const runIdRef = useRef(0);

  const run = useCallback(async () => {
    const runId = ++runIdRef.current; // a newer run (e.g. Resume after Pause) replaces this one
    stopRef.current = false;
    setRunning(true);
    setError(null);
    let failures = 0;
    let waits = 0;
    while (!stopRef.current && runIdRef.current === runId) {
      try {
        const result = await api<BatchResponse>(`/api/uploads/${uploadId}/analyze`, { method: "POST" });
        failures = 0;
        setProgress(result.progress);
        if (result.retryAfterMs) {
          waits += 1;
          if (waits > MAX_WAITS) {
            setErrorTitle("Analysis paused");
            setError("Gemini's free tier kept asking ReviewLens to wait. Try Resume in a few minutes.");
            break;
          }
          setWaitingForLimit(true);
          setNote(result.batchError);
          await sleep(result.retryAfterMs);
          continue;
        }
        waits = 0;
        setWaitingForLimit(false);
        setNote(result.batchError);
        if (result.progress.done) {
          toast.success("Analysis complete");
          router.refresh();
          break;
        }
        if (result.batchError || result.processed === 0) await sleep(1500);
      } catch (err) {
        const retryable = err instanceof ApiRequestError && (err.status === 0 || err.status === 503 || err.status === 500);
        if (retryable && failures < 5) {
          failures += 1;
          setNote(`${(err as Error).message} Trying again in a moment.`);
          await sleep(Math.min(30_000, 2000 * 2 ** failures));
          continue;
        }
        setWaitingForLimit(false);
        setErrorTitle(
          err instanceof ApiRequestError && err.code === "FREE_TIER_DAILY_LIMIT"
            ? "Paused until the free daily limit resets"
            : "Analysis stopped",
        );
        setError(err instanceof ApiRequestError ? err.message : "Analysis stopped unexpectedly.");
        break;
      }
    }
    if (runIdRef.current === runId) setRunning(false);
  }, [uploadId, router]);

  useEffect(() => {
    if (initial.done) return;
    // Start after mount; a timer also keeps React's development double-mount from starting two loops.
    const timer = setTimeout(() => void run(), 0);
    return () => {
      clearTimeout(timer);
      stopRef.current = true;
    };
  }, [initial.done, run]);

  async function retryFailed() {
    try {
      const { progress: next } = await api<{ progress: Progress }>(`/api/uploads/${uploadId}/retry`, { method: "POST" });
      setProgress(next);
      void run();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't retry the failed reviews.");
    }
  }

  const processed = progress.labeled + progress.notLabeled + progress.failed;
  const total = Math.max(progress.imported, 1);
  const percent = Math.round((processed / total) * 100);
  const waiting = progress.pending + progress.processing;
  const hasIssues = progress.failed + progress.skipped + progress.warnings > 0;

  return (
    <div className="grid gap-4">
      <section className="rounded-card border border-line bg-surface p-5 sm:p-6" aria-labelledby="progress-title">
        <h2 id="progress-title" className="font-display text-lg font-semibold tracking-tight">
          {progress.done ? "Analysis complete" : running ? "Analyzing reviews" : "Analysis paused"}
        </h2>
        <p className="mt-1 text-sm text-ink-2">Method: {methodLabel}</p>

        <div className="mt-5 flex items-end gap-3">
          <span className="font-display text-5xl font-semibold tracking-tight tabular">{percent}%</span>
          <span className="pb-1.5 text-sm text-ink-2 tabular" aria-live="polite">
            {formatNumber(processed)} of {formatNumber(progress.imported)} reviews processed
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Analysis progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="mt-3 h-3 overflow-hidden rounded-full bg-line"
        >
          <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${percent}%` }} />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Labeled", progress.labeled],
            ["Not labeled", progress.notLabeled],
            ["Failed", progress.failed],
            ["Waiting", waiting],
          ].map(([label, value]) => (
            <div key={label} className="rounded-control bg-surface-2 px-3 py-2.5">
              <dt className="text-xs text-ink-2">{label}</dt>
              <dd className="font-display text-xl font-semibold tabular">{formatNumber(Number(value))}</dd>
            </div>
          ))}
        </dl>
        {progress.skipped > 0 && (
          <p className="mt-3 text-sm text-ink-2">{plural(progress.skipped, "row")} had no review text and were skipped during import.</p>
        )}
      </section>

      {note && !error && !progress.done && (
        <Notice tone="warning" title={waitingForLimit ? "Waiting for Gemini's per-minute limit" : "A batch needs another try"} live>
          {note}
        </Notice>
      )}
      {error && (
        <Notice
          tone="error"
          title={errorTitle}
          action={
            <Button size="sm" onClick={() => void run()}>
              Resume
            </Button>
          }
        >
          {error}
        </Notice>
      )}

      {!progress.done && !error && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-2">Keep this page open. If you leave, analysis pauses and you can resume here.</p>
          {running ? (
            <Button variant="secondary" onClick={() => (stopRef.current = true)}>
              Pause
            </Button>
          ) : (
            <Button onClick={() => void run()}>Resume analysis</Button>
          )}
        </div>
      )}

      {progress.done && (
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/uploads/${uploadId}`}>Open dashboard</ButtonLink>
          {hasIssues && (
            <ButtonLink href={`/uploads/${uploadId}/issues`} variant="secondary">
              Review issues
            </ButtonLink>
          )}
          {progress.failed > 0 && (
            <Button variant="secondary" onClick={() => void retryFailed()}>
              Retry {plural(progress.failed, "failed review")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
