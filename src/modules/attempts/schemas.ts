import { z } from "zod";

import { INTEGRITY_EVENT_TYPES } from "@/modules/assessments/constants";
import { ASSESSMENT_MEDIA_KINDS } from "@/modules/media/types";

export const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const browserSessionSchema = z.string().uuid();
export const otpRequestSchema = z.object({ token: invitationTokenSchema, email: z.email().max(254).transform((value) => value.toLowerCase()) });
export const otpVerifySchema = z.object({ token: invitationTokenSchema, code: z.string().regex(/^\d{6}$/) });
export const startAttemptSchema = z.object({
  token: invitationTokenSchema,
  sessionId: browserSessionSchema,
  systemCheck: z.object({ camera: z.boolean(), microphone: z.boolean(), network: z.literal(true) }),
  consent: z.object({ privacy: z.literal(true), monitoring: z.literal(true), mediaRecording: z.boolean() }),
});
export const answerInputSchema = z.object({
  token: invitationTokenSchema,
  sessionId: browserSessionSchema,
  questionId: z.string().regex(/^[a-f\d]{24}$/i),
  selectedOptions: z.array(z.string().max(80)).max(20).default([]),
  text: z.string().max(100_000).default(""),
  coding: z.object({ language: z.string().max(80), sourceCode: z.string().max(100_000) }).optional(),
  media: z.object({ kind: z.enum(ASSESSMENT_MEDIA_KINDS), asset: z.object({ url: z.url(), publicId: z.string().max(500), resourceType: z.enum(["image", "video", "raw"]), format: z.string().max(40), bytes: z.number().int().positive(), duration: z.number().nonnegative().optional() }) }).optional(),
  submit: z.boolean().default(false),
});
export const integrityEventInputSchema = z.object({
  token: invitationTokenSchema,
  sessionId: browserSessionSchema,
  type: z.enum(INTEGRITY_EVENT_TYPES),
  questionId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  clientOccurredAt: z.iso.datetime().optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
});
export const completeAttemptSchema = z.object({ token: invitationTokenSchema, sessionId: browserSessionSchema });
export const mediaSignatureSchema = z.object({ token: invitationTokenSchema, sessionId: browserSessionSchema, questionId: z.string().regex(/^[a-f\d]{24}$/i), kind: z.enum(ASSESSMENT_MEDIA_KINDS) });
export const integrityMediaCompleteSchema = mediaSignatureSchema.extend({ asset: z.object({ url: z.url(), publicId: z.string().max(500), resourceType: z.enum(["image", "video", "raw"]), format: z.string().max(40), bytes: z.number().int().positive(), duration: z.number().nonnegative().optional() }) });
export const codeExecutionSchema = z.object({ token: invitationTokenSchema, sessionId: browserSessionSchema, questionId: z.string().regex(/^[a-f\d]{24}$/i), language: z.string().trim().min(1).max(80), sourceCode: z.string().min(1).max(100_000), stdin: z.string().max(10_000).default(""), submit: z.boolean().default(false) });

export type StartAttemptInput = z.infer<typeof startAttemptSchema>;
export type AnswerInput = z.infer<typeof answerInputSchema>;
export type IntegrityEventInput = z.infer<typeof integrityEventInputSchema>;
