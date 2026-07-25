import "server-only";

import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/database";
import { AppError } from "@/lib/errors";
import { AIUsage } from "@/models/ai-usage.model";
import { Application } from "@/models/application.model";
import { AuditLog } from "@/models/audit-log.model";
import { Candidate } from "@/models/candidate.model";
import { Evaluation } from "@/models/evaluation.model";
import { Job } from "@/models/job.model";
import {
  AI_MODEL,
  AI_PROMPT_VERSION,
  AI_PROVIDER,
} from "@/modules/ai/constants";
import { extractCvText } from "@/modules/ai/cv-extraction";
import {
  createCandidateMatch,
  createCandidateProfile,
  createJobRequirements,
  type UsageRecord,
} from "@/modules/ai/service";
import {
  jobRequirementsSchema,
  scoringWeightsSchema,
  type JobRequirements,
} from "@/modules/ai/schemas";
import type { AuthorizationContext } from "@/modules/authorization/service";
import { enforcePlanLimit } from "@/modules/subscriptions/service";

const ANALYSIS_LOCK_TIMEOUT_MS = 15 * 60 * 1_000;

function publicFailureMessage(error: unknown) {
  return error instanceof AppError
    ? error.message
    : "AI analysis failed. Retry the analysis or review the CV manually.";
}

export async function analyzeApplication(
  context: AuthorizationContext,
  applicationId: string,
  ipAddress?: string,
) {
  await enforcePlanLimit(context.organizationId, "monthlyAiTokens");
  if (!Types.ObjectId.isValid(applicationId)) {
    throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");
  }

  await connectToDatabase();
  const existing = await Application.findOne({
    _id: applicationId,
    organizationId: context.organizationId,
  }).select("_id cvProcessingStatus");
  if (!existing) throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");

  const application = await Application.findOneAndUpdate(
    {
      _id: applicationId,
      organizationId: context.organizationId,
      $or: [
        { cvProcessingStatus: { $ne: "processing" } },
        { cvProcessingStartedAt: { $lt: new Date(Date.now() - ANALYSIS_LOCK_TIMEOUT_MS) } },
      ],
    },
    {
      $set: { cvProcessingStatus: "processing", cvProcessingStartedAt: new Date() },
      $unset: { cvProcessingError: 1 },
    },
    { new: true },
  );
  if (!application) {
    throw new AppError("This CV analysis is already running.", 409, "ANALYSIS_IN_PROGRESS");
  }

  try {
    const [candidate, job] = await Promise.all([
      Candidate.findOne({ _id: application.candidateId, organizationId: context.organizationId }),
      Job.findOne({ _id: application.jobId, organizationId: context.organizationId }),
    ]);
    if (!candidate || !job) {
      throw new AppError("Application data is incomplete.", 409, "APPLICATION_DATA_INCOMPLETE");
    }

    const cvText = await extractCvText(application.cvUrl, application.cvFormat);
    const profileResult = await createCandidateProfile(cvText);
    const usageRecords: UsageRecord[] = [profileResult.usage];

    let requirements: JobRequirements;
    const cachedRequirements = jobRequirementsSchema.safeParse(job.structuredRequirements);
    if (job.requirementsPromptVersion === AI_PROMPT_VERSION && cachedRequirements.success) {
      requirements = cachedRequirements.data;
    } else {
      const requirementResult = await createJobRequirements({
        title: job.title,
        description: job.description,
        requiredSkills: job.requiredSkills,
        preferredSkills: job.preferredSkills,
        educationRequirements: job.educationRequirements,
        experienceLevel: job.experienceLevel,
      });
      requirements = requirementResult.data;
      usageRecords.push(requirementResult.usage);
    }

    const weights = scoringWeightsSchema.parse(job.scoringWeights);
    const matchResult = await createCandidateMatch({
      cvText,
      profile: profileResult.data,
      requirements,
      weights,
    });
    usageRecords.push(matchResult.usage);

    const mongoose = await connectToDatabase();
    const session = await mongoose.startSession();
    let evaluationId = "";
    try {
      await session.withTransaction(async () => {
        const evaluation = await Evaluation.findOneAndUpdate(
          { organizationId: context.organizationId, applicationId: application._id },
          {
            $set: {
              organizationId: context.organizationId,
              kind: "cv_match",
              provider: AI_PROVIDER,
              applicationId: application._id,
              candidateId: candidate._id,
              jobId: job._id,
              ...matchResult.data,
              model: AI_MODEL,
              promptVersion: AI_PROMPT_VERSION,
              evaluatedAt: new Date(),
              humanReviewStatus: "pending",
            },
            $unset: { reviewedBy: 1, reviewedAt: 1 },
          },
          { upsert: true, new: true, runValidators: true, session },
        );
        evaluationId = evaluation.id;

        await AIUsage.insertMany(
          usageRecords.map((usage) => ({
            organizationId: context.organizationId,
            userId: context.userId,
            applicationId: application._id,
            evaluationId: evaluation._id,
            ...usage,
          })),
          { session },
        );

        await Application.updateOne(
          { _id: application._id, organizationId: context.organizationId },
          {
            $set: {
              cvText,
              parsedProfile: profileResult.data,
              cvEvaluationId: evaluation._id,
              cvProcessingStatus: "completed",
            },
            $unset: { cvProcessingError: 1 },
          },
          { session },
        );

        if (!cachedRequirements.success || job.requirementsPromptVersion !== AI_PROMPT_VERSION) {
          await Job.updateOne(
            { _id: job._id, organizationId: context.organizationId },
            { $set: { structuredRequirements: requirements, requirementsExtractedAt: new Date(), requirementsPromptVersion: AI_PROMPT_VERSION } },
            { session },
          );
        }

        await AuditLog.create([{
          organizationId: context.organizationId,
          actorId: context.userId,
          action: "application.ai_analyzed",
          resourceType: "application",
          resourceId: application._id,
          metadata: { evaluationId: evaluation.id, score: matchResult.data.score, model: AI_MODEL },
          ipAddress,
        }], { session });
      });
    } finally {
      await session.endSession();
    }

    return { id: evaluationId, score: matchResult.data.score };
  } catch (error) {
    const message = publicFailureMessage(error);
    await Application.updateOne(
      { _id: application._id, organizationId: context.organizationId },
      { $set: { cvProcessingStatus: "failed", cvProcessingError: message } },
    );
    if (error instanceof AppError) throw error;
    console.error("Application AI analysis failed", error);
    throw new AppError(message, 502, "AI_ANALYSIS_FAILED");
  }
}

export async function markApplicationEvaluationReviewed(
  context: AuthorizationContext,
  applicationId: string,
  ipAddress?: string,
) {
  if (!Types.ObjectId.isValid(applicationId)) {
    throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");
  }
  await connectToDatabase();
  const application = await Application.findOne({ _id: applicationId, organizationId: context.organizationId }).select("_id");
  if (!application) throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");

  const evaluation = await Evaluation.findOneAndUpdate(
    { applicationId: application._id, organizationId: context.organizationId },
    { $set: { humanReviewStatus: "reviewed", reviewedBy: context.userId, reviewedAt: new Date() } },
    { new: true },
  );
  if (!evaluation) throw new AppError("Analyze the CV before marking it reviewed.", 409, "EVALUATION_NOT_FOUND");
  await AuditLog.create({ organizationId: context.organizationId, actorId: context.userId, action: "application.ai_reviewed", resourceType: "application", resourceId: application._id, metadata: { evaluationId: evaluation.id }, ipAddress });
  return { id: evaluation.id, humanReviewStatus: evaluation.humanReviewStatus };
}
