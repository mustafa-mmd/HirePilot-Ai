import { model, models, Schema, Types, type Model } from "mongoose";

import { baseSchemaOptions } from "@/models/shared";
import { ATTEMPT_STATUSES, type AttemptStatus } from "@/modules/assessments/constants";

export interface IAttemptQuestion {
  questionId: Types.ObjectId;
  optionOrder: string[];
  startedAt?: Date;
  submittedAt?: Date;
}

export interface IAssessmentAttempt {
  organizationId: Types.ObjectId;
  invitationId: Types.ObjectId;
  assessmentId: Types.ObjectId;
  applicationId: Types.ObjectId;
  candidateId: Types.ObjectId;
  attemptNumber: number;
  status: AttemptStatus;
  questions: IAttemptQuestion[];
  currentQuestionIndex: number;
  startedAt: Date;
  expiresAt: Date;
  submittedAt?: Date;
  lastHeartbeatAt: Date;
  activeSessionHash: string;
  systemCheck: { camera: boolean; microphone: boolean; network: boolean; completedAt: Date };
  consent: { privacy: boolean; monitoring: boolean; mediaRecording: boolean; acceptedAt: Date; ipAddress?: string };
  totalScore?: number;
  maximumScore: number;
  evaluationStatus: "pending" | "processing" | "completed" | "failed";
  evaluationError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const assessmentAttemptSchema = new Schema<IAssessmentAttempt>({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  invitationId: { type: Schema.Types.ObjectId, ref: "AssessmentInvitation", required: true },
  assessmentId: { type: Schema.Types.ObjectId, ref: "AssessmentTemplate", required: true },
  applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true },
  candidateId: { type: Schema.Types.ObjectId, ref: "Candidate", required: true },
  attemptNumber: { type: Number, required: true, min: 1, max: 5 },
  status: { type: String, enum: ATTEMPT_STATUSES, required: true, default: "in_progress" },
  questions: [{ _id: false, questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true }, optionOrder: [{ type: String, maxlength: 80 }], startedAt: Date, submittedAt: Date }],
  currentQuestionIndex: { type: Number, required: true, min: 0, default: 0 },
  startedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  submittedAt: Date,
  lastHeartbeatAt: { type: Date, required: true },
  activeSessionHash: { type: String, required: true, select: false, minlength: 64, maxlength: 64 },
  systemCheck: { _id: false, camera: { type: Boolean, required: true }, microphone: { type: Boolean, required: true }, network: { type: Boolean, required: true }, completedAt: { type: Date, required: true } },
  consent: { _id: false, privacy: { type: Boolean, required: true }, monitoring: { type: Boolean, required: true }, mediaRecording: { type: Boolean, required: true }, acceptedAt: { type: Date, required: true }, ipAddress: { type: String, maxlength: 64 } },
  totalScore: { type: Number, min: 0 },
  maximumScore: { type: Number, required: true, min: 0 },
  evaluationStatus: { type: String, enum: ["pending", "processing", "completed", "failed"], required: true, default: "pending" },
  evaluationError: { type: String, maxlength: 1_000 },
}, baseSchemaOptions);

assessmentAttemptSchema.index({ organizationId: 1, invitationId: 1, attemptNumber: 1 }, { unique: true });
assessmentAttemptSchema.index({ organizationId: 1, applicationId: 1, status: 1, createdAt: -1 });
assessmentAttemptSchema.index({ invitationId: 1, status: 1 });

export const AssessmentAttempt = (models.AssessmentAttempt as Model<IAssessmentAttempt> | undefined) ?? model<IAssessmentAttempt>("AssessmentAttempt", assessmentAttemptSchema);
