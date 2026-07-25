import { describe, expect, it } from "vitest";

import { jobInputSchema, jobUpdateSchema, slugifyJobTitle } from "@/modules/jobs/schemas";

const validJob = { title: "Senior Product Engineer", slug: "senior-product-engineer", description: "Build reliable recruiting workflows with a collaborative product team.", department: "Engineering", location: "Remote", workplaceType: "remote", employmentType: "full_time", experienceLevel: "senior", requiredSkills: ["TypeScript"], preferredSkills: [], educationRequirements: [], applicationDeadline: null } as const;

describe("job validation", () => {
  it("generates a safe public slug", () => expect(slugifyJobTitle("Développeur — Platform! ")).toBe("developpeur-platform"));
  it("accepts a complete role", () => expect(jobInputSchema.safeParse(validJob).success).toBe(true));
  it("rejects unsafe slugs and empty requirements", () => expect(jobInputSchema.safeParse({ ...validJob, slug: "../admin", requiredSkills: [] }).success).toBe(false));
  it("rejects scoring weights that do not total 100", () => expect(jobInputSchema.safeParse({ ...validJob, scoringWeights: { skills: 80, experience: 25, education: 10, roleFit: 15 } }).success).toBe(false));
  it("does not inject scoring defaults into unrelated updates", () => expect(jobUpdateSchema.parse({ status: "published" })).toEqual({ status: "published" }));
});
