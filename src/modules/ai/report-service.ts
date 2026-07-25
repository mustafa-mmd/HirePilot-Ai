import "server-only";

import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/database";
import { AppError } from "@/lib/errors";
import { AIUsage } from "@/models/ai-usage.model";
import { Application } from "@/models/application.model";
import { Candidate } from "@/models/candidate.model";
import { Evaluation } from "@/models/evaluation.model";
import { Job } from "@/models/job.model";
import { candidateProfileSchema } from "@/modules/ai/schemas";
import type { AuthorizationContext } from "@/modules/authorization/service";

export async function getApplicationReport(context: AuthorizationContext, applicationId: string) {
  if (!Types.ObjectId.isValid(applicationId)) {
    throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");
  }
  await connectToDatabase();
  const application = await Application.findOne({ _id: applicationId, organizationId: context.organizationId }).lean();
  if (!application) throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");

  const [candidate, job, evaluation] = await Promise.all([
    Candidate.findOne({ _id: application.candidateId, organizationId: context.organizationId }).lean(),
    Job.findOne({ _id: application.jobId, organizationId: context.organizationId }).lean(),
    Evaluation.findOne({ applicationId: application._id, organizationId: context.organizationId }).lean(),
  ]);
  if (!candidate || !job) throw new AppError("Application data is incomplete.", 409, "APPLICATION_DATA_INCOMPLETE");

  const usage = evaluation
    ? await AIUsage.find({ organizationId: context.organizationId, evaluationId: evaluation._id }).sort({ createdAt: -1 }).lean()
    : [];
  const parsedProfile = candidateProfileSchema.safeParse(application.parsedProfile);

  return {
    application: {
      id: String(application._id),
      stage: application.stage,
      appliedAt: application.appliedAt.toISOString(),
      cvUrl: application.cvUrl,
      cvOriginalFilename: application.cvOriginalFilename,
      processingStatus: application.cvProcessingStatus ?? "pending",
      processingIsActive: application.cvProcessingStatus === "processing" && Boolean(application.cvProcessingStartedAt && application.cvProcessingStartedAt.getTime() > Date.now() - 15 * 60 * 1_000),
      processingError: application.cvProcessingError,
    },
    candidate: {
      id: String(candidate._id),
      fullName: candidate.fullName,
      email: candidate.email,
      phone: candidate.phone,
      location: candidate.location,
      linkedinUrl: candidate.linkedinUrl,
      githubUrl: candidate.githubUrl,
      portfolioUrl: candidate.portfolioUrl,
    },
    job: {
      id: String(job._id),
      title: job.title,
      scoringWeights: job.scoringWeights,
    },
    profile: parsedProfile.success ? parsedProfile.data : null,
    evaluation: evaluation ? {
      id: String(evaluation._id),
      score: evaluation.score,
      confidence: evaluation.confidence,
      summary: evaluation.summary,
      strengths: evaluation.strengths,
      missingPoints: evaluation.missingPoints,
      evidence: evaluation.evidence,
      suggestedFollowUpQuestions: evaluation.suggestedFollowUpQuestions,
      manualReviewRequired: evaluation.manualReviewRequired,
      rubricBreakdown: evaluation.rubricBreakdown,
      model: evaluation.model,
      promptVersion: evaluation.promptVersion,
      evaluatedAt: evaluation.evaluatedAt.toISOString(),
      humanReviewStatus: evaluation.humanReviewStatus,
    } : null,
    usage: {
      inputTokens: usage.reduce((sum, item) => sum + item.inputTokens, 0),
      outputTokens: usage.reduce((sum, item) => sum + item.outputTokens, 0),
      totalTokens: usage.reduce((sum, item) => sum + item.totalTokens, 0),
      estimatedCostUsd: usage.reduce((sum, item) => sum + item.estimatedCostUsd, 0),
      operations: usage.map((item) => item.operation),
    },
  };
}
