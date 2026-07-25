import "server-only";

import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/database";
import { AppError } from "@/lib/errors";
import { AIUsage } from "@/models/ai-usage.model";
import { Answer } from "@/models/answer.model";
import { Application } from "@/models/application.model";
import { AssessmentAttempt } from "@/models/assessment-attempt.model";
import { AssessmentInvitation } from "@/models/assessment-invitation.model";
import { AssessmentTemplate } from "@/models/assessment-template.model";
import { AuditLog } from "@/models/audit-log.model";
import { Candidate } from "@/models/candidate.model";
import { Evaluation } from "@/models/evaluation.model";
import { IntegrityEvent } from "@/models/integrity-event.model";
import { Job } from "@/models/job.model";
import { Question } from "@/models/question.model";
import type { ApplicationStage } from "@/modules/applications/constants";
import { canTransitionStage } from "@/modules/applications/stages";
import type { AuthorizationContext } from "@/modules/authorization/service";

export async function getCandidateReport(context: AuthorizationContext, applicationId: string) {
  if (!Types.ObjectId.isValid(applicationId)) throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");
  await connectToDatabase();
  const application = await Application.findOne({ _id: applicationId, organizationId: context.organizationId }).lean();
  if (!application) throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");
  const [candidate, job, cvEvaluation, invitation] = await Promise.all([
    Candidate.findOne({ _id: application.candidateId, organizationId: context.organizationId }).lean(),
    Job.findOne({ _id: application.jobId, organizationId: context.organizationId }).select("title department location").lean(),
    Evaluation.findOne({ organizationId: context.organizationId, applicationId: application._id, kind: "cv_match" }).lean(),
    AssessmentInvitation.findOne({ organizationId: context.organizationId, applicationId: application._id }).sort({ sentAt: -1 }).lean(),
  ]);
  if (!candidate || !job) throw new AppError("Candidate report data is incomplete.", 409, "REPORT_DATA_INCOMPLETE");
  const attempt = invitation ? await AssessmentAttempt.findOne({ organizationId: context.organizationId, invitationId: invitation._id }).sort({ attemptNumber: -1 }).lean() : null;
  const [template, answers, overallEvaluation, integrity, usage] = attempt ? await Promise.all([
    AssessmentTemplate.findOne({ _id: attempt.assessmentId, organizationId: context.organizationId }).select("title monitoringLevel totalPoints").lean(),
    Answer.find({ organizationId: context.organizationId, attemptId: attempt._id }).sort({ createdAt: 1 }).lean(),
    Evaluation.findOne({ organizationId: context.organizationId, attemptId: attempt._id, kind: "assessment" }).lean(),
    IntegrityEvent.find({ organizationId: context.organizationId, attemptId: attempt._id }).sort({ occurredAt: 1 }).lean(),
    AIUsage.find({ organizationId: context.organizationId, attemptId: attempt._id }).lean(),
  ]) : [null, [], null, [], []];
  const questionIds = answers.map((answer) => answer.questionId);
  const [questions, answerEvaluations] = await Promise.all([
    Question.find({ organizationId: context.organizationId, _id: { $in: questionIds } }).lean(),
    Evaluation.find({ organizationId: context.organizationId, answerId: { $in: answers.map((answer) => answer._id) }, kind: "answer" }).lean(),
  ]);
  const questionById = new Map(questions.map((question) => [String(question._id), question]));
  const evaluationByAnswer = new Map(answerEvaluations.map((evaluation) => [String(evaluation.answerId), evaluation]));
  const responseRows = answers.map((answer) => {
    const question = questionById.get(String(answer.questionId));
    const evaluation = evaluationByAnswer.get(String(answer._id));
    return { id: String(answer._id), question: question ? { id: String(question._id), title: question.title, description: question.description, type: question.type, category: question.category, points: question.points, explanation: question.explanation } : null, response: { selectedOptions: answer.selectedOptions, text: answer.text, media: answer.media, coding: answer.coding, status: answer.status }, scores: { automatic: answer.autoScore, ai: answer.aiScore, override: answer.overrideScore, overrideReason: answer.overrideReason, final: answer.overrideScore ?? answer.aiScore ?? answer.autoScore ?? 0 }, evaluation: evaluation ? { score: evaluation.score, confidence: evaluation.confidence, summary: evaluation.summary, strengths: evaluation.strengths, missingPoints: evaluation.missingPoints, evidence: evaluation.evidence, rubricBreakdown: evaluation.rubricBreakdown, manualReviewRequired: evaluation.manualReviewRequired, humanReviewStatus: evaluation.humanReviewStatus } : null };
  });
  return {
    application: { id: String(application._id), stage: application.stage, appliedAt: application.appliedAt.toISOString(), humanDecision: application.humanDecision, decisionReason: application.decisionReason, decidedAt: application.decidedAt?.toISOString(), recruiterNotes: (application.recruiterNotes ?? []).map((note) => ({ id: String(note._id), text: note.text, authorId: String(note.authorId), createdAt: note.createdAt.toISOString() })) },
    candidate: { id: String(candidate._id), fullName: candidate.fullName, email: candidate.email, phone: candidate.phone, location: candidate.location, linkedinUrl: candidate.linkedinUrl, githubUrl: candidate.githubUrl, portfolioUrl: candidate.portfolioUrl },
    job: { id: String(job._id), title: job.title, department: job.department, location: job.location },
    cv: cvEvaluation ? { score: cvEvaluation.score, confidence: cvEvaluation.confidence, summary: cvEvaluation.summary, strengths: cvEvaluation.strengths, missingPoints: cvEvaluation.missingPoints, evidence: cvEvaluation.evidence, rubricBreakdown: cvEvaluation.rubricBreakdown, humanReviewStatus: cvEvaluation.humanReviewStatus } : null,
    assessment: attempt ? { id: String(attempt._id), title: template?.title ?? "Assessment", monitoringLevel: template?.monitoringLevel ?? invitation?.monitoringLevel, status: attempt.status, attemptNumber: attempt.attemptNumber, startedAt: attempt.startedAt.toISOString(), submittedAt: attempt.submittedAt?.toISOString(), totalScore: attempt.totalScore ?? 0, maximumScore: attempt.maximumScore, evaluationStatus: attempt.evaluationStatus, evaluationError: attempt.evaluationError, evaluation: overallEvaluation ? { score: overallEvaluation.score, confidence: overallEvaluation.confidence, summary: overallEvaluation.summary, strengths: overallEvaluation.strengths, missingPoints: overallEvaluation.missingPoints, evidence: overallEvaluation.evidence, rubricBreakdown: overallEvaluation.rubricBreakdown, manualReviewRequired: overallEvaluation.manualReviewRequired, humanReviewStatus: overallEvaluation.humanReviewStatus } : null, answers: responseRows, integrity: integrity.map((event) => ({ id: String(event._id), type: event.type, occurredAt: event.occurredAt.toISOString(), questionId: event.questionId ? String(event.questionId) : undefined, metadata: event.metadata })), aiUsage: { operations: usage.length, totalTokens: usage.reduce((sum, item) => sum + item.totalTokens, 0), estimatedCostUsd: usage.reduce((sum, item) => sum + item.estimatedCostUsd, 0) } } : null,
  };
}

