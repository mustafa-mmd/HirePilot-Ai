import "server-only";

import path from "node:path";
import { Types } from "mongoose";

import { deleteCvAsset, verifyCvAsset } from "@/lib/cloudinary";
import { connectToDatabase } from "@/lib/database";
import { AppError, isDuplicateKeyError } from "@/lib/errors";
import { Application } from "@/models/application.model";
import { AuditLog } from "@/models/audit-log.model";
import { Candidate } from "@/models/candidate.model";
import { Job } from "@/models/job.model";
import { Notification } from "@/models/notification.model";
import { Organization } from "@/models/organization.model";
import type { AuthorizationContext } from "@/modules/authorization/service";
import type { ApplicationStage } from "@/modules/applications/constants";
import { applicationInputSchema, type ApplicationInput } from "@/modules/applications/schemas";
import { canTransitionStage } from "@/modules/applications/stages";
import { getPublishedJobById } from "@/modules/jobs/service";
import { deliverApplicationConfirmation } from "@/modules/notifications/service";

export async function submitApplication(input: ApplicationInput) {
  const data = applicationInputSchema.parse(input);
  const job = await getPublishedJobById(data.jobId);
  const cv = await verifyCvAsset(data.jobId, { ...data.cv, originalFilename: path.basename(data.cv.originalFilename).replace(/[^a-zA-Z0-9._ -]/g, "_") });
  const mongoose = await connectToDatabase();
  const session = await mongoose.startSession();
  let applicationId = "";
  let notificationId = "";

  try {
    await session.withTransaction(async () => {
      const candidate = await Candidate.findOneAndUpdate(
        { organizationId: job.organizationId, email: data.email },
        { $set: { fullName: data.fullName, phone: data.phone, location: data.location, linkedinUrl: data.linkedinUrl, githubUrl: data.githubUrl, portfolioUrl: data.portfolioUrl }, $setOnInsert: { organizationId: job.organizationId, email: data.email } },
        { new: true, upsert: true, session, runValidators: true },
      );
      const [application] = await Application.create([{ organizationId: job.organizationId, jobId: job._id, candidateId: candidate._id, cvUrl: cv.url, cvPublicId: cv.publicId, cvResourceType: cv.resourceType, cvFormat: cv.format, cvBytes: cv.bytes, cvOriginalFilename: cv.originalFilename, coverLetter: data.coverLetter, stage: "applied", source: "career_page", consentGiven: true, appliedAt: new Date() }], { session });
      const [notification] = await Notification.create([{ organizationId: job.organizationId, candidateId: candidate._id, applicationId: application._id, channel: "email", type: "application_confirmation", recipient: candidate.email, status: "pending" }], { session });
      applicationId = application.id;
      notificationId = notification.id;
    });
  } catch (error) {
    await deleteCvAsset(cv.publicId);
    if (isDuplicateKeyError(error)) throw new AppError("You have already applied for this job.", 409, "DUPLICATE_APPLICATION");
    throw error;
  } finally {
    await session.endSession();
  }

  const organization = await Organization.findOne({ _id: job.organizationId }).select("name").lean();
  await deliverApplicationConfirmation(notificationId, { candidateName: data.fullName, jobTitle: job.title, organizationName: organization?.name ?? "the hiring organization", email: data.email, applicationId, organizationId: String(job.organizationId) });
  return { id: applicationId };
}

export async function listJobApplications(context: AuthorizationContext, jobId: string) {
  if (!Types.ObjectId.isValid(jobId)) throw new AppError("Job not found.", 404, "JOB_NOT_FOUND");
  await connectToDatabase();
  const job = await Job.findOne({ _id: jobId, organizationId: context.organizationId }).select("title").lean();
  if (!job) throw new AppError("Job not found.", 404, "JOB_NOT_FOUND");
  const applications = await Application.find({ organizationId: context.organizationId, jobId }).sort({ appliedAt: -1 }).lean();
  const candidateIds = applications.map((application) => application.candidateId);
  const candidates = await Candidate.find({ organizationId: context.organizationId, _id: { $in: candidateIds } }).select("fullName email location").lean();
  const byId = new Map(candidates.map((candidate) => [String(candidate._id), candidate]));
  return { job: { id: String(job._id), title: job.title }, applications: applications.flatMap((application) => { const candidate = byId.get(String(application.candidateId)); return candidate ? [{ id: String(application._id), stage: application.stage, appliedAt: application.appliedAt.toISOString(), candidate: { id: String(candidate._id), fullName: candidate.fullName, email: candidate.email, location: candidate.location } }] : []; }) };
}

export async function updateApplicationStage(context: AuthorizationContext, applicationId: string, nextStage: ApplicationStage, ipAddress?: string) {
  if (!Types.ObjectId.isValid(applicationId)) throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");
  await connectToDatabase();
  const application = await Application.findOne({ _id: applicationId, organizationId: context.organizationId });
  if (!application) throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");
  if (!canTransitionStage(application.stage, nextStage)) throw new AppError(`Cannot move an application from ${application.stage} to ${nextStage}.`, 409, "INVALID_STAGE_TRANSITION");
  const previousStage = application.stage;
  application.stage = nextStage;
  await application.save();
  await AuditLog.create({ organizationId: context.organizationId, actorId: context.userId, action: "application.stage_changed", resourceType: "application", resourceId: application._id, metadata: { from: previousStage, to: nextStage }, ipAddress });
  return { id: application.id, stage: application.stage };
}
