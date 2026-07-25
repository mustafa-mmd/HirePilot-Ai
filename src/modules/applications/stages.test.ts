import { describe, expect, it } from "vitest";

import { canTransitionStage } from "@/modules/applications/stages";

describe("application stage transitions", () => {
  it("allows one validated forward step", () => {
    expect(canTransitionStage("applied", "cv_reviewed")).toBe(true);
    expect(canTransitionStage("offer", "hired")).toBe(true);
  });

  it("rejects skipping stages", () => {
    expect(canTransitionStage("applied", "shortlisted")).toBe(false);
    expect(canTransitionStage("shortlisted", "offer")).toBe(false);
  });

  it("allows human rejection but never changes a hired record", () => {
    expect(canTransitionStage("interview", "rejected")).toBe(true);
    expect(canTransitionStage("hired", "rejected")).toBe(false);
  });
});
