import { z } from "zod";

export const scoreOverrideSchema = z.object({ score: z.number().min(0).max(1_000), reason: z.string().trim().min(10).max(2_000) });
export const recruiterNoteSchema = z.object({ text: z.string().trim().min(2).max(5_000) });
export const humanDecisionSchema = z.object({ decision: z.enum(["shortlisted", "interview", "offer", "hired", "rejected"]), reason: z.string().trim().min(10).max(5_000) });
