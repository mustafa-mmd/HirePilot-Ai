import { z } from "zod";

import { DEFAULT_SCORING_WEIGHTS } from "@/modules/ai/constants";
import { scoringWeightsSchema } from "@/modules/ai/schemas";
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, JOB_STATUSES, WORKPLACE_TYPES } from "@/modules/jobs/constants";

const stringList = z.array(z.string().trim().min(1).max(80)).max(30);

export const jobInputSchema = z.object({
  title: z.string().trim().min(2).max(160),
  slug: z.string().trim().toLowerCase().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(40).max(20_000),
  department: z.string().trim().min(2).max(100),
  location: z.string().trim().min(2).max(160),
  workplaceType: z.enum(WORKPLACE_TYPES),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  experienceLevel: z.enum(EXPERIENCE_LEVELS),
  requiredSkills: stringList.min(1),
  preferredSkills: stringList,
  educationRequirements: z.array(z.string().trim().min(1).max(200)).max(10),
  scoringWeights: scoringWeightsSchema.default(DEFAULT_SCORING_WEIGHTS),
  applicationDeadline: z.iso.datetime().nullable(),
});

export const jobUpdateSchema = jobInputSchema.partial().extend({
  scoringWeights: scoringWeightsSchema.optional(),
  status: z.enum(JOB_STATUSES).optional(),
});
export const jobIdSchema = z.string().trim().regex(/^[a-f\d]{24}$/i, "Invalid job ID.");

export type JobInput = z.infer<typeof jobInputSchema>;

export function slugifyJobTitle(title: string) {
  return title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}
