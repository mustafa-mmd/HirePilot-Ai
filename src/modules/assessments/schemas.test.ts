import { describe, expect, it } from "vitest";

import { assessmentInvitationInputSchema, assessmentTemplateInputSchema, assessmentTemplateUpdateSchema, questionInputSchema } from "@/modules/assessments/schemas";

const baseQuestion = {
  type: "single_choice",
  title: "React rendering behavior",
  description: "Which statement best describes React Server Components?",
  category: "React",
  difficulty: "medium",
  options: [{ id: "a", label: "They render on the server" }, { id: "b", label: "They require useEffect" }],
  correctAnswers: ["a"],
  explanation: "Server Components execute on the server.",
  points: 10,
  timeLimit: 120,
  preparationTime: 0,
  randomizeAnswers: true,
  rubric: { criteria: [], guidance: "" },
  required: true,
  manualReviewRequired: false,
  codingConfig: { language: "", starterCode: "" },
} as const;

describe("assessment validation", () => {
  it("accepts a valid single-choice question", () => expect(questionInputSchema.safeParse(baseQuestion).success).toBe(true));
  it("rejects correct answers that do not reference an option", () => expect(questionInputSchema.safeParse({ ...baseQuestion, correctAnswers: ["missing"] }).success).toBe(false));
  it("rejects correct-answer keys on written questions", () => expect(questionInputSchema.safeParse({ ...baseQuestion, type: "long_text", options: [], correctAnswers: ["a"] }).success).toBe(false));
  it("requires a language for coding challenges", () => expect(questionInputSchema.safeParse({ ...baseQuestion, type: "coding", options: [], correctAnswers: [], codingConfig: { language: "", starterCode: "" } }).success).toBe(false));

  it("rejects duplicate questions in a template", () => {
    const id = "507f1f77bcf86cd799439011";
    expect(assessmentTemplateInputSchema.safeParse({ title: "Frontend screen", description: "Core frontend knowledge", instructions: "Complete every question without outside assistance.", monitoringLevel: "standard", totalDuration: 30, questionIds: [id, id], randomizationSettings: { randomizeQuestionOrder: false, questionLimit: null } }).success).toBe(false);
  });

  it("does not inject fields into status-only template updates", () => expect(assessmentTemplateUpdateSchema.parse({ status: "published" })).toEqual({ status: "published" }));

  it("requires the assessment end time to be after its start time", () => {
    const startDeadline = new Date(Date.now() + 3_600_000).toISOString();
    const expiresAt = new Date(Date.now() + 1_800_000).toISOString();
    expect(assessmentInvitationInputSchema.safeParse({ assessmentId: "507f1f77bcf86cd799439011", applicationId: "507f191e810c19729de860ea", startDeadline, expiresAt, maximumAttempts: 1, candidateInstructions: "Complete this assessment in one uninterrupted sitting.", remindersEnabled: true }).success).toBe(false);
  });

  it("rejects a zero-length assessment window", () => {
    const startDeadline = new Date(Date.now() + 3_600_000).toISOString();
    expect(assessmentInvitationInputSchema.safeParse({ assessmentId: "507f1f77bcf86cd799439011", applicationId: "507f191e810c19729de860ea", startDeadline, expiresAt: startDeadline, maximumAttempts: 1, candidateInstructions: "Complete this assessment in one uninterrupted sitting.", remindersEnabled: true }).success).toBe(false);
  });
});
