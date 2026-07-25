import { model, models, Schema, Types, type Model } from "mongoose";

import { baseSchemaOptions } from "@/models/shared";
import { MONITORING_LEVELS, TEMPLATE_STATUSES, type MonitoringLevel, type TemplateStatus } from "@/modules/assessments/constants";

export interface IAssessmentTemplate {
  organizationId: Types.ObjectId;
  createdBy: Types.ObjectId;
  title: string;
  description: string;
  instructions: string;
  monitoringLevel: MonitoringLevel;
  totalDuration: number;
  questionIds: Types.ObjectId[];
  randomizationSettings: { randomizeQuestionOrder: boolean; questionLimit: number | null };
  totalPoints: number;
  status: TemplateStatus;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const assessmentTemplateSchema = new Schema<IAssessmentTemplate>({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, required: true, trim: true, maxlength: 5_000 },
  instructions: { type: String, required: true, trim: true, maxlength: 10_000 },
  monitoringLevel: { type: String, enum: MONITORING_LEVELS, required: true },
  totalDuration: { type: Number, required: true, min: 5, max: 480 },
  questionIds: [{ type: Schema.Types.ObjectId, ref: "Question", required: true }],
  randomizationSettings: { _id: false, randomizeQuestionOrder: { type: Boolean, required: true, default: false }, questionLimit: { type: Number, min: 1, max: 100, default: null } },
  totalPoints: { type: Number, required: true, min: 0, default: 0 },
  status: { type: String, enum: TEMPLATE_STATUSES, required: true, default: "draft" },
  publishedAt: { type: Date },
}, baseSchemaOptions);

assessmentTemplateSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
assessmentTemplateSchema.index({ organizationId: 1, title: 1 });

export const AssessmentTemplate = (models.AssessmentTemplate as Model<IAssessmentTemplate> | undefined) ?? model<IAssessmentTemplate>("AssessmentTemplate", assessmentTemplateSchema);
