import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AlertTriangle, XCircle } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { RetryFailedButton } from "@/components/retry-failed-button";
import { EmptyState, Notice } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { requireOwnedUpload } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { listIssues } from "@/lib/server/reviews";
import { getProgress } from "@/lib/server/uploads";
import type { IssueSeverity } from "@/lib/types";

export const metadata: Metadata = { title: "Data issues" };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function IssuesPage({ params, searchParams }: PageProps<"/uploads/[id]/issues">) {
  await connection();
  const { id } = await params;
  const sp = await searchParams;
  const db = getDb();
  const { user, upload } = await requireOwnedUpload(id, `/uploads/${id}/issues`);
  const scope = { uploadId: upload.id, ownerId: user.id };
  const show = first(sp.show);
  const severity: IssueSeverity | null = show === "error" || show === "warning" ? show : null;
  const page = Number(first(sp.page)) || 1;
  const [issues, progress] = await Promise.all([listIssues(db, scope, page, severity), getProgress(db, user.id, id)]);

  const base = `/uploads/${id}/issues`;
  const tabHref = (value: string | null) => (value ? `${base}?show=${value}` : base);
  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    if (severity) q.set("show", severity);
    if (p > 1) q.set("page", String(p));
    return q.size ? `${base}?${q}` : base;
  };
  const tabs: [string, string | null, number][] = [
    ["All", null, issues.errors + issues.warnings],
    ["Errors", "error", issues.errors],
    ["Warnings", "warning", issues.warnings],
  ];

  return (
    <div className="grid gap-5">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-extrabold text-ink">Data issues</h2>
        <p className="mt-1 text-body text-ink-2">
          Rows that needed a second look. Errors are rows ReviewLens couldn&apos;t analyze, like rows with no review text. Warnings are
          rows that were kept but changed, like a date that couldn&apos;t be read or a review in a language ReviewLens doesn&apos;t read.
        </p>
      </div>

      {progress && progress.failed > 0 && (
        <Notice tone="error" title={`${formatNumber(progress.failed)} reviews couldn't be analyzed`} action={<RetryFailedButton uploadId={id} count={progress.failed} />}>
          The analysis service didn&apos;t answer after 3 tries. Retry to send them again.
        </Notice>
      )}

      <nav aria-label="Filter issues" className="flex flex-wrap gap-2">
        {tabs.map(([label, value, count]) => (
          <Link
            key={label}
            href={tabHref(value)}
            aria-current={severity === value ? "page" : undefined}
            className={`press inline-flex min-h-11 items-center rounded-tag border-2 px-4 text-[15px] font-bold ${
              severity === value ? "border-accent-soft bg-accent-soft text-accent-ink" : "border-line bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {label} ({formatNumber(count)})
          </Link>
        ))}
      </nav>

      {issues.rows.length === 0 ? (
        <EmptyState art="ready" title={severity ? `No ${severity}s` : "Nothing to fix here"}>
          Every row in the file was read without changes.
        </EmptyState>
      ) : (
        <div className="min-w-0 overflow-hidden rounded-card border-2 border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-ink-2">
                <tr>
                  <th scope="col" className="w-20 px-4 py-2.5 font-bold">Row</th>
                  <th scope="col" className="w-28 px-4 py-2.5 font-bold">Type</th>
                  <th scope="col" className="px-4 py-2.5 font-bold">What happened</th>
                </tr>
              </thead>
              <tbody>
                {issues.rows.map((issue) => (
                  <tr key={issue.id} className="border-b border-line align-top last:border-0">
                    <td className="px-4 py-3 tabular">{issue.rowNumber ?? "None"}</td>
                    <td className="px-4 py-3">
                      {issue.severity === "error" ? (
                        <span className="inline-flex items-center gap-1.5 font-bold text-danger">
                          <XCircle aria-hidden className="size-4" /> Error
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-bold text-warn-ink">
                          <AlertTriangle aria-hidden className="size-4" /> Warning
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{issue.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Pagination page={issues.page} pageCount={issues.pageCount} makeHref={pageHref} />
    </div>
  );
}
