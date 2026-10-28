import { Check } from "lucide-react";
import { JOURNEY_STEPS } from "@/lib/journey";

/**
 * The four-step path every upload follows: done steps are filled green with a check, the current
 * step is ringed, later steps are outlined. The words carry the state too, for screen readers.
 */
export function JourneyPath({ current, label = "Upload progress" }: { current: number; label?: string }) {
  return (
    <ol aria-label={label} className="grid grid-cols-4">
      {JOURNEY_STEPS.map((step, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li key={step} aria-current={now ? "step" : undefined} className="relative flex flex-col items-center text-center">
            {i > 0 && (
              <span
                aria-hidden
                className={`absolute right-1/2 top-6 z-0 h-2 w-full -translate-y-1/2 rounded-full ${i <= current ? "bg-brand" : "bg-surface-3"}`}
              />
            )}
            <span
              className={`relative z-10 grid size-12 place-items-center rounded-full font-display text-lg font-black ${
                done
                  ? "bg-brand text-on-brand"
                  : now
                    ? "bg-brand-soft text-brand-ink ring-4 ring-brand"
                    : "bg-surface text-ink-2 ring-2 ring-line"
              }`}
            >
              {done ? <Check aria-hidden className="size-6" strokeWidth={3.5} /> : <span aria-hidden>{i + 1}</span>}
            </span>
            <span
              className={`nav-label mt-3 max-w-full text-[11px] leading-tight tracking-normal [overflow-wrap:anywhere] sm:px-1 sm:text-[13px] sm:tracking-[0.053em] ${
                now ? "text-ink" : "text-ink-2"
              }`}
            >
              <span className="sr-only">
                Step {i + 1} of {JOURNEY_STEPS.length}
                {done ? ", done" : now ? ", current" : ""}:{" "}
              </span>
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
