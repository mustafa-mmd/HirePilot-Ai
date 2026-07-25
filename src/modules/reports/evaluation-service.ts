import "server-only";

import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/database";
import { AppError } from "@/lib/errors";
import { AIUsage } from "@/models/ai-usage.model";
import { Answer } from "@/models/answer.model";
import { Application } from "@/models/application.model";
import { AssessmentAttempt } from "@/models/assessment-attempt.model";
import { AssessmentTemplate } from "@/models/assessment-template.model";
import { AuditLog } from "@/models/audit-log.model";
import { Candidate } from "@/models/candidate.model";
import { Evaluation } from "@/models/evaluation.model";
import { Job } from "@/models/job.model";
import { Question } from "@/models/question.model";
import { AI_MODEL, AI_PROVIDER, ASSESSMENT_PROMPT_VERSION } from "@/modules/ai/constants";
import { createAnswerEvaluation, createAssessmentSummary, type UsageRecord } from "@/modules/ai/service";
import type { AssessmentEvaluationResult } from "@/modules/ai/schemas";
import type { AuthorizationContext } from "@/modules/authorization/service";
import { enforcePlanLimit } from "@/modules/subscriptions/service";

function answerSource(answer: { text: string; media?: { transcript?: string }; coding?: { sourceCode?: string; status?: string; passedTests?: number; totalTests?: number } }) {
  if (answer.text.trim()) return answer.text.trim();
  if (answer.media?.transcript?.trim()) return answer.media.transcript.trim();
  if (answer.coding?.sourceCode) return `${answer.coding.sourceCode}\nExecution: ${answer.coding.status ?? "unknown"}; tests ${answer.coding.passedTests ?? 0}/${answer.coding.totalTests ?? 0}`;
  return "";
}

function unavailableEvaluation(category: string): AssessmentEvaluationResult {
  return { score: 0, confidence: 0, summary: "No machine-readable response evidence was available. A human reviewer must inspect the original response.", strengths: [], missingPoints: ["Machine-readable response evidence"], evidence: [], suggestedFollowUpQuestions: [], manualReviewRequired: true, rubricBreakdown: [{ category, weight: 100, score: 0, maxScore: 100, evidence: [] }] };
}

async function recordUsage(context: AuthorizationContext, applicationId: Types.ObjectId, attemptId: Types.ObjectId, answerId: Types.ObjectId | undefined, evaluationId: Types.ObjectId, usage: UsageRecord) {
  await AIUsage.create({ organizationId: context.organizationId, userId: context.userId, applicationId, attemptId, answerId, evaluationId, ...usage });
}

