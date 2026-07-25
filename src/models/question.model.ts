import { model, models, Schema, Types, type Model } from "mongoose";

import { baseSchemaOptions } from "@/models/shared";
import { QUESTION_DIFFICULTIES, QUESTION_TYPES, type QuestionDifficulty, type QuestionType } from "@/modules/assessments/constants";

export interface IQuestion {
  organizationId: Types.ObjectId;
  createdBy: Types.ObjectId;
  type: QuestionType;
  title: string;
  description: string;
  category: string;
  difficulty: QuestionDifficulty;
  options: Array<{ id: string; label: string }>;
  correctAnswers: string[];
  explanation: string;
  points: number;
  timeLimit: number;
  preparationTime: number;
  randomizeAnswers: boolean;
  rubric: { criteria: string[]; guidance: string };
  required: boolean;
  manualReviewRequired: boolean;
  codingConfig: { language: string; allowedLanguages: string[]; starterCode: string; exampleTests: Array<{ input: string; expectedOutput: string }>; hiddenTests: Array<{ input: string; expectedOutput: string }>; runtimeLimitMs: number; memoryLimitKb: number };
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: QUESTION_TYPES, required: true },
  title: { type: String, required: true, trim: true, maxlength: 300 },
  description: { type: String, required: true, trim: true, maxlength: 10_000 },
  category: { type: String, required: true, trim: true, maxlength: 100 },
  difficulty: { type: String, enum: QUESTION_DIFFICULTIES, required: true },
  options: [{ _id: false, id: { type: String, required: true, trim: true, maxlength: 80 }, label: { type: String, required: true, trim: true, maxlength: 500 } }],
  correctAnswers: [{ type: String, trim: true, maxlength: 80 }],
  explanation: { type: String, trim: true, maxlength: 5_000, default: "" },
  points: { type: Number, required: true, min: 1, max: 1_000 },
  timeLimit: { type: Number, required: true, min: 30, max: 7_200 },
  preparationTime: { type: Number, required: true, min: 0, max: 1_800, default: 0 },
  randomizeAnswers: { type: Boolean, required: true, default: false },
  rubric: { _id: false, criteria: [{ type: String, trim: true, maxlength: 500 }], guidance: { type: String, trim: true, maxlength: 5_000, default: "" } },
  required: { type: Boolean, required: true, default: true },
  manualReviewRequired: { type: Boolean, required: true, default: true },
  codingConfig: { _id: false, language: { type: String, trim: true, maxlength: 80, default: "" }, allowedLanguages: [{ type: String, trim: true, maxlength: 80 }], starterCode: { type: String, maxlength: 20_000, default: "" }, exampleTests: [{ _id: false, input: { type: String, maxlength: 10_000 }, expectedOutput: { type: String, maxlength: 10_000 } }], hiddenTests: [{ _id: false, input: { type: String, maxlength: 10_000 }, expectedOutput: { type: String, maxlength: 10_000 } }], runtimeLimitMs: { type: Number, min: 250, max: 15_000, default: 3_000 }, memoryLimitKb: { type: Number, min: 16_000, max: 512_000, default: 128_000 } },
}, baseSchemaOptions);

questionSchema.index({ organizationId: 1, category: 1, difficulty: 1, createdAt: -1 });
questionSchema.index({ organizationId: 1, type: 1, createdAt: -1 });

export const Question = (models.Question as Model<IQuestion> | undefined) ?? model<IQuestion>("Question", questionSchema);
