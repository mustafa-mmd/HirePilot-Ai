import { model, models, Schema, Types, type Model } from "mongoose";

import { baseSchemaOptions } from "@/models/shared";
import { INVITATION_STATUSES, MONITORING_LEVELS, type AssessmentInvitationStatus, type MonitoringLevel } from "@/modules/assessments/constants";

export interface IAssessmentInvitation {
  organizationId: Types.ObjectId;
  assessmentId: Types.ObjectId;
  applicationId: Types.ObjectId;
  candidateId: Types.ObjectId;
  tokenHash: string;
  latestReminderTokenHash?: string;
  expiresAt: Date;
  startDeadline: Date;
  maximumAttempts: number;
  assessmentDuration: number;
  monitoringLevel: MonitoringLevel;
  candidateInstructions: string;
  remindersEnabled: boolean;
  status: AssessmentInvitationStatus;
  sentAt: Date;
  openedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  lastReminderSentAt?: Date;
  reminderCount: number;
  otpHash?: string;
  otpExpiresAt?: Date;
  otpAttempts: number;
  otpRequestCount: number;
  otpVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const assessmentInvitationSchema = new Schema<IAssessmentInvitation>({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  assessmentId: { type: Schema.Types.ObjectId, ref: "AssessmentTemplate", required: true },
  applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true },
  candidateId: { type: Schema.Types.ObjectId, ref: "Candidate", required: true },
  tokenHash: { type: String, required: true, unique: true, select: false, minlength: 64, maxlength: 64 },
  latestReminderTokenHash: { type: String, unique: true, sparse: true, select: false, minlength: 64, maxlength: 64 },
  expiresAt: { type: Date, required: true },
  startDeadline: { type: Date, required: true },
  maximumAttempts: { type: Number, required: true, min: 1, max: 5 },
  assessmentDuration: { type: Number, required: true, min: 5, max: 480 },
  monitoringLevel: { type: String, enum: MONITORING_LEVELS, required: true },
  candidateInstructions: { type: String, required: true, trim: true, maxlength: 10_000 },
  remindersEnabled: { type: Boolean, required: true, default: true },
  status: { type: String, enum: INVITATION_STATUSES, required: true, default: "invited" },
  sentAt: { type: Date, required: true, default: Date.now },
  openedAt: { type: Date },
  startedAt: { type: Date },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
  lastReminderSentAt: { type: Date },
  reminderCount: { type: Number, required: true, min: 0, default: 0 },
  otpHash: { type: String, select: false, minlength: 64, maxlength: 64 },
  otpExpiresAt: { type: Date },
  otpAttempts: { type: Number, required: true, min: 0, default: 0 },
  otpRequestCount: { type: Number, required: true, min: 0, default: 0 },
  otpVerifiedAt: { type: Date },
}, baseSchemaOptions);

assessmentInvitationSchema.index({ organizationId: 1, assessmentId: 1, applicationId: 1 }, { unique: true });
assessmentInvitationSchema.index({ organizationId: 1, status: 1, sentAt: -1 });
assessmentInvitationSchema.index({ organizationId: 1, candidateId: 1, sentAt: -1 });

export const AssessmentInvitation = (models.AssessmentInvitation as Model<IAssessmentInvitation> | undefined) ?? model<IAssessmentInvitation>("AssessmentInvitation", assessmentInvitationSchema);
