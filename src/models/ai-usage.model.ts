import { model, models, Schema, Types, type Model } from "mongoose";

import { baseSchemaOptions } from "@/models/shared";
import { AI_OPERATIONS, type AIOperation } from "@/modules/ai/constants";

export interface IAIUsage {
  provider: "gemini";
  organizationId: Types.ObjectId;
  userId?: Types.ObjectId;
  applicationId: Types.ObjectId;
  attemptId?: Types.ObjectId;
  answerId?: Types.ObjectId;
  evaluationId?: Types.ObjectId;
  operation: AIOperation;
  model: string;
  promptVersion: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  createdAt: Date;
  updatedAt: Date;
}

const aiUsageSchema = new Schema<IAIUsage>(
  {
    provider: { type: String, required: true, enum: ["gemini"], default: "gemini" },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true },
    attemptId: { type: Schema.Types.ObjectId, ref: "AssessmentAttempt" },
    answerId: { type: Schema.Types.ObjectId, ref: "Answer" },
    evaluationId: { type: Schema.Types.ObjectId, ref: "Evaluation" },
    operation: { type: String, required: true, enum: AI_OPERATIONS },
    model: { type: String, required: true, trim: true, maxlength: 120 },
    promptVersion: { type: String, required: true, trim: true, maxlength: 120 },
    inputTokens: { type: Number, required: true, min: 0 },
    cachedInputTokens: { type: Number, required: true, min: 0, default: 0 },
    outputTokens: { type: Number, required: true, min: 0 },
    totalTokens: { type: Number, required: true, min: 0 },
    estimatedCostUsd: { type: Number, required: true, min: 0 },
  },
  baseSchemaOptions,
);

aiUsageSchema.index({ organizationId: 1, createdAt: -1 });
aiUsageSchema.index({ organizationId: 1, applicationId: 1, createdAt: -1 });
aiUsageSchema.index({ organizationId: 1, attemptId: 1, createdAt: -1 });

export const AIUsage =
  (models.AIUsage as Model<IAIUsage> | undefined) ??
  model<IAIUsage>("AIUsage", aiUsageSchema);
