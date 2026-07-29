import "server-only";

import { Types } from "mongoose";

import {
  deleteCloudinaryAsset,
  deleteCvAsset,
  type CloudinaryResourceType,
} from "@/lib/cloudinary";
import { connectToDatabase } from "@/lib/database";
import { AppError } from "@/lib/errors";
import { AIUsage } from "@/models/ai-usage.model";
import { Answer } from "@/models/answer.model";
import { Application } from "@/models/application.model";
import { AssessmentAttempt } from "@/models/assessment-attempt.model";
import { AssessmentInvitation } from "@/models/assessment-invitation.model";
import { AuditLog } from "@/models/audit-log.model";
import { Candidate } from "@/models/candidate.model";
import { Evaluation } from "@/models/evaluation.model";
import { IntegrityEvent } from "@/models/integrity-event.model";
import { Notification } from "@/models/notification.model";
import type { AuthorizationContext } from "@/modules/authorization/service";
import {
  candidateRemovalSchema,
  type CandidateRemovalInput,
} from "@/modules/candidates/schemas";

function regexEscape(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listCandidates(
  context: AuthorizationContext,
  search = "",
) {
  await connectToDatabase();
  const filter: Record<string, unknown> = {
    organizationId: context.organizationId,
  };
  if (search.trim()) {
    const expression = {
      $regex: regexEscape(search.trim()),
      $options: "i",
    };
    filter.$or = [{ fullName: expression }, { email: expression }];
  }

  const candidates = await Candidate.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  const ids = candidates.map((candidate) => candidate._id);
  const organizationId = new Types.ObjectId(context.organizationId);
  const [applications, assessmentInvitations] = await Promise.all([
    Application.aggregate<{
      _id: Types.ObjectId;
      count: number;
      latestStage: string;
    }>([
      {
        $match: {
          organizationId,
          candidateId: { $in: ids },
        },
      },
      { $sort: { appliedAt: -1 } },
      {
        $group: {
          _id: "$candidateId",
          count: { $sum: 1 },
          latestStage: { $first: "$stage" },
        },
      },
    ]),
    AssessmentInvitation.aggregate<{
      _id: Types.ObjectId;
      count: number;
    }>([
      {
        $match: {
          organizationId,
          candidateId: { $in: ids },
        },
      },
      { $group: { _id: "$candidateId", count: { $sum: 1 } } },
    ]),
  ]);
  const applicationsByCandidate = new Map(
    applications.map((entry) => [String(entry._id), entry]),
  );
  const assessmentsByCandidate = new Map(
    assessmentInvitations.map((entry) => [String(entry._id), entry.count]),
  );

  return candidates.map((candidate) => ({
    id: String(candidate._id),
    fullName: candidate.fullName,
    email: candidate.email,
    location: candidate.location ?? "—",
    createdAt: candidate.createdAt.toISOString(),
    applicationCount:
      applicationsByCandidate.get(String(candidate._id))?.count ?? 0,
    assessmentCount:
      assessmentsByCandidate.get(String(candidate._id)) ?? 0,
    latestStage:
      applicationsByCandidate.get(String(candidate._id))?.latestStage ?? "—",
  }));
}

type StoredMediaAsset = {
  publicId: string;
  resourceType: CloudinaryResourceType;
};

function isCloudinaryResourceType(
  value: unknown,
): value is CloudinaryResourceType {
  return value === "image" || value === "video" || value === "raw";
}

function extractIntegrityAsset(
  metadata: Record<string, unknown>,
): StoredMediaAsset | null {
  const publicId = metadata.publicId;
  const resourceType = metadata.resourceType;
  return typeof publicId === "string" &&
    isCloudinaryResourceType(resourceType)
    ? { publicId, resourceType }
    : null;
}

export async function removeCandidateData(
  context: AuthorizationContext,
  candidateId: string,
  input: CandidateRemovalInput,
  ipAddress?: string,
) {
  const data = candidateRemovalSchema.parse(input);
  if (!Types.ObjectId.isValid(candidateId)) {
    throw new AppError("Candidate not found.", 404, "CANDIDATE_NOT_FOUND");
  }

  const mongoose = await connectToDatabase();
  const organizationId = new Types.ObjectId(context.organizationId);
  const candidateObjectId = new Types.ObjectId(candidateId);
  const candidate = await Candidate.findOne({
    _id: candidateObjectId,
    organizationId,
  })
    .select("_id")
    .lean();
  if (!candidate) {
    throw new AppError("Candidate not found.", 404, "CANDIDATE_NOT_FOUND");
  }

  const [attempts, invitations, answers, integrityEvents, applications] =
    await Promise.all([
      AssessmentAttempt.find({
        organizationId,
        candidateId: candidateObjectId,
      })
        .select("_id status")
        .lean(),
      AssessmentInvitation.find({
        organizationId,
        candidateId: candidateObjectId,
      })
        .select("_id status")
        .lean(),
      Answer.find({ organizationId, candidateId: candidateObjectId })
        .select("_id media")
        .lean(),
      IntegrityEvent.find({
        organizationId,
        candidateId: candidateObjectId,
      })
        .select("metadata")
        .lean(),
      Application.find({
        organizationId,
        candidateId: candidateObjectId,
      })
        .select("_id cvPublicId cvResourceType")
        .lean(),
    ]);

  if (
    attempts.some((attempt) => attempt.status === "in_progress") ||
    invitations.some((invitation) => invitation.status === "started")
  ) {
    throw new AppError(
      "An assessment is currently in progress. Wait for it to finish before removing candidate data.",
      409,
      "ASSESSMENT_IN_PROGRESS",
    );
  }

  const attemptIds = attempts.map((attempt) => attempt._id);
  const answerIds = answers.map((answer) => answer._id);
  const applicationIds = applications.map((application) => application._id);
  const assessmentEvaluations = await Evaluation.find({
    organizationId,
    candidateId: candidateObjectId,
    kind: { $in: ["answer", "assessment"] },
  })
    .select("_id")
    .lean();
  const assessmentEvaluationIds = assessmentEvaluations.map(
    (evaluation) => evaluation._id,
  );

  const assessmentAssets = new Map<string, StoredMediaAsset>();
  for (const answer of answers) {
    if (
      answer.media?.publicId &&
      isCloudinaryResourceType(answer.media.resourceType)
    ) {
      assessmentAssets.set(answer.media.publicId, {
        publicId: answer.media.publicId,
        resourceType: answer.media.resourceType,
      });
    }
  }
  for (const event of integrityEvents) {
    const asset = extractIntegrityAsset(event.metadata);
    if (asset) assessmentAssets.set(asset.publicId, asset);
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const assessmentUsageFilters: Record<string, unknown>[] = [];
      if (attemptIds.length) {
        assessmentUsageFilters.push({ attemptId: { $in: attemptIds } });
      }
      if (answerIds.length) {
        assessmentUsageFilters.push({ answerId: { $in: answerIds } });
      }
      if (assessmentEvaluationIds.length) {
        assessmentUsageFilters.push({
          evaluationId: { $in: assessmentEvaluationIds },
        });
      }

      if (data.scope === "candidate") {
        await AIUsage.deleteMany(
          {
            organizationId,
            applicationId: { $in: applicationIds },
          },
          { session },
        );
        await Evaluation.deleteMany(
          { organizationId, candidateId: candidateObjectId },
          { session },
        );
        await Notification.deleteMany(
          { organizationId, candidateId: candidateObjectId },
          { session },
        );
      } else {
        if (assessmentUsageFilters.length) {
          await AIUsage.deleteMany(
            { organizationId, $or: assessmentUsageFilters },
            { session },
          );
        }
        await Evaluation.deleteMany(
          {
            organizationId,
            candidateId: candidateObjectId,
            kind: { $in: ["answer", "assessment"] },
          },
          { session },
        );
        await Notification.deleteMany(
          {
            organizationId,
            candidateId: candidateObjectId,
            type: {
              $in: [
                "assessment_invitation",
                "assessment_reminder",
                "assessment_otp",
              ],
            },
          },
          { session },
        );
      }

      await IntegrityEvent.deleteMany(
        { organizationId, candidateId: candidateObjectId },
        { session },
      );
      await Answer.deleteMany(
        { organizationId, candidateId: candidateObjectId },
        { session },
      );
      await AssessmentAttempt.deleteMany(
        { organizationId, candidateId: candidateObjectId },
        { session },
      );
      await AssessmentInvitation.deleteMany(
        { organizationId, candidateId: candidateObjectId },
        { session },
      );

      if (data.scope === "candidate") {
        await Application.deleteMany(
          { organizationId, candidateId: candidateObjectId },
          { session },
        );
        await Candidate.deleteOne(
          { _id: candidateObjectId, organizationId },
          { session },
        );
      } else {
        await Application.updateMany(
          {
            organizationId,
            candidateId: candidateObjectId,
            stage: {
              $in: [
                "assessment_invited",
                "assessment_in_progress",
                "assessment_completed",
              ],
            },
          },
          { $set: { stage: "cv_reviewed" } },
          { session },
        );
      }

      await AuditLog.create(
        [
          {
            organizationId,
            actorId: context.userId,
            action:
              data.scope === "candidate"
                ? "candidate.deleted"
                : "candidate.assessments_deleted",
            resourceType: "candidate",
            resourceId: candidateObjectId,
            metadata: {
              scope: data.scope,
              removedApplications:
                data.scope === "candidate" ? applications.length : 0,
              removedAttempts: attempts.length,
              removedAnswers: answers.length,
              removedInvitations: invitations.length,
            },
            ipAddress,
          },
        ],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  await Promise.allSettled(
    [...assessmentAssets.values()].map((asset) =>
      deleteCloudinaryAsset(asset.publicId, asset.resourceType),
    ),
  );
  if (data.scope === "candidate") {
    await Promise.allSettled(
      applications.map((application) =>
        deleteCvAsset(
          application.cvPublicId,
          application.cvResourceType as "raw" | "image",
        ),
      ),
    );
  }

  return {
    id: candidateId,
    scope: data.scope,
    candidateRemoved: data.scope === "candidate",
    removed: {
      applications: data.scope === "candidate" ? applications.length : 0,
      attempts: attempts.length,
      answers: answers.length,
      invitations: invitations.length,
    },
  };
}
