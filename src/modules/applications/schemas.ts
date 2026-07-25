import { z } from "zod";

import { APPLICATION_STAGES } from "@/modules/applications/constants";

const optionalUrl = z.union([z.literal(""), z.url().max(500)]).optional().transform((value) => value || undefined);

export const applicationInputSchema = z.object({
  jobId: z.string().regex(/^[a-f\d]{24}$/i),
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().max(40).optional(),
  location: z.string().trim().max(160).optional(),
  linkedinUrl: optionalUrl,
  githubUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  coverLetter: z.string().trim().max(5_000).optional(),
  consentGiven: z.literal(true),
  cv: z.object({
    url: z.url().max(1_000),
    publicId: z.string().min(10).max(500),
    resourceType: z.literal("raw"),
    format: z.enum(["pdf", "doc", "docx"]),
    bytes: z.number().int().positive().max(5 * 1024 * 1024),
    originalFilename: z.string().trim().min(1).max(255),
  }),
});

export const stageUpdateSchema = z.object({ stage: z.enum(APPLICATION_STAGES) });
export type ApplicationInput = z.infer<typeof applicationInputSchema>;
