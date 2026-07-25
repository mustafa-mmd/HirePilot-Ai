import { model, models, Schema, Types, type Model } from "mongoose";

import { baseSchemaOptions } from "@/models/shared";
import { INTEGRITY_EVENT_TYPES, type IntegrityEventType } from "@/modules/assessments/constants";

export interface IIntegrityEvent {
  organizationId: Types.ObjectId;
  attemptId: Types.ObjectId;
  invitationId: Types.ObjectId;
  candidateId: Types.ObjectId;
  questionId?: Types.ObjectId;
  type: IntegrityEventType;
  occurredAt: Date;
  clientOccurredAt?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const integrityEventSchema = new Schema<IIntegrityEvent>({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  attemptId: { type: Schema.Types.ObjectId, ref: "AssessmentAttempt", required: true },
  invitationId: { type: Schema.Types.ObjectId, ref: "AssessmentInvitation", required: true },
  candidateId: { type: Schema.Types.ObjectId, ref: "Candidate", required: true },
  questionId: { type: Schema.Types.ObjectId, ref: "Question" },
  type: { type: String, enum: INTEGRITY_EVENT_TYPES, required: true },
  occurredAt: { type: Date, required: true, default: Date.now },
  clientOccurredAt: Date,
  metadata: { type: Schema.Types.Mixed, default: {} },
}, baseSchemaOptions);

integrityEventSchema.index({ organizationId: 1, attemptId: 1, occurredAt: 1 });
integrityEventSchema.index({ organizationId: 1, type: 1, occurredAt: -1 });

export const IntegrityEvent = (models.IntegrityEvent as Model<IIntegrityEvent> | undefined) ?? model<IIntegrityEvent>("IntegrityEvent", integrityEventSchema);
