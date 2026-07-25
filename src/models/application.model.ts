import { model, models, Schema, Types, type Model } from "mongoose";

import { baseSchemaOptions } from "@/models/shared";
import { APPLICATION_STAGES, type ApplicationStage } from "@/modules/applications/constants";

export interface IApplication {
  organizationId: Types.ObjectId;
  jobId: Types.ObjectId;
  candidateId: Types.ObjectId;
  cvUrl: string;
  cvPublicId: string;
  cvResourceType: string;
  cvFormat: string;
  cvBytes: number;
  cvOriginalFilename: string;
  cvText?: string;
  coverLetter?: string;
  parsedProfile?: Record<string, unknown>;
  cvEvaluationId?: Types.ObjectId;
  cvProcessingStatus: "pending" | "processing" | "completed" | "failed";
  cvProcessingStartedAt?: Date;
  cvProcessingError?: string;
  stage: ApplicationStage;
  source: string;
  consentGiven: boolean;
  appliedAt: Date;
  recruiterNotes: Array<{ _id: Types.ObjectId; text: string; authorId: Types.ObjectId; createdAt: Date }>;
  humanDecision?: "shortlisted" | "interview" | "offer" | "hired" | "rejected";
  decisionReason?: string;
  decidedBy?: Types.ObjectId;
  decidedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    candidateId: { type: Schema.Types.ObjectId, ref: "Candidate", required: true },
    cvUrl: { type: String, required: true, trim: true, maxlength: 1_000 },
    cvPublicId: { type: String, required: true, trim: true, maxlength: 500 },
    cvResourceType: { type: String, required: true, enum: ["raw", "image"] },
    cvFormat: { type: String, required: true, enum: ["pdf", "doc", "docx"] },
    cvBytes: { type: Number, required: true, min: 1, max: 5 * 1024 * 1024 },
    cvOriginalFilename: { type: String, required: true, trim: true, maxlength: 255 },
    cvText: { type: String, maxlength: 200_000 },
    coverLetter: { type: String, trim: true, maxlength: 5_000 },
    parsedProfile: { type: Schema.Types.Mixed },
    cvEvaluationId: { type: Schema.Types.ObjectId, ref: "Evaluation" },
    cvProcessingStatus: { type: String, enum: ["pending", "processing", "completed", "failed"], default: "pending", required: true },
    cvProcessingStartedAt: { type: Date },
    cvProcessingError: { type: String, trim: true, maxlength: 1_000 },
    stage: { type: String, enum: APPLICATION_STAGES, default: "applied", required: true },
    source: { type: String, default: "career_page", trim: true, maxlength: 80 },
    consentGiven: { type: Boolean, required: true, validate: (value: boolean) => value },
    appliedAt: { type: Date, default: Date.now, required: true },
    recruiterNotes: [{ text: { type: String, required: true, trim: true, maxlength: 5_000 }, authorId: { type: Schema.Types.ObjectId, ref: "User", required: true }, createdAt: { type: Date, required: true, default: Date.now } }],
    humanDecision: { type: String, enum: ["shortlisted", "interview", "offer", "hired", "rejected"] },
    decisionReason: { type: String, trim: true, maxlength: 5_000 },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User" },
    decidedAt: Date,
  },
  baseSchemaOptions,
);

applicationSchema.index({ organizationId: 1, jobId: 1, stage: 1 });
applicationSchema.index({ organizationId: 1, jobId: 1, candidateId: 1 }, { unique: true });
applicationSchema.index({ organizationId: 1, candidateId: 1, appliedAt: -1 });

export const Application =
  (models.Application as Model<IApplication> | undefined) ??
  model<IApplication>("Application", applicationSchema);
