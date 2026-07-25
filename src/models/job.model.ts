import { model, models, Schema, Types, type Model } from "mongoose";

import { baseSchemaOptions } from "@/models/shared";
import { DEFAULT_SCORING_WEIGHTS } from "@/modules/ai/constants";
import type { JobRequirements, ScoringWeights } from "@/modules/ai/schemas";
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, JOB_STATUSES, WORKPLACE_TYPES, type EmploymentType, type ExperienceLevel, type JobStatus, type WorkplaceType } from "@/modules/jobs/constants";

export interface IJob {
  organizationId: Types.ObjectId;
  createdBy: Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  department: string;
  location: string;
  workplaceType: WorkplaceType;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  requiredSkills: string[];
  preferredSkills: string[];
  educationRequirements: string[];
  scoringWeights: ScoringWeights;
  structuredRequirements?: JobRequirements;
  requirementsExtractedAt?: Date;
  requirementsPromptVersion?: string;
  status: JobStatus;
  applicationDeadline?: Date;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IJob>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 100,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    description: { type: String, required: true, trim: true, maxlength: 20_000 },
    department: { type: String, required: true, trim: true, maxlength: 100 },
    location: { type: String, required: true, trim: true, maxlength: 160 },
    workplaceType: { type: String, enum: WORKPLACE_TYPES, required: true },
    employmentType: { type: String, enum: EMPLOYMENT_TYPES, required: true },
    experienceLevel: { type: String, enum: EXPERIENCE_LEVELS, required: true },
    requiredSkills: [{ type: String, trim: true, maxlength: 80 }],
    preferredSkills: [{ type: String, trim: true, maxlength: 80 }],
    educationRequirements: [{ type: String, trim: true, maxlength: 200 }],
    scoringWeights: {
      skills: { type: Number, min: 0, max: 100, default: DEFAULT_SCORING_WEIGHTS.skills, required: true },
      experience: { type: Number, min: 0, max: 100, default: DEFAULT_SCORING_WEIGHTS.experience, required: true },
      education: { type: Number, min: 0, max: 100, default: DEFAULT_SCORING_WEIGHTS.education, required: true },
      roleFit: { type: Number, min: 0, max: 100, default: DEFAULT_SCORING_WEIGHTS.roleFit, required: true },
    },
    structuredRequirements: { type: Schema.Types.Mixed },
    requirementsExtractedAt: { type: Date },
    requirementsPromptVersion: { type: String, trim: true, maxlength: 120 },
    status: { type: String, enum: JOB_STATUSES, default: "draft", required: true },
    applicationDeadline: { type: Date },
    publishedAt: { type: Date },
  },
  baseSchemaOptions,
);

jobSchema.pre("validate", function validateScoringWeights() {
  const total = Object.values(this.scoringWeights ?? {}).reduce((sum, value) => sum + Number(value), 0);
  if (total !== 100) this.invalidate("scoringWeights", "Scoring weights must total 100.");
});

jobSchema.index({ organizationId: 1, slug: 1 }, { unique: true });
jobSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
jobSchema.index({ status: 1, publishedAt: -1 });

export const Job =
  (models.Job as Model<IJob> | undefined) ?? model<IJob>("Job", jobSchema);
