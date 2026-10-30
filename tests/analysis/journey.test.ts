import { describe, expect, it } from "vitest";
import { JOURNEY_STEPS, uploadJourneyStep, wizardJourneyStep } from "@/lib/journey";

describe("the upload journey", () => {
  it("has four steps in order", () => {
    expect(JOURNEY_STEPS).toEqual(["Upload", "Match columns", "Analyze", "Results"]);
  });

  it("places an upload on the path by its status", () => {
    expect(uploadJourneyStep("importing")).toBe(0);
    expect(uploadJourneyStep("analyzing")).toBe(2);
    expect(uploadJourneyStep("done")).toBe(3);
    expect(uploadJourneyStep("done_with_issues")).toBe(3);
    expect(uploadJourneyStep("failed")).toBe(3);
  });

  it("places the upload wizard on the path by its screen", () => {
    expect(wizardJourneyStep("choose")).toBe(0);
    expect(wizardJourneyStep("map")).toBe(1);
    expect(wizardJourneyStep("preview")).toBe(2);
    expect(wizardJourneyStep("import")).toBe(2);
  });
});
