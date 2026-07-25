import { model, models, Schema, Types, type Model } from "mongoose";

import { baseSchemaOptions } from "@/models/shared";

export const NOTIFICATION_STATUSES = ["pending", "sent", "failed"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export interface INotification {
  organizationId: Types.ObjectId;
  userId?: Types.ObjectId;
  candidateId?: Types.ObjectId;
  applicationId?: Types.ObjectId;
  assessmentInvitationId?: Types.ObjectId;
  teamInvitationId?: Types.ObjectId;
  channel: "email";
  type: "application_confirmation" | "assessment_invitation" | "assessment_reminder" | "assessment_otp" | "team_invitation";
  recipient: string;
  providerMessageId?: string;
  status: NotificationStatus;
  failureReason?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    candidateId: { type: Schema.Types.ObjectId, ref: "Candidate" },
    applicationId: { type: Schema.Types.ObjectId, ref: "Application" },
    assessmentInvitationId: { type: Schema.Types.ObjectId, ref: "AssessmentInvitation" },
    teamInvitationId: { type: Schema.Types.ObjectId, ref: "Invitation" },
    channel: { type: String, enum: ["email"], required: true },
    type: { type: String, enum: ["application_confirmation", "assessment_invitation", "assessment_reminder", "assessment_otp", "team_invitation"], required: true },
    recipient: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    providerMessageId: { type: String, trim: true, maxlength: 200 },
    status: { type: String, enum: NOTIFICATION_STATUSES, default: "pending", required: true },
    failureReason: { type: String, trim: true, maxlength: 1_000 },
    sentAt: { type: Date },
  },
  baseSchemaOptions,
);

notificationSchema.index({ organizationId: 1, status: 1, createdAt: 1 });
notificationSchema.index({ organizationId: 1, applicationId: 1, type: 1 });
notificationSchema.index({ organizationId: 1, assessmentInvitationId: 1, type: 1 }, { unique: true, partialFilterExpression: { assessmentInvitationId: { $type: "objectId" } } });
notificationSchema.index({ organizationId: 1, teamInvitationId: 1, type: 1 }, { unique: true, partialFilterExpression: { teamInvitationId: { $type: "objectId" } } });

export const Notification =
  (models.Notification as Model<INotification> | undefined) ??
  model<INotification>("Notification", notificationSchema);
