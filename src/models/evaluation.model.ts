import { model, models, Schema, Types, type Model } from "mongoose";

import { baseSchemaOptions } from "@/models/shared";

export interface IEvaluation {
  provider: "gemini";
  organizationId: Types.ObjectId;
  kind: "cv_match" | "answer" | "assessment";
  applicationId: Types.ObjectId;
  candidateId: Types.ObjectId;
  jobId: Types.ObjectId;
  attemptId?: Types.ObjectId;
  answerId?: Types.ObjectId;
  questionId?: Types.ObjectId;
  score: number;
  confidence: number;
  summary: string;
  strengths: string[];
  missingPoints: string[];
  evidence: Array<{ criterion: string; sourceQuote: string }>;
  suggestedFollowUpQuestions: string[];
  manualReviewRequired: boolean;
  rubricBreakdown: Array<{
    category: string;
    weight: number;
    score: number;
    maxScore: number;
    evidence: Array<{ criterion: string; sourceQuote: string }>;
  }>;
  model: string;
  promptVersion: string;
  evaluatedAt: Date;
  humanReviewStatus: "pending" | "reviewed" | "overridden";
  rawScore?: number;
  maximumScore?: number;
  overrideScore?: number;
  overrideReason?: string;
  overriddenBy?: Types.ObjectId;
  overriddenAt?: Date;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const evidenceSchema = new Schema(
  {
    criterion: { type: String, required: true, trim: true, maxlength: 500 },
    sourceQuote: { type: String, required: true, trim: true, maxlength: 1_000 },
  },
  { _id: false },
);

const evaluationSchema = new Schema<IEvaluation>(
  {
    provider: { type: String, required: true, enum: ["gemini"], default: "gemini" },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    kind: { type: String, enum: ["cv_match", "answer", "assessment"], required: true, default: "cv_match" },
    applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true },
    candidateId: { type: Schema.Types.ObjectId, ref: "Candidate", required: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    attemptId: { type: Schema.Types.ObjectId, ref: "AssessmentAttempt" },
    answerId: { type: Schema.Types.ObjectId, ref: "Answer" },
    questionId: { type: Schema.Types.ObjectId, ref: "Question" },
    score: { type: Number, required: true, min: 0, max: 100 },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    summary: { type: String, required: true, trim: true, maxlength: 4_000 },
    strengths: [{ type: String, trim: true, maxlength: 1_000 }],
    missingPoints: [{ type: String, trim: true, maxlength: 1_000 }],
    evidence: [evidenceSchema],
    suggestedFollowUpQuestions: [{ type: String, trim: true, maxlength: 1_000 }],
    manualReviewRequired: { type: Boolean, required: true },
    rubricBreakdown: [{
      category: { type: String, required: true, trim: true, maxlength: 200 },
      weight: { type: Number, required: true, min: 0, max: 100 },
      score: { type: Number, required: true, min: 0, max: 100 },
      maxScore: { type: Number, required: true, min: 0, max: 100 },
      evidence: [evidenceSchema],
    }],
    model: { type: String, required: true, trim: true, maxlength: 120 },
    promptVersion: { type: String, required: true, trim: true, maxlength: 120 },
    evaluatedAt: { type: Date, required: true, default: Date.now },
    humanReviewStatus: { type: String, required: true, enum: ["pending", "reviewed", "overridden"], default: "pending" },
    rawScore: { type: Number, min: 0 },
    maximumScore: { type: Number, min: 0 },
    overrideScore: { type: Number, min: 0 },
    overrideReason: { type: String, trim: true, maxlength: 2_000 },
    overriddenBy: { type: Schema.Types.ObjectId, ref: "User" },
    overriddenAt: Date,
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  baseSchemaOptions,
);

evaluationSchema.index({ organizationId: 1, applicationId: 1, kind: 1 }, { unique: true, partialFilterExpression: { kind: "cv_match" } });
evaluationSchema.index({ organizationId: 1, answerId: 1, kind: 1 }, { unique: true, partialFilterExpression: { kind: "answer" } });
evaluationSchema.index({ organizationId: 1, attemptId: 1, kind: 1 }, { unique: true, partialFilterExpression: { kind: "assessment" } });
evaluationSchema.index({ organizationId: 1, jobId: 1, score: -1 });
evaluationSchema.index({ organizationId: 1, humanReviewStatus: 1, evaluatedAt: -1 });

export const Evaluation =
  (models.Evaluation as Model<IEvaluation> | undefined) ??
  model<IEvaluation>("Evaluation", evaluationSchema);