export async function evaluateAssessmentAttempt(context: AuthorizationContext, attemptId: string, ipAddress?: string) {
  await enforcePlanLimit(context.organizationId, "monthlyAiTokens");
  if (!Types.ObjectId.isValid(attemptId)) throw new AppError("Assessment attempt not found.", 404, "ATTEMPT_NOT_FOUND");
  await connectToDatabase();
  const existing = await AssessmentAttempt.findOne({ _id: attemptId, organizationId: context.organizationId }).select("status evaluationStatus");
  if (!existing) throw new AppError("Assessment attempt not found.", 404, "ATTEMPT_NOT_FOUND");
  if (existing.status !== "completed") throw new AppError("Only completed assessments can be evaluated.", 409, "ATTEMPT_NOT_COMPLETED");
  const attempt = await AssessmentAttempt.findOneAndUpdate({ _id: attemptId, organizationId: context.organizationId, evaluationStatus: { $ne: "processing" } }, { $set: { evaluationStatus: "processing" }, $unset: { evaluationError: 1 } }, { new: true });
  if (!attempt) throw new AppError("This assessment evaluation is already running.", 409, "EVALUATION_IN_PROGRESS");

  try {
    const [application, candidate, template, answers] = await Promise.all([
      Application.findOne({ _id: attempt.applicationId, organizationId: context.organizationId }),
      Candidate.findOne({ _id: attempt.candidateId, organizationId: context.organizationId }),
      AssessmentTemplate.findOne({ _id: attempt.assessmentId, organizationId: context.organizationId }),
      Answer.find({ organizationId: context.organizationId, attemptId: attempt._id }),
    ]);
    if (!application || !candidate || !template) throw new AppError("Assessment data is incomplete.", 409, "ASSESSMENT_DATA_INCOMPLETE");
    const job = await Job.findOne({ _id: application.jobId, organizationId: context.organizationId });
    if (!job) throw new AppError("Job not found.", 404, "JOB_NOT_FOUND");
    const questions = await Question.find({ organizationId: context.organizationId, _id: { $in: answers.map((answer) => answer.questionId) } });
    const questionById = new Map(questions.map((question) => [question.id, question]));
    const sourceSections: string[] = [];

    for (const answer of answers) {
      const question = questionById.get(String(answer.questionId));
      if (!question || ["single_choice", "multiple_choice", "true_false"].includes(question.type)) continue;
      const source = answerSource(answer);
      if (source) sourceSections.push(`${question.title}\n${source}`);
      let data: AssessmentEvaluationResult;
      let usage: UsageRecord | undefined;
      if (!source || question.type === "file_upload") data = unavailableEvaluation(question.category);
      else {
        const result = await createAnswerEvaluation({ question: `${question.title}\n${question.description}`, source, criteria: question.rubric.criteria.length ? question.rubric.criteria : [question.category], guidance: question.rubric.guidance, maximumPoints: question.points });
        data = result.data; usage = result.usage;
      }
      const rawScore = Math.round((data.score / 100) * question.points * 100) / 100;
      const evaluation = await Evaluation.findOneAndUpdate(
        { organizationId: context.organizationId, answerId: answer._id, kind: "answer" },
        { $set: { organizationId: context.organizationId, kind: "answer", provider: AI_PROVIDER, applicationId: application._id, candidateId: candidate._id, jobId: job._id, attemptId: attempt._id, answerId: answer._id, questionId: question._id, ...data, rawScore, maximumScore: question.points, model: AI_MODEL, promptVersion: ASSESSMENT_PROMPT_VERSION, evaluatedAt: new Date(), humanReviewStatus: "pending" }, $unset: { overrideScore: 1, overrideReason: 1, overriddenBy: 1, overriddenAt: 1, reviewedBy: 1, reviewedAt: 1 } },
        { upsert: true, new: true, runValidators: true },
      );
      await Answer.updateOne({ _id: answer._id, organizationId: context.organizationId }, { $set: { aiScore: rawScore } });
      if (usage) await recordUsage(context, application._id, attempt._id, answer._id, evaluation._id, usage);
    }

    const refreshed = await Answer.find({ organizationId: context.organizationId, attemptId: attempt._id }).lean();
    const totalPoints = refreshed.reduce((sum, answer) => sum + (answer.overrideScore ?? answer.aiScore ?? answer.autoScore ?? 0), 0);
    const computedScore = attempt.maximumScore > 0 ? Math.round((totalPoints / attempt.maximumScore) * 10_000) / 100 : 0;
    const sectionMap = new Map<string, { score: number; maximumScore: number }>();
    for (const answer of refreshed) {
      const question = questionById.get(String(answer.questionId)); if (!question) continue;
      const section = sectionMap.get(question.category) ?? { score: 0, maximumScore: 0 };
      section.score += answer.overrideScore ?? answer.aiScore ?? answer.autoScore ?? 0; section.maximumScore += question.points; sectionMap.set(question.category, section);
    }
    const sections = [...sectionMap].map(([category, value]) => ({ category, ...value }));
    const combinedSource = sourceSections.join("\n\n---\n\n");
    const summaryResult = combinedSource ? await createAssessmentSummary({ assessmentTitle: template.title, computedScore, source: combinedSource, sections }) : { data: unavailableEvaluation("overall"), usage: undefined };
    const summaryData = { ...summaryResult.data, score: computedScore, rubricBreakdown: sections.map((section) => ({ category: section.category, weight: attempt.maximumScore ? (section.maximumScore / attempt.maximumScore) * 100 : 0, score: section.maximumScore ? (section.score / section.maximumScore) * 100 : 0, maxScore: 100, evidence: summaryResult.data.rubricBreakdown.find((item) => item.category === section.category)?.evidence ?? [] })) };
    const overall = await Evaluation.findOneAndUpdate(
      { organizationId: context.organizationId, attemptId: attempt._id, kind: "assessment" },
      { $set: { organizationId: context.organizationId, kind: "assessment", provider: AI_PROVIDER, applicationId: application._id, candidateId: candidate._id, jobId: job._id, attemptId: attempt._id, ...summaryData, rawScore: totalPoints, maximumScore: attempt.maximumScore, model: AI_MODEL, promptVersion: ASSESSMENT_PROMPT_VERSION, evaluatedAt: new Date(), humanReviewStatus: "pending" }, $unset: { reviewedBy: 1, reviewedAt: 1 } },
      { upsert: true, new: true, runValidators: true },
    );
    if (summaryResult.usage) await recordUsage(context, application._id, attempt._id, undefined, overall._id, summaryResult.usage);
    attempt.totalScore = totalPoints; attempt.evaluationStatus = "completed"; await attempt.save();
    await AuditLog.create({ organizationId: context.organizationId, actorId: context.userId, action: "assessment.ai_evaluated", resourceType: "assessment_attempt", resourceId: attempt._id, metadata: { evaluationId: overall.id, score: computedScore, model: AI_MODEL }, ipAddress });
    return { id: overall.id, score: computedScore, totalPoints, maximumScore: attempt.maximumScore };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1_000) : "Assessment evaluation failed.";
    await AssessmentAttempt.updateOne({ _id: attempt._id, organizationId: context.organizationId }, { $set: { evaluationStatus: "failed", evaluationError: message } });
    if (error instanceof AppError) throw error;
    throw new AppError("Assessment evaluation failed. Retry or review responses manually.", 502, "ASSESSMENT_EVALUATION_FAILED");
  }
}

