import type { UploadStatus } from "@/lib/types";

/** The path every upload follows, shown as a progress cue on the home screen, wizard and analysis screens. */
export const JOURNEY_STEPS = ["Upload", "Match columns", "Analyze", "Insights"] as const;

/** Where a saved upload is on the path. Importing hasn't finished the upload step; a finished upload has insights. */
export function uploadJourneyStep(status: UploadStatus): number {
  if (status === "importing") return 0;
  if (status === "analyzing") return 2;
  return 3;
}

/** Where the upload wizard is on the path: preview and import start the analysis. */
export function wizardJourneyStep(step: "choose" | "map" | "preview" | "import"): number {
  return { choose: 0, map: 1, preview: 2, import: 2 }[step];
}
