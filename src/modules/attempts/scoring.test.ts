import { describe, expect, it } from "vitest";

import { scoreObjectiveAnswer } from "@/modules/attempts/scoring";

describe("objective assessment scoring", () => {
  it("ignores selection order and duplicate selections", () => expect(scoreObjectiveAnswer({ type: "multiple_choice", selectedOptions: ["b", "a", "a"], correctAnswers: ["a", "b"], points: 5 })).toBe(5));
  it("does not award partial points", () => expect(scoreObjectiveAnswer({ type: "multiple_choice", selectedOptions: ["a"], correctAnswers: ["a", "b"], points: 5 })).toBe(0));
  it("leaves subjective answers for review", () => expect(scoreObjectiveAnswer({ type: "long_text", selectedOptions: [], correctAnswers: [], points: 5 })).toBeUndefined());
});
