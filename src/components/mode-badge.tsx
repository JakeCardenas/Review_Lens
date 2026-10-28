import { Languages, Sparkles } from "lucide-react";
import { tagClasses } from "@/components/ui";

/** Which analysis mode an upload used. An upload keeps its mode for good; it is never reanalyzed in another. */
export function ModeBadge({ provider }: { provider: string }) {
  const ai = provider === "gemini";
  const label = ai ? "AI mode (Gemini)" : provider === "basic" ? "Basic mode (English only)" : "Test mode";
  const Icon = ai ? Sparkles : Languages;
  return (
    <span className={`${tagClasses} ${ai ? "bg-accent-soft text-accent-ink" : "bg-surface-2 text-ink-2"}`}>
      <Icon aria-hidden className="size-3.5" strokeWidth={2.5} />
      {label}
    </span>
  );
}
