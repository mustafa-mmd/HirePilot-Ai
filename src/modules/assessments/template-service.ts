import "server-only";

import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/database";
import { AppError } from "@/lib/errors";
import { AssessmentInvitation } from "@/models/assessment-invitation.model";
import { AssessmentTemplate, type IAssessmentTemplate } from "@/models/assessment-template.model";
import { AuditLog } from "@/models/audit-log.model";
import { Question } from "@/models/question.model";
import { assessmentTemplateIdSchema, assessmentTemplateInputSchema, assessmentTemplateUpdateSchema, type AssessmentTemplateInput } from "@/modules/assessments/schemas";
import type { AuthorizationContext } from "@/modules/authorization/service";
import { calculateAssessmentMetrics } from "@/modules/assessments/metrics";

type TemplateSource = IAssessmentTemplate & { _id: Types.ObjectId };
export type SerializedAssessmentTemplate = Omit<IAssessmentTemplate, "organizationId" | "createdBy" | "questionIds" | "publishedAt" | "createdAt" | "updatedAt"> & {
  id: string;
  organizationId: string;
  createdBy: string;
  questionIds: string[];
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

function serializeTemplate(template: TemplateSource): SerializedAssessmentTemplate {
  return {
    id: String(template._id),
    organizationId: String(template.organizationId),
    createdBy: String(template.createdBy),
    title: template.title,
    description: template.description,
    instructions: template.instructions,
    monitoringLevel: template.monitoringLevel,
    totalDuration: template.totalDuration,
    questionIds: template.questionIds.map(String),
    randomizationSettings: template.randomizationSettings,
    totalPoints: template.totalPoints,
    status: template.status,
    publishedAt: template.publishedAt?.toISOString(),
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

async function validateTemplateQuestions(context: AuthorizationContext, input: AssessmentTemplateInput) {
  const questions = await Question.find({ organizationId: context.organizationId, _id: { $in: input.questionIds } }).select("_id points timeLimit").lean();
  if (questions.length !== input.questionIds.length) throw new AppError("One or more selected questions are unavailable.", 422, "INVALID_TEMPLATE_QUESTIONS");
  if (input.randomizationSettings.questionLimit && input.randomizationSettings.questionLimit > questions.length) throw new AppError("The randomized question limit cannot exceed the selected question count.", 422, "INVALID_QUESTION_LIMIT");
  const metrics = calculateAssessmentMetrics(questions, input.randomizationSettings.questionLimit);
  if (metrics.unequalRandomizedPoints) throw new AppError("Random question pools must use equal point values so every candidate has the same possible score.", 422, "UNEVEN_RANDOMIZED_POINTS");
  if (input.totalDuration < Math.min(metrics.timedMinutes, 480)) throw new AppError(`Total duration must be at least ${metrics.timedMinutes} minutes for the selected question timers.`, 422, "ASSESSMENT_DURATION_TOO_SHORT");
  return metrics.totalPoints;
}

export async function listAssessmentTemplates(context: AuthorizationContext) {
  await connectToDatabase();
  const templates = await AssessmentTemplate.find({ organizationId: context.organizationId }).sort({ createdAt: -1 }).limit(200).lean();
  return templates.map((template) => serializeTemplate(template as unknown as TemplateSource));
}

export async function getAssessmentTemplate(context: AuthorizationContext, templateId: string) {
  assessmentTemplateIdSchema.parse(templateId);
  await connectToDatabase();
  const template = await AssessmentTemplate.findOne({ _id: templateId, organizationId: context.organizationId }).lean();
  if (!template) throw new AppError("Assessment not found.", 404, "ASSESSMENT_NOT_FOUND");
  return serializeTemplate(template as unknown as TemplateSource);
}

export async function createAssessmentTemplate(context: AuthorizationContext, input: AssessmentTemplateInput, ipAddress?: string) {
  const data = assessmentTemplateInputSchema.parse(input);
  await connectToDatabase();
  const totalPoints = await validateTemplateQuestions(context, data);
  const template = await AssessmentTemplate.create({ ...data, totalPoints, organizationId: context.organizationId, createdBy: context.userId, status: "draft" });
  await AuditLog.create({ organizationId: context.organizationId, actorId: context.userId, action: "assessment.created", resourceType: "assessment_template", resourceId: template._id, metadata: { title: template.title, questionCount: template.questionIds.length }, ipAddress });
  return serializeTemplate(template.toObject() as unknown as TemplateSource);
}

export async function updateAssessmentTemplate(context: AuthorizationContext, templateId: string, input: unknown, ipAddress?: string) {
  assessmentTemplateIdSchema.parse(templateId);
  const data = assessmentTemplateUpdateSchema.parse(input);
  await connectToDatabase();
  const template = await AssessmentTemplate.findOne({ _id: templateId, organizationId: context.organizationId });
  if (!template) throw new AppError("Assessment not found.", 404, "ASSESSMENT_NOT_FOUND");

  const detailFields = Object.keys(data).filter((field) => field !== "status");
  if (detailFields.length && template.status !== "draft") throw new AppError("Published or archived assessments are immutable.", 409, "ASSESSMENT_IMMUTABLE");

  if (detailFields.length) {
    const merged = assessmentTemplateInputSchema.parse({
      title: data.title ?? template.title,
      description: data.description ?? template.description,
      instructions: data.instructions ?? template.instructions,
      monitoringLevel: data.monitoringLevel ?? template.monitoringLevel,
      totalDuration: data.totalDuration ?? template.totalDuration,
      questionIds: data.questionIds ?? template.questionIds.map(String),
      randomizationSettings: data.randomizationSettings ?? template.randomizationSettings,
    });
    const totalPoints = await validateTemplateQuestions(context, merged);
    Object.assign(template, merged, { totalPoints });
  }

  if (data.status && data.status !== template.status) {
    if (data.status === "published" && template.status === "draft") {
      const publishInput = assessmentTemplateInputSchema.parse({ title: template.title, description: template.description, instructions: template.instructions, monitoringLevel: template.monitoringLevel, totalDuration: template.totalDuration, questionIds: template.questionIds.map(String), randomizationSettings: template.randomizationSettings });
      template.totalPoints = await validateTemplateQuestions(context, publishInput);
      if (!template.questionIds.length || template.totalPoints <= 0) throw new AppError("Add scored questions before publishing.", 409, "ASSESSMENT_NOT_READY");
      template.status = "published";
      template.publishedAt = new Date();
    } else if (data.status === "archived" && template.status === "published") {
      template.status = "archived";
    } else {
      throw new AppError(`Cannot change assessment status from ${template.status} to ${data.status}.`, 409, "INVALID_ASSESSMENT_STATUS");
    }
  }

  await template.save();
  await AuditLog.create({ organizationId: context.organizationId, actorId: context.userId, action: data.status ? `assessment.${data.status}` : "assessment.updated", resourceType: "assessment_template", resourceId: template._id, metadata: { fields: Object.keys(data) }, ipAddress });
  return serializeTemplate(template.toObject() as unknown as TemplateSource);
}

export async function deleteDraftAssessmentTemplate(context: AuthorizationContext, templateId: string, ipAddress?: string) {
  assessmentTemplateIdSchema.parse(templateId);
  await connectToDatabase();
  const template = await AssessmentTemplate.findOne({ _id: templateId, organizationId: context.organizationId });
  if (!template) throw new AppError("Assessment not found.", 404, "ASSESSMENT_NOT_FOUND");
  if (template.status !== "draft") throw new AppError("Only draft assessments can be deleted.", 409, "ASSESSMENT_NOT_DRAFT");
  if (await AssessmentInvitation.exists({ organizationId: context.organizationId, assessmentId: template._id })) throw new AppError("An assessment with invitations cannot be deleted.", 409, "ASSESSMENT_HAS_INVITATIONS");
  await template.deleteOne();
  await AuditLog.create({ organizationId: context.organizationId, actorId: context.userId, action: "assessment.deleted", resourceType: "assessment_template", resourceId: template._id, metadata: { title: template.title }, ipAddress });
}
