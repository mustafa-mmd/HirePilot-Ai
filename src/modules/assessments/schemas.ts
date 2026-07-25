import { z } from "zod";

import {
  MONITORING_LEVELS,
  QUESTION_DIFFICULTIES,
  QUESTION_TYPES,
  TEMPLATE_STATUSES,
} from "@/modules/assessments/constants";

const objectIdSchema = z.string().trim().regex(/^[a-f\d]{24}$/i, "Invalid ID.");

const optionSchema = z.object({
  id: z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  label: z.string().trim().min(1).max(500),
});

export const questionInputSchema = z.object({
  type: z.enum(QUESTION_TYPES),
  title: z.string().trim().min(3).max(300),
  description: z.string().trim().min(3).max(10_000),
  category: z.string().trim().min(2).max(100),
  difficulty: z.enum(QUESTION_DIFFICULTIES),
  options: z.array(optionSchema).max(20),
  correctAnswers: z.array(z.string().trim().min(1).max(80)).max(20),
  explanation: z.string().trim().max(5_000),
  points: z.number().int().min(1).max(1_000),
  timeLimit: z.number().int().min(30).max(7_200),
  preparationTime: z.number().int().min(0).max(1_800),
  randomizeAnswers: z.boolean(),
  rubric: z.object({
    criteria: z.array(z.string().trim().min(2).max(500)).max(20),
    guidance: z.string().trim().max(5_000),
  }),
  required: z.boolean(),
  manualReviewRequired: z.boolean(),
  codingConfig: z.object({
    language: z.string().trim().max(80),
    allowedLanguages: z.array(z.string().trim().min(1).max(80)).max(10).optional(),
    starterCode: z.string().max(20_000),
    exampleTests: z.array(z.object({ input: z.string().max(10_000), expectedOutput: z.string().max(10_000) })).max(20).optional(),
    hiddenTests: z.array(z.object({ input: z.string().max(10_000), expectedOutput: z.string().max(10_000) })).max(50).optional(),
    runtimeLimitMs: z.number().int().min(250).max(15_000).optional(),
    memoryLimitKb: z.number().int().min(16_000).max(512_000).optional(),
  }),
}).superRefine((question, context) => {
  const optionIds = new Set(question.options.map((option) => option.id));
  if (optionIds.size !== question.options.length) {
    context.addIssue({ code: "custom", path: ["options"], message: "Option IDs must be unique." });
  }

  if (["single_choice", "multiple_choice"].includes(question.type)) {
    if (question.options.length < 2) context.addIssue({ code: "custom", path: ["options"], message: "Choice questions need at least two options." });
    if (question.correctAnswers.some((answer) => !optionIds.has(answer))) context.addIssue({ code: "custom", path: ["correctAnswers"], message: "Correct answers must reference an option." });
    if (question.type === "single_choice" && question.correctAnswers.length !== 1) context.addIssue({ code: "custom", path: ["correctAnswers"], message: "Select exactly one correct answer." });
    if (question.type === "multiple_choice" && question.correctAnswers.length < 1) context.addIssue({ code: "custom", path: ["correctAnswers"], message: "Select at least one correct answer." });
    if (new Set(question.correctAnswers).size !== question.correctAnswers.length) context.addIssue({ code: "custom", path: ["correctAnswers"], message: "Correct answers cannot be duplicated." });
  } else if (question.type === "true_false") {
    if (question.correctAnswers.length !== 1 || !["true", "false"].includes(question.correctAnswers[0] ?? "")) context.addIssue({ code: "custom", path: ["correctAnswers"], message: "Choose true or false." });
  } else if (question.correctAnswers.length > 0) {
    context.addIssue({ code: "custom", path: ["correctAnswers"], message: "Only automatically graded questions can have correct answers." });
  }
  if (!["single_choice", "multiple_choice"].includes(question.type) && question.options.length > 0) context.addIssue({ code: "custom", path: ["options"], message: "Only choice questions can define answer options." });

  if (question.type === "coding" && !question.codingConfig.language) context.addIssue({ code: "custom", path: ["codingConfig", "language"], message: "Choose a coding language." });
});

export const questionUpdateSchema = questionInputSchema;
export const questionIdSchema = objectIdSchema;

export const assessmentTemplateInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(3).max(5_000),
  instructions: z.string().trim().min(20).max(10_000),
  monitoringLevel: z.enum(MONITORING_LEVELS),
  totalDuration: z.number().int().min(5).max(480),
  questionIds: z.array(objectIdSchema).min(1).max(100).refine((ids) => new Set(ids).size === ids.length, "Questions cannot be duplicated."),
  randomizationSettings: z.object({
    randomizeQuestionOrder: z.boolean(),
    questionLimit: z.number().int().min(1).max(100).nullable(),
  }),
});

export const assessmentTemplateUpdateSchema = assessmentTemplateInputSchema.partial().extend({ status: z.enum(TEMPLATE_STATUSES).optional() });
export const assessmentTemplateIdSchema = objectIdSchema;

export const assessmentInvitationInputSchema = z.object({
  assessmentId: objectIdSchema,
  applicationId: objectIdSchema,
  expiresAt: z.iso.datetime(),
  startDeadline: z.iso.datetime(),
  maximumAttempts: z.number().int().min(1).max(5),
  candidateInstructions: z.string().trim().min(20).max(10_000),
  remindersEnabled: z.boolean(),
}).superRefine((input, context) => {
  const now = Date.now();
  const startDeadline = new Date(input.startDeadline).getTime();
  const expiresAt = new Date(input.expiresAt).getTime();
  if (startDeadline <= now) context.addIssue({ code: "custom", path: ["startDeadline"], message: "The start deadline must be in the future." });
  if (expiresAt < startDeadline) context.addIssue({ code: "custom", path: ["expiresAt"], message: "Expiration cannot be before the start deadline." });
});

export type QuestionInput = z.infer<typeof questionInputSchema>;
export type AssessmentTemplateInput = z.infer<typeof assessmentTemplateInputSchema>;
export type AssessmentInvitationInput = z.infer<typeof assessmentInvitationInputSchema>;
