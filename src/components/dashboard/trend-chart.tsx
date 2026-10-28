"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SentimentIcon } from "@/components/sentiment";
import { periodLabel } from "@/lib/format";
import type { TrendPoint } from "@/lib/server/dashboard";
import type { Sentiment } from "@/lib/types";

const LINES: { key: Sentiment; label: string; color: string; dash?: string }[] = [
  { key: "positive", label: "Positive", color: "var(--pos)" },
  { key: "neutral", label: "Neutral", color: "var(--neu-ink)", dash: "2 4" },
  { key: "negative", label: "Negative", color: "var(--neg)", dash: "8 4" },
];

type Row = { label: string; total: number } & Record<Sentiment, number> & Record<`${Sentiment}Count`, number>;

function share(part: number, total: number) {
  return total ? Math.round((part / total) * 1000) / 10 : 0;
}

function TrendTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Row;
  return (
    <div className="rounded-xl border-[1.5px] border-line bg-surface px-3 py-2 text-sm shadow-float">
      <p className="font-bold">{row.label}</p>
      <ul className="mt-1 grid gap-0.5">
        {LINES.map((line) => (
          <li key={line.key} className="flex items-center gap-1.5 tabular">
            <SentimentIcon sentiment={line.key} className="size-3.5" />
            {line.label}: {row[line.key]}% ({row[`${line.key}Count`]})
          </li>
        ))}
      </ul>
      <p className="mt-1 text-ink-2 tabular">{row.total} labeled reviews</p>
    </div>
  );
}

/** Share of each sentiment per period. Shares, not counts, so busy weeks don't hide the change. */
export function TrendChart({ points, grain }: { points: TrendPoint[]; grain: "day" | "week" | "month" }) {
  const data: Row[] = points.map((p) => ({
    label: periodLabel(p.period, grain),
    total: p.total,
    positive: share(p.positive, p.total),
    neutral: share(p.neutral, p.total),
    negative: share(p.negative, p.total),
    positiveCount: p.positive,
    neutralCount: p.neutral,
    negativeCount: p.negative,
  }));

  return (
    <div>
      <div className="h-64 w-full" role="img" aria-label="Line chart of the share of positive, neutral and negative reviews over time. The table below has the same numbers.">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--ink-2)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--line-strong)" }}
              minTickGap={24}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fill: "var(--ink-2)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              content={(props) => <TrendTooltip active={props.active} payload={props.payload} />}
              cursor={{ stroke: "var(--line-strong)" }}
            />
            {LINES.map((line) => (
              <Line
                key={line.key}
                type="linear"
                dataKey={line.key}
                name={line.label}
                stroke={line.color}
                strokeWidth={2.5}
                strokeDasharray={line.dash}
                dot={data.length <= 12 ? { r: 3, strokeWidth: 0, fill: line.color } : false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Legend">
        {LINES.map((line) => (
          <li key={line.key} className="flex items-center gap-2">
            <svg aria-hidden width="28" height="8" className="shrink-0">
              <line x1="0" y1="4" x2="28" y2="4" stroke={line.color} strokeWidth="2.5" strokeDasharray={line.dash} />
            </svg>
            <SentimentIcon sentiment={line.key} className="size-4" />
            {line.label}
          </li>
        ))}
      </ul>
      <details className="mt-3 text-sm">
        <summary className="w-fit cursor-pointer rounded-lg py-1 font-bold text-brand-ink">View as table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left">
            <thead className="text-ink-2">
              <tr>
                <th scope="col" className="py-2 pr-3 font-bold">Period</th>
                <th scope="col" className="py-2 pr-3 font-bold">Positive</th>
                <th scope="col" className="py-2 pr-3 font-bold">Neutral</th>
                <th scope="col" className="py-2 pr-3 font-bold">Negative</th>
                <th scope="col" className="py-2 font-bold">Reviews</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {data.map((row) => (
                <tr key={row.label} className="border-t border-line">
                  <td className="py-1.5 pr-3">{row.label}</td>
                  <td className="py-1.5 pr-3">{row.positive}% ({row.positiveCount})</td>
                  <td className="py-1.5 pr-3">{row.neutral}% ({row.neutralCount})</td>
                  <td className="py-1.5 pr-3">{row.negative}% ({row.negativeCount})</td>
                  <td className="py-1.5">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