export async function addRecruiterNote(context: AuthorizationContext, applicationId: string, text: string, ipAddress?: string) {
  if (!Types.ObjectId.isValid(applicationId)) throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");
  const application = await Application.findOneAndUpdate({ _id: applicationId, organizationId: context.organizationId }, { $push: { recruiterNotes: { text: text.trim(), authorId: context.userId, createdAt: new Date() } } }, { new: true, runValidators: true });
  if (!application) throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");
  await AuditLog.create({ organizationId: context.organizationId, actorId: context.userId, action: "application.note_added", resourceType: "application", resourceId: application._id, metadata: {}, ipAddress });
  return { saved: true };
}

export async function recordHumanDecision(context: AuthorizationContext, applicationId: string, decision: "shortlisted" | "interview" | "offer" | "hired" | "rejected", reason: string, ipAddress?: string) {
  if (!Types.ObjectId.isValid(applicationId)) throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");
  const application = await Application.findOne({ _id: applicationId, organizationId: context.organizationId });
  if (!application) throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");
  if (!canTransitionStage(application.stage, decision as ApplicationStage)) throw new AppError(`Move the candidate through the validated pipeline before selecting ${decision}.`, 409, "INVALID_STAGE_TRANSITION");
  application.stage = decision; application.humanDecision = decision; application.decisionReason = reason.trim(); application.decidedBy = new Types.ObjectId(context.userId); application.decidedAt = new Date(); await application.save();
  await AuditLog.create({ organizationId: context.organizationId, actorId: context.userId, action: "application.human_decision", resourceType: "application", resourceId: application._id, metadata: { decision, reason: application.decisionReason }, ipAddress });
  return { decision, stage: application.stage };
}
