import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { SentimentBars } from "@/components/dashboard/charts";
import {
  byConfidenceText,
  CHECK_TITLES,
  checkDescription,
  ClassScoresTable,
  exclusionSentence,
  LabelCheckTable,
} from "@/components/dashboard/label-check";
import { PrintButton } from "@/components/print-button";
import { buttonClasses } from "@/components/ui";
import { CHECK_NOTES } from "@/lib/analysis/agreement";
import { formatDateTime, formatNumber, formatPercent, periodLabel } from "@/lib/format";
import { providerLabel } from "@/lib/provider-label";
import { getDashboard } from "@/lib/server/dashboard";
import { getDb } from "@/lib/server/db";
import { describeFilters } from "@/lib/server/export";
import { dashboardFilters, filtersToQuery, parseFilters } from "@/lib/server/filters";
import { getUpload } from "@/lib/server/uploads";
import { SENTIMENTS } from "@/lib/types";

export const metadata: Metadata = { title: "Summary report" };

const NAMES = { positive: "Positive", neutral: "Neutral", negative: "Negative" } as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid border-t border-line pt-5">
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function ReportPage({ params, searchParams }: PageProps<"/uploads/[id]/report">) {
  await connection();
  const { id } = await params;
  const db = getDb();
  const upload = await getUpload(db, id);
  if (!upload) notFound();
  const filters = dashboardFilters(parseFilters(await searchParams));
  const dashboard = await getDashboard(db, upload, filters);
  const { totals, sentiment, check } = dashboard;
  const query = filtersToQuery(filters);

  return (
    <article className="grid max-w-4xl gap-6 rounded-card border border-line bg-surface p-5 sm:p-8 print:border-0 print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Summary report</h2>
          <p className="mt-1 text-sm text-ink-2">
            {upload.name} ({upload.fileName}). Prepared {formatDateTime(new Date())}. Labeled with{" "}
            {providerLabel(upload.provider, upload.model)}. Filters: {describeFilters(filters)}.
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <PrintButton />
          <a href={`/api/uploads/${id}/export?type=summary${query ? `&${query}` : ""}`} className={buttonClasses("secondary", "sm")}>
            Download summary CSV
          </a>
        </div>
      </header>

      <Section title="At a glance">
        <p className="max-w-3xl leading-relaxed">
          {formatNumber(totals.all)} reviews were imported and {formatNumber(totals.labeled)} were labeled.{" "}
          {totals.labeled > 0 &&
            `${formatPercent(sentiment.positive, totals.labeled)} are positive, ${formatPercent(sentiment.neutral, totals.labeled)} neutral and ${formatPercent(sentiment.negative, totals.labeled)} negative. `}
          {dashboard.topics[0] &&
            `The most discussed topic is ${dashboard.topics[0].label.toLowerCase()} (${formatNumber(dashboard.topics[0].total)} reviews, ${formatPercent(dashboard.topics[0].negative, dashboard.topics[0].total)} negative). `}
          {totals.notLabeled + totals.failed > 0 &&
            `${formatNumber(totals.notLabeled + totals.failed)} reviews weren't labeled because of language or analysis problems.`}
        </p>
      </Section>

      <Section title="Sentiment">
        <div className="max-w-xl">
          <SentimentBars sentiment={sentiment} labeled={totals.labeled} />
        </div>
        <p className="mt-3 text-sm text-ink-2">
          Confidence: {formatNumber(dashboard.confidence.high)} high, {formatNumber(dashboard.confidence.medium)} medium,{" "}
          {formatNumber(dashboard.confidence.low)} low. Confidence is a ranking of how sure the label is, not a measured accuracy.
        </p>
      </Section>

      {check && (
        <Section title={CHECK_TITLES[check.source]}>
          <p className="max-w-3xl leading-relaxed">
            {checkDescription(check, upload.ratingScale)} {formatNumber(check.agree)} of {formatNumber(check.eligible)} eligible
            reviews match ({formatPercent(check.agree, check.eligible)}). {exclusionSentence(check)} {byConfidenceText(check)}
          </p>
          <div className="mt-3 grid max-w-3xl gap-5 sm:grid-cols-2">
            <LabelCheckTable check={check} />
            {check.source === "label" && check.eligible > 0 && <ClassScoresTable check={check} />}
          </div>
          <p className="mt-3 max-w-3xl text-sm text-ink-2">{CHECK_NOTES[check.source]}</p>
        </Section>
      )}

      <Section title="Topics">
        {dashboard.topics.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-ink-2">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-semibold">Topic</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Mentions</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Positive</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Neutral</th>
                  <th scope="col" className="py-2 font-semibold">Negative</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {dashboard.topics.map((t) => (
                  <tr key={t.id} className="border-t border-line">
                    <td className="py-2 pr-4">{t.label}</td>
                    <td className="py-2 pr-4">{formatNumber(t.total)}</td>
                    <td className="py-2 pr-4">{formatPercent(t.positive, t.total)}</td>
                    <td className="py-2 pr-4">{formatPercent(t.neutral, t.total)}</td>
                    <td className="py-2">{formatPercent(t.negative, t.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-ink-2">No tracked topics came up.</p>
        )}
      </Section>

      <Section title="Words that stand out">
        <div className="grid gap-4 sm:grid-cols-3">
          {SENTIMENTS.map((s) => (
            <div key={s}>
              <h3 className="text-sm font-semibold">{NAMES[s]}</h3>
              <p className="mt-1 text-sm text-ink-2">
                {dashboard.keywords[s].length
                  ? dashboard.keywords[s].map((k) => `${k.term} (${k.count})`).join(", ")
                  : "None stand out."}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Sentiment over time">
        {dashboard.trend.status === "ok" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-ink-2">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-semibold">Period</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Positive</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Neutral</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Negative</th>
                  <th scope="col" className="py-2 font-semibold">Reviews</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {dashboard.trend.points.map((p) => (
                  <tr key={p.period} className="border-t border-line">
                    <td className="py-2 pr-4">{periodLabel(p.period, dashboard.trend.status === "ok" ? dashboard.trend.grain : "month")}</td>
                    <td className="py-2 pr-4">{formatPercent(p.positive, p.total)}</td>
                    <td className="py-2 pr-4">{formatPercent(p.neutral, p.total)}</td>
                    <td className="py-2 pr-4">{formatPercent(p.negative, p.total)}</td>
                    <td className="py-2">{formatNumber(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-ink-2">{dashboard.trend.reason}</p>
        )}
      </Section>

      <Section title="How to read this report">
        <ul className="grid max-w-3xl list-disc gap-1 pl-5 text-sm text-ink-2">
          <li>Each review gets one label: positive, neutral or negative. Shares are of labeled reviews only.</li>
          <li>Topics come from a fixed list of words and phrases, so reviews can mention more than one topic.</li>
          <li>Reviews in languages ReviewLens can&apos;t read, and reviews that couldn&apos;t be analyzed, are counted separately.</li>
          <li>Personal details such as emails and phone numbers were masked before analysis.</li>
        </ul>
        <p className="mt-2 text-sm text-ink-2">Labels: {SENTIMENTS.map((s) => `${NAMES[s]} ${formatNumber(sentiment[s])}`).join(", ")}.</p>
      </Section>
    </article>
  );
}
