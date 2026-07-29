import { z } from "zod";

export const candidateRemovalSchema = z.object({
  scope: z.enum(["assessment", "candidate"]),
});

export type CandidateRemovalInput = z.infer<typeof candidateRemovalSchema>;
