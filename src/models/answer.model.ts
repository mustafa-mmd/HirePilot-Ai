import { model, models, Schema, Types, type Model } from "mongoose";

import { baseSchemaOptions } from "@/models/shared";
import { ANSWER_STATUSES, QUESTION_TYPES, type AnswerStatus, type QuestionType } from "@/modules/assessments/constants";

export interface IAnswer {
  organizationId: Types.ObjectId;
  attemptId: Types.ObjectId;
  questionId: Types.ObjectId;
  candidateId: Types.ObjectId;
  type: QuestionType;
  status: AnswerStatus;
  selectedOptions: string[];
  text: string;
  media?: { url: string; publicId: string; resourceType: "image" | "video" | "raw"; format: string; bytes: number; duration?: number; transcript?: string; transcriptionStatus?: "pending" | "completed" | "failed"; transcriptionError?: string };
  coding?: { language: string; sourceCode: string; stdout?: string; stderr?: string; compileOutput?: string; status?: string; time?: number; memory?: number; passedTests?: number; totalTests?: number; executionId?: string };
  autoScore?: number;
  aiScore?: number;
  overrideScore?: number;
  overrideReason?: string;
  overriddenBy?: Types.ObjectId;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const answerSchema = new Schema<IAnswer>({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  attemptId: { type: Schema.Types.ObjectId, ref: "AssessmentAttempt", required: true },
  questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
  candidateId: { type: Schema.Types.ObjectId, ref: "Candidate", required: true },
  type: { type: String, enum: QUESTION_TYPES, required: true },
  status: { type: String, enum: ANSWER_STATUSES, required: true, default: "draft" },
  selectedOptions: [{ type: String, maxlength: 80 }],
  text: { type: String, maxlength: 100_000, default: "" },
  media: { _id: false, url: { type: String, maxlength: 1_000 }, publicId: { type: String, maxlength: 500 }, resourceType: { type: String, enum: ["image", "video", "raw"] }, format: { type: String, maxlength: 40 }, bytes: { type: Number, min: 1, max: 500 * 1024 * 1024 }, duration: { type: Number, min: 0, max: 14_400 }, transcript: { type: String, maxlength: 100_000 }, transcriptionStatus: { type: String, enum: ["pending", "completed", "failed"] }, transcriptionError: { type: String, maxlength: 1_000 } },
  coding: { _id: false, language: { type: String, maxlength: 80 }, sourceCode: { type: String, maxlength: 100_000 }, stdout: { type: String, maxlength: 100_000 }, stderr: { type: String, maxlength: 100_000 }, compileOutput: { type: String, maxlength: 100_000 }, status: { type: String, maxlength: 120 }, time: { type: Number, min: 0 }, memory: { type: Number, min: 0 }, passedTests: { type: Number, min: 0 }, totalTests: { type: Number, min: 0 }, executionId: { type: String, maxlength: 200 } },
  autoScore: { type: Number, min: 0 },
  aiScore: { type: Number, min: 0 },
  overrideScore: { type: Number, min: 0 },
  overrideReason: { type: String, maxlength: 2_000 },
  overriddenBy: { type: Schema.Types.ObjectId, ref: "User" },
  submittedAt: Date,
}, baseSchemaOptions);

answerSchema.index({ organizationId: 1, attemptId: 1, questionId: 1 }, { unique: true });
answerSchema.index({ organizationId: 1, candidateId: 1, createdAt: -1 });

export const Answer = (models.Answer as Model<IAnswer> | undefined) ?? model<IAnswer>("Answer", answerSchema);
