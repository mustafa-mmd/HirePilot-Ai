import { describe, expect, it } from "vitest";

import { calculateAssessmentMetrics } from "@/modules/assessments/metrics";

describe("assessment metrics", () => {
  it("sums full-template points and time", () => expect(calculateAssessmentMetrics([{ points: 10, timeLimit: 60 }, { points: 20, timeLimit: 120 }], null)).toEqual({ totalPoints: 30, timedMinutes: 3, unequalRandomizedPoints: false }));
  it("uses the slowest possible randomized subset for timer validation", () => expect(calculateAssessmentMetrics([{ points: 10, timeLimit: 60 }, { points: 10, timeLimit: 300 }, { points: 10, timeLimit: 180 }], 2)).toEqual({ totalPoints: 20, timedMinutes: 8, unequalRandomizedPoints: false }));
  it("flags unequal point values in a randomized subset", () => expect(calculateAssessmentMetrics([{ points: 10, timeLimit: 60 }, { points: 20, timeLimit: 60 }], 1).unequalRandomizedPoints).toBe(true));
});
