import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { RetryFailedButton } from "@/components/retry-failed-button";
import { EmptyState, Notice } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { requireOwnedUpload } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { listIssues } from "@/lib/server/reviews";
import { getProgress } from "@/lib/server/uploads";
import type { IssueSeverity } from "@/lib/types";

export const metadata: Metadata = { title: "Issues" };

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
      <div className="max-w-3xl text-sm text-ink-2">
        <p>
          Errors are rows that weren&apos;t analyzed, for example rows with no review text. Warnings are rows that were kept but changed,
          for example a date that couldn&apos;t be read, or reviews in other languages that weren&apos;t labeled.
        </p>
      </div>

      {progress && progress.failed > 0 && (
        <Notice tone="error" title={`${formatNumber(progress.failed)} reviews couldn't be analyzed`} action={<RetryFailedButton uploadId={id} count={progress.failed} />}>
          The analysis service didn&apos;t answer after 3 tries. Retrying sends them again.
        </Notice>
      )}

      <nav aria-label="Filter issues" className="flex flex-wrap gap-2">
        {tabs.map(([label, value, count]) => (
          <Link
            key={label}
            href={tabHref(value)}
            aria-current={severity === value ? "page" : undefined}
            className={`press inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold ${
              severity === value ? "border-transparent bg-ink text-surface" : "border-line-strong bg-surface text-ink-2 hover:text-ink"
            }`}
          >
            {label} ({formatNumber(count)})
          </Link>
        ))}
      </nav>

      {issues.rows.length === 0 ? (
        <EmptyState icon={<CheckCircle2 aria-hidden className="size-6" />} title={severity ? `No ${severity}s` : "No problems found"}>
          Every row in the file was read without changes.
        </EmptyState>
      ) : (
        <div className="min-w-0 overflow-hidden rounded-card border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-ink-2">
                <tr>
                  <th scope="col" className="w-20 px-4 py-2.5 font-semibold">Row</th>
                  <th scope="col" className="w-28 px-4 py-2.5 font-semibold">Type</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">What happened</th>
                </tr>
              </thead>
              <tbody>
                {issues.rows.map((issue) => (
                  <tr key={issue.id} className="border-b border-line align-top last:border-0">
                    <td className="px-4 py-3 tabular">{issue.rowNumber ?? "—"}</td>
                    <td className="px-4 py-3">
                      {issue.severity === "error" ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-neg-ink">
                          <XCircle aria-hidden className="size-4" /> Error
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-warn-ink">
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
