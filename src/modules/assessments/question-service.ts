import "server-only";

import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/database";
import { AppError } from "@/lib/errors";
import { AssessmentTemplate } from "@/models/assessment-template.model";
import { AuditLog } from "@/models/audit-log.model";
import { Question, type IQuestion } from "@/models/question.model";
import { QUESTION_TYPE_LABELS } from "@/modules/assessments/constants";
import { questionIdSchema, questionInputSchema, type QuestionInput } from "@/modules/assessments/schemas";
import type { AuthorizationContext } from "@/modules/authorization/service";

type QuestionSource = IQuestion & { _id: Types.ObjectId };

export type SerializedQuestion = Omit<IQuestion, "organizationId" | "createdBy" | "createdAt" | "updatedAt"> & {
  id: string;
  organizationId: string;
  createdBy: string;
  typeLabel: string;
  createdAt: string;
  updatedAt: string;
};

function serializeQuestion(question: QuestionSource): SerializedQuestion {
  return {
    id: String(question._id),
    organizationId: String(question.organizationId),
    createdBy: String(question.createdBy),
    type: question.type,
    typeLabel: QUESTION_TYPE_LABELS[question.type],
    title: question.title,
    description: question.description,
    category: question.category,
    difficulty: question.difficulty,
    options: question.options,
    correctAnswers: question.correctAnswers,
    explanation: question.explanation,
    points: question.points,
    timeLimit: question.timeLimit,
    preparationTime: question.preparationTime,
    randomizeAnswers: question.randomizeAnswers,
    rubric: question.rubric,
    required: question.required,
    manualReviewRequired: question.manualReviewRequired,
    codingConfig: question.codingConfig,
    createdAt: question.createdAt.toISOString(),
    updatedAt: question.updatedAt.toISOString(),
  };
}

function regexEscape(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listQuestions(context: AuthorizationContext, search = "") {
  await connectToDatabase();
  const filter: Record<string, unknown> = { organizationId: context.organizationId };
  if (search.trim()) {
    const pattern = { $regex: regexEscape(search.trim()), $options: "i" };
    filter.$or = [{ title: pattern }, { category: pattern }];
  }
  const questions = await Question.find(filter).sort({ createdAt: -1 }).limit(300).lean();
  return questions.map((question) => serializeQuestion(question as unknown as QuestionSource));
}

export async function getQuestion(context: AuthorizationContext, questionId: string) {
  questionIdSchema.parse(questionId);
  await connectToDatabase();
  const question = await Question.findOne({ _id: questionId, organizationId: context.organizationId }).lean();
  if (!question) throw new AppError("Question not found.", 404, "QUESTION_NOT_FOUND");
  return serializeQuestion(question as unknown as QuestionSource);
}

export async function createQuestion(context: AuthorizationContext, input: QuestionInput, ipAddress?: string) {
  const data = questionInputSchema.parse(input);
  await connectToDatabase();
  const question = await Question.create({ ...data, organizationId: context.organizationId, createdBy: context.userId });
  await AuditLog.create({ organizationId: context.organizationId, actorId: context.userId, action: "question.created", resourceType: "question", resourceId: question._id, metadata: { type: question.type, title: question.title }, ipAddress });
  return serializeQuestion(question.toObject() as unknown as QuestionSource);
}

export async function updateQuestion(context: AuthorizationContext, questionId: string, input: unknown, ipAddress?: string) {
  questionIdSchema.parse(questionId);
  const data = questionInputSchema.parse(input);
  await connectToDatabase();
  const question = await Question.findOne({ _id: questionId, organizationId: context.organizationId });
  if (!question) throw new AppError("Question not found.", 404, "QUESTION_NOT_FOUND");
  const usedByPublishedTemplate = await AssessmentTemplate.exists({ organizationId: context.organizationId, questionIds: question._id, status: "published" });
  if (usedByPublishedTemplate) throw new AppError("Questions in published assessments cannot be edited. Create a new question instead.", 409, "QUESTION_IN_PUBLISHED_TEMPLATE");
  Object.assign(question, data);
  await question.save();
  await AuditLog.create({ organizationId: context.organizationId, actorId: context.userId, action: "question.updated", resourceType: "question", resourceId: question._id, metadata: { fields: Object.keys(data) }, ipAddress });
  return serializeQuestion(question.toObject() as unknown as QuestionSource);
}

export async function deleteQuestion(context: AuthorizationContext, questionId: string, ipAddress?: string) {
  questionIdSchema.parse(questionId);
  await connectToDatabase();
  const question = await Question.findOne({ _id: questionId, organizationId: context.organizationId });
  if (!question) throw new AppError("Question not found.", 404, "QUESTION_NOT_FOUND");
  const usedByTemplate = await AssessmentTemplate.exists({ organizationId: context.organizationId, questionIds: question._id });
  if (usedByTemplate) throw new AppError("Remove this question from every assessment before deleting it.", 409, "QUESTION_IN_USE");
  await question.deleteOne();
  await AuditLog.create({ organizationId: context.organizationId, actorId: context.userId, action: "question.deleted", resourceType: "question", resourceId: question._id, metadata: { title: question.title }, ipAddress });
}
