import { Check } from "lucide-react";
import { JOURNEY_STEPS } from "@/lib/journey";

/**
 * Where an upload is on its four steps, shown only while it's in progress: a short line naming the
 * current step and one slim segment per step (done in the logo green, current lime, later grey). Step names show
 * under the segments on wider screens; screen readers get every step and its state.
 */
export function JourneyPath({ current, label = "Upload progress" }: { current: number; label?: string }) {
  return (
    <div>
      <p aria-hidden className="text-[15px] font-bold text-ink">
        <span className="text-ink-2">
          Step {current + 1} of {JOURNEY_STEPS.length}:
        </span>{" "}
        {JOURNEY_STEPS[current]}
      </p>
      <ol aria-label={label} className="mt-2.5 grid grid-cols-4 gap-1.5">
        {JOURNEY_STEPS.map((step, i) => {
          const done = i < current;
          const now = i === current;
          return (
            <li key={step} aria-current={now ? "step" : undefined} className="min-w-0">
              <span aria-hidden className={`block h-2.5 rounded-full ${done ? "bg-lime-edge" : now ? "bg-lime" : "bg-surface-3"}`} />
              <span
                aria-hidden
                className={`mt-2 hidden items-center gap-1 truncate text-[13px] font-bold sm:flex ${now ? "text-ink" : "text-ink-2"}`}
              >
                {done && <Check className="size-3.5 shrink-0 text-ink" strokeWidth={3.5} />}
                {step}
              </span>
              <span className="sr-only">
                Step {i + 1} of {JOURNEY_STEPS.length}
                {done ? ", done" : now ? ", current" : ""}: {step}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
