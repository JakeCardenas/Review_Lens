import { ChevronDown, CircleHelp } from "lucide-react";

/** Plain-language explanation of the confidence levels. */
export function ConfidenceExplainer({ basicMode }: { basicMode: boolean }) {
  return (
    <details className="group rounded-card bg-surface-2 text-[15px]">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 rounded-card px-5 py-3 font-bold text-accent-ink [&::-webkit-details-marker]:hidden">
        <CircleHelp aria-hidden className="size-5" strokeWidth={2.5} />
        <span className="flex-1">What does confidence mean?</span>
        <ChevronDown aria-hidden className="size-4 text-ink-2 transition-transform duration-150 group-open:rotate-180" />
      </summary>
      <div className="grid max-w-3xl gap-2 px-5 pb-5 text-ink-2">
        <p>
          Confidence shows how sure ReviewLens is about a label: High, Medium or Low. It combines how clearly
          the model read the wording with simple checks: whether the review mixes praise and complaints, whether it is very short,
          whether it mixes in a language ReviewLens doesn&apos;t read, and whether its star rating agrees with the wording.
        </p>
        <p>
          It is not a percentage chance of being right, and it has not been measured against reviews labeled by people. Read Low
          confidence reviews yourself before acting on them.
        </p>
        {basicMode && (
          <p>This upload was labeled in Basic mode with a word list, which is less accurate than AI mode, so no label is marked High.</p>
        )}
      </div>
    </details>
  );
}
