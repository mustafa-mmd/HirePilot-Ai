import { z } from "zod";

export const scoringWeightsSchema = z
  .object({
    skills: z.number().int().min(0).max(100),
    experience: z.number().int().min(0).max(100),
    education: z.number().int().min(0).max(100),
    roleFit: z.number().int().min(0).max(100),
  })
  .refine((weights) => Object.values(weights).reduce((sum, value) => sum + value, 0) === 100, {
    message: "Scoring weights must total 100.",
  });

export const candidateProfileSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  skills: z.array(z.object({
    name: z.string(),
    years: z.number().min(0).nullable(),
    evidence: z.string(),
  })),
  experienceHistory: z.array(z.object({
    jobTitle: z.string(),
    employer: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    summary: z.string(),
    highlights: z.array(z.string()),
  })),
  education: z.array(z.object({
    qualification: z.string(),
    institution: z.string(),
    field: z.string(),
    endDate: z.string(),
    evidence: z.string(),
  })),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string(),
    date: z.string(),
    evidence: z.string(),
  })),
  projects: z.array(z.object({
    name: z.string(),
    description: z.string(),
    technologies: z.array(z.string()),
    evidence: z.string(),
  })),
  totalExperienceYears: z.number().min(0),
  sourceQuality: z.enum(["high", "medium", "low"]),
  manualReviewNotes: z.array(z.string()),
});

export const jobRequirementsSchema = z.object({
  summary: z.string(),
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  minExperienceYears: z.number().min(0),
  educationRequirements: z.array(z.string()),
  responsibilities: z.array(z.string()),
  successCriteria: z.array(z.string()),
});

export const evidenceItemSchema = z.object({
  criterion: z.string(),
  sourceQuote: z.string(),
});

export const evaluationResultSchema = z.object({
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  strengths: z.array(z.string()),
  missingPoints: z.array(z.string()),
  evidence: z.array(evidenceItemSchema),
  suggestedFollowUpQuestions: z.array(z.string()),
  manualReviewRequired: z.boolean(),
  rubricBreakdown: z.array(z.object({
    category: z.enum(["skills", "experience", "education", "roleFit"]),
    weight: z.number().min(0).max(100),
    score: z.number().min(0).max(100),
    maxScore: z.number().min(0).max(100),
    evidence: z.array(evidenceItemSchema),
  })),
});

export const assessmentEvaluationSchema = z.object({
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  strengths: z.array(z.string()),
  missingPoints: z.array(z.string()),
  evidence: z.array(evidenceItemSchema),
  suggestedFollowUpQuestions: z.array(z.string()),
  manualReviewRequired: z.boolean(),
  rubricBreakdown: z.array(z.object({ category: z.string(), weight: z.number().min(0).max(100), score: z.number().min(0).max(100), maxScore: z.number().min(0).max(100), evidence: z.array(evidenceItemSchema) })),
});

export type ScoringWeights = z.infer<typeof scoringWeightsSchema>;
export type CandidateProfile = z.infer<typeof candidateProfileSchema>;
export type JobRequirements = z.infer<typeof jobRequirementsSchema>;
export type EvaluationResult = z.infer<typeof evaluationResultSchema>;
export type AssessmentEvaluationResult = z.infer<typeof assessmentEvaluationSchema>;
