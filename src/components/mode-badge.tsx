import { Languages, Sparkles } from "lucide-react";

/** Which analysis mode an upload used. An upload keeps its mode for good; it is never reanalyzed in another. */
export function ModeBadge({ provider }: { provider: string }) {
  const ai = provider === "gemini";
  const label = ai ? "AI mode (Gemini)" : provider === "basic" ? "Basic mode (English only)" : "Test mode";
  const Icon = ai ? Sparkles : Languages;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        ai ? "bg-brand-soft text-brand-ink" : "border border-line-strong text-ink-2"
      }`}
    >
      <Icon aria-hidden className="size-3.5" />
      {label}
    </span>
  );
}