export async function overrideAnswerScore(context: AuthorizationContext, answerId: string, score: number, reason: string, ipAddress?: string) {
  if (!Types.ObjectId.isValid(answerId)) throw new AppError("Answer not found.", 404, "ANSWER_NOT_FOUND");
  await connectToDatabase();
  const answer = await Answer.findOne({ _id: answerId, organizationId: context.organizationId });
  if (!answer) throw new AppError("Answer not found.", 404, "ANSWER_NOT_FOUND");
  const [attempt, question] = await Promise.all([
    AssessmentAttempt.findOne({ _id: answer.attemptId, organizationId: context.organizationId }),
    Question.findOne({ _id: answer.questionId, organizationId: context.organizationId }),
  ]);
  if (!attempt || !question) throw new AppError("Answer data is incomplete.", 409, "ANSWER_DATA_INCOMPLETE");
  if (score < 0 || score > question.points) throw new AppError(`Override score must be between 0 and ${question.points}.`, 422, "INVALID_OVERRIDE_SCORE");
  const explanation = reason.trim();
  if (explanation.length < 10) throw new AppError("Provide an explanation of at least 10 characters.", 422, "OVERRIDE_REASON_REQUIRED");
  answer.overrideScore = score; answer.overrideReason = explanation; answer.overriddenBy = new Types.ObjectId(context.userId); await answer.save();
  await Evaluation.updateOne({ organizationId: context.organizationId, answerId: answer._id, kind: "answer" }, { $set: { humanReviewStatus: "overridden", overrideScore: question.points ? (score / question.points) * 100 : 0, overrideReason: explanation, overriddenBy: context.userId, overriddenAt: new Date(), reviewedBy: context.userId, reviewedAt: new Date() } });
  const answers = await Answer.find({ organizationId: context.organizationId, attemptId: attempt._id }).lean();
  const total = answers.reduce((sum, item) => sum + (item.overrideScore ?? item.aiScore ?? item.autoScore ?? 0), 0);
  const percentage = attempt.maximumScore ? Math.round((total / attempt.maximumScore) * 10_000) / 100 : 0;
  attempt.totalScore = total; await attempt.save();
  await Evaluation.updateOne({ organizationId: context.organizationId, attemptId: attempt._id, kind: "assessment" }, { $set: { score: percentage, rawScore: total, humanReviewStatus: "overridden" } });
  await AuditLog.create({ organizationId: context.organizationId, actorId: context.userId, action: "answer.score_overridden", resourceType: "answer", resourceId: answer._id, metadata: { previousScore: answer.aiScore ?? answer.autoScore ?? 0, overrideScore: score, reason: explanation }, ipAddress });
  return { score, totalScore: total, percentage };
}
