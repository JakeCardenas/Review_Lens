/** Plain-language explanation of the confidence levels. */
export function ConfidenceExplainer({ basicMode }: { basicMode: boolean }) {
  return (
    <details className="group rounded-card border border-line bg-surface px-5 py-4 text-sm">
      <summary className="cursor-pointer font-semibold text-ink marker:text-ink-3">What does confidence mean?</summary>
      <div className="mt-3 grid max-w-3xl gap-2 text-ink-2">
        <p>
          Confidence shows how sure ReviewLens is about a label, on a three-step scale: High, Medium or Low. It combines how clearly
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
