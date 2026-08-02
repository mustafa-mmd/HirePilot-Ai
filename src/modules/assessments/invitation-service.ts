import "server-only";

import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/database";
import { AppError } from "@/lib/errors";
import { Application } from "@/models/application.model";
import { AssessmentAttempt } from "@/models/assessment-attempt.model";
import { AssessmentInvitation } from "@/models/assessment-invitation.model";
import { AssessmentTemplate } from "@/models/assessment-template.model";
import { AuditLog } from "@/models/audit-log.model";
import { Candidate } from "@/models/candidate.model";
import { Job } from "@/models/job.model";
import { Notification } from "@/models/notification.model";
import { Organization } from "@/models/organization.model";
import { assessmentInvitationInputSchema, type AssessmentInvitationInput } from "@/modules/assessments/schemas";
import { createAssessmentInvitationToken, hashAssessmentInvitationToken, isAssessmentInvitationToken } from "@/modules/assessments/invitation-token";
import { getAssessmentInvitationWindowState } from "@/modules/assessments/invitation-window";
import type { AuthorizationContext } from "@/modules/authorization/service";
import { deliverAssessmentInvitation, deliverAssessmentReminder } from "@/modules/notifications/service";
import { enforcePlanLimit } from "@/modules/subscriptions/service";

export async function listInvitationManagerData(context: AuthorizationContext) {
  await connectToDatabase();
  const now = new Date();
  await AssessmentInvitation.updateMany({ organizationId: context.organizationId, status: { $in: ["invited", "opened"] }, expiresAt: { $lte: now } }, { $set: { status: "expired" } });
  const [templates, applications, invitations] = await Promise.all([
    AssessmentTemplate.find({ organizationId: context.organizationId, status: "published" }).select("title totalDuration monitoringLevel").sort({ title: 1 }).lean(),
    Application.find({ organizationId: context.organizationId, stage: { $in: ["cv_reviewed", "assessment_invited"] } }).select("candidateId jobId stage appliedAt").sort({ appliedAt: -1 }).limit(300).lean(),
    AssessmentInvitation.find({
      organizationId: context.organizationId,
      cancelledAt: { $exists: false },
      archivedAt: { $exists: false },
    })
      .sort({ sentAt: -1 })
      .limit(300)
      .lean(),
  ]);
  const candidateIds = [...new Set(applications.map((item) => String(item.candidateId)))];
  const jobIds = [...new Set(applications.map((item) => String(item.jobId)))];
  const invitationCandidateIds = [...new Set(invitations.map((item) => String(item.candidateId)))];
  const invitationTemplateIds = [...new Set(invitations.map((item) => String(item.assessmentId)))];
  const [candidates, jobs, invitationTemplates] = await Promise.all([
    Candidate.find({ organizationId: context.organizationId, _id: { $in: [...new Set([...candidateIds, ...invitationCandidateIds])] } }).select("fullName email").lean(),
    Job.find({ organizationId: context.organizationId, _id: { $in: jobIds } }).select("title").lean(),
    AssessmentTemplate.find({ organizationId: context.organizationId, _id: { $in: invitationTemplateIds } }).select("title").lean(),
  ]);
  const candidateById = new Map(candidates.map((candidate) => [String(candidate._id), candidate]));
  const jobById = new Map(jobs.map((job) => [String(job._id), job]));
  const templateById = new Map(invitationTemplates.map((template) => [String(template._id), template]));

  return {
    templates: templates.map((template) => ({ id: String(template._id), title: template.title, totalDuration: template.totalDuration, monitoringLevel: template.monitoringLevel })),
    applications: applications.flatMap((application) => { const candidate = candidateById.get(String(application.candidateId)); const job = jobById.get(String(application.jobId)); return candidate && job ? [{ id: String(application._id), candidateName: candidate.fullName, candidateEmail: candidate.email, jobTitle: job.title, stage: application.stage }] : []; }),
    invitations: invitations.flatMap((invitation) => { const candidate = candidateById.get(String(invitation.candidateId)); const template = templateById.get(String(invitation.assessmentId)); return candidate && template ? [{ id: String(invitation._id), assessmentId: String(invitation.assessmentId), applicationId: String(invitation.applicationId), candidateName: candidate.fullName, candidateEmail: candidate.email, assessmentTitle: template.title, status: invitation.status, windowState: getAssessmentInvitationWindowState(invitation.startDeadline, invitation.expiresAt, now), sentAt: invitation.sentAt.toISOString(), startDeadline: invitation.startDeadline.toISOString(), expiresAt: invitation.expiresAt.toISOString(), maximumAttempts: invitation.maximumAttempts, candidateInstructions: invitation.candidateInstructions, remindersEnabled: invitation.remindersEnabled, reminderCount: invitation.reminderCount ?? 0 }] : []; }),
  };
}

export async function createAssessmentInvitation(context: AuthorizationContext, input: AssessmentInvitationInput, ipAddress?: string) {
  const data = assessmentInvitationInputSchema.parse(input);
  await connectToDatabase();
  await enforcePlanLimit(context.organizationId, "monthlyAssessments");
  const [template, application] = await Promise.all([
    AssessmentTemplate.findOne({ _id: data.assessmentId, organizationId: context.organizationId, status: "published" }),
    Application.findOne({ _id: data.applicationId, organizationId: context.organizationId }),
  ]);
  if (!template) throw new AppError("Published assessment not found.", 404, "ASSESSMENT_NOT_FOUND");
  if (!application) throw new AppError("Application not found.", 404, "APPLICATION_NOT_FOUND");
  if (!(["cv_reviewed", "assessment_invited"] as string[]).includes(application.stage)) throw new AppError("Move the application to CV reviewed before sending an assessment.", 409, "APPLICATION_NOT_READY");
  const [candidate, job, organization, existing] = await Promise.all([
    Candidate.findOne({ _id: application.candidateId, organizationId: context.organizationId }),
    Job.findOne({ _id: application.jobId, organizationId: context.organizationId }).select("title"),
    Organization.findOne({ _id: context.organizationId }).select("name"),
    AssessmentInvitation.findOne({ organizationId: context.organizationId, assessmentId: template._id, applicationId: application._id }),
  ]);
  if (!candidate || !job || !organization) throw new AppError("Invitation data is incomplete.", 409, "INVITATION_DATA_INCOMPLETE");
  if (existing && ["started", "completed"].includes(existing.status)) throw new AppError("This assessment has already been started and cannot be reissued.", 409, "INVITATION_ALREADY_USED");
  if (new Date(data.expiresAt).getTime() - new Date(data.startDeadline).getTime() < template.totalDuration * 60_000) {
    throw new AppError(
      `The assessment window must be at least ${template.totalDuration} minutes.`,
      422,
      "ASSESSMENT_WINDOW_TOO_SHORT",
    );
  }

  const { token: rawToken, tokenHash: hashedToken } = createAssessmentInvitationToken();
  const mongoose = await connectToDatabase();
  const session = await mongoose.startSession();
  let invitationId = "";
  let notificationId = "";
  try {
    await session.withTransaction(async () => {
      const invitation = await AssessmentInvitation.findOneAndUpdate(
        { organizationId: context.organizationId, assessmentId: template._id, applicationId: application._id },
        { $set: { candidateId: candidate._id, tokenHash: hashedToken, expiresAt: new Date(data.expiresAt), startDeadline: new Date(data.startDeadline), maximumAttempts: data.maximumAttempts, assessmentDuration: template.totalDuration, monitoringLevel: template.monitoringLevel, candidateInstructions: data.candidateInstructions, remindersEnabled: data.remindersEnabled, reminderCount: 0, otpAttempts: 0, otpRequestCount: 0, status: "invited", sentAt: new Date() }, $unset: { latestReminderTokenHash: 1, openedAt: 1, startedAt: 1, completedAt: 1, cancelledAt: 1, archivedAt: 1, lastReminderSentAt: 1, otpHash: 1, otpExpiresAt: 1, otpVerifiedAt: 1 } },
        { upsert: true, new: true, runValidators: true, session },
      );
      invitationId = invitation.id;
      const notification = await Notification.findOneAndUpdate(
        { organizationId: context.organizationId, assessmentInvitationId: invitation._id, type: "assessment_invitation" },
        { $set: { candidateId: candidate._id, applicationId: application._id, recipient: candidate.email, status: "pending" }, $setOnInsert: { organizationId: context.organizationId, assessmentInvitationId: invitation._id, channel: "email", type: "assessment_invitation" }, $unset: { failureReason: 1, providerMessageId: 1, sentAt: 1 } },
        { upsert: true, new: true, runValidators: true, session },
      );
      notificationId = notification.id;
      if (application.stage === "cv_reviewed") await Application.updateOne({ _id: application._id, organizationId: context.organizationId }, { $set: { stage: "assessment_invited" } }, { session });
      await AuditLog.create([{ organizationId: context.organizationId, actorId: context.userId, action: "assessment.invited", resourceType: "assessment_invitation", resourceId: invitation._id, metadata: { assessmentId: template.id, applicationId: application.id, candidateId: candidate.id }, ipAddress }], { session });
    });
  } finally { await session.endSession(); }

  const assessmentUrl = `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/assessment/${rawToken}`;
  await deliverAssessmentInvitation(notificationId, { candidateName: candidate.fullName, assessmentTitle: template.title, jobTitle: job.title, organizationName: organization.name, assessmentUrl, availableFrom: new Date(data.startDeadline).toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" }) + " UTC", expiresAt: new Date(data.expiresAt).toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" }) + " UTC", duration: template.totalDuration, email: candidate.email, applicationId: application.id, invitationId, organizationId: context.organizationId, deliveryKey: hashedToken.slice(0, 16) });
  const notification = await Notification.findOne({ _id: notificationId, organizationId: context.organizationId }).select("status failureReason").lean();
  return { id: invitationId, deliveryStatus: notification?.status ?? "failed", deliveryError: notification?.failureReason };
}

export async function getPublicAssessmentInstructions(token: string) {
  if (!isAssessmentInvitationToken(token)) throw new AppError("Assessment invitation not found.", 404, "INVITATION_NOT_FOUND");
  await connectToDatabase();
  const tokenHash = hashAssessmentInvitationToken(token);
  const invitation = await AssessmentInvitation.findOne({
    $or: [{ tokenHash }, { latestReminderTokenHash: tokenHash }],
  }).select("+tokenHash");
  if (!invitation) throw new AppError("Assessment invitation not found.", 404, "INVITATION_NOT_FOUND");
  const now = new Date();
  const submittedAttempts = await AssessmentAttempt.countDocuments({
    invitationId: invitation._id,
    status: "completed",
  });
  if (invitation.status === "completed" && submittedAttempts < invitation.maximumAttempts) {
    invitation.status = "opened";
    invitation.completedAt = undefined;
    await invitation.save();
  }
  const windowState = getAssessmentInvitationWindowState(invitation.startDeadline, invitation.expiresAt, now);
  if (["invited", "opened"].includes(invitation.status) && windowState === "expired") {
    invitation.status = "expired";
    await invitation.save();
  }
  const [template, candidate, application, organization] = await Promise.all([
    AssessmentTemplate.findOne({ _id: invitation.assessmentId, organizationId: invitation.organizationId }).select("title description questionIds totalPoints"),
    Candidate.findOne({ _id: invitation.candidateId, organizationId: invitation.organizationId }).select("fullName"),
    Application.findOne({ _id: invitation.applicationId, organizationId: invitation.organizationId }).select("jobId"),
    Organization.findOne({ _id: invitation.organizationId }).select("name branding privacyContactEmail retentionDays"),
  ]);
  const job = application ? await Job.findOne({ _id: application.jobId, organizationId: invitation.organizationId }).select("title") : null;
  if (!template || !candidate || !job || !organization) throw new AppError("Assessment invitation is incomplete.", 409, "INVITATION_DATA_INCOMPLETE");
  const privacyDetails = `${organization.branding.assessmentSupportMessage ?? "Contact the recruiting team if you need an accommodation or want to challenge an AI-assisted result."}\nRetention period: ${organization.retentionDays ?? 365} days.${organization.privacyContactEmail ? ` Privacy and accommodation contact: ${organization.privacyContactEmail}.` : ""}`;
  return { assessmentTitle: template.title, assessmentDescription: template.description, candidateName: candidate.fullName, jobTitle: job.title, organizationName: organization.name, instructions: `${invitation.candidateInstructions}\n\nPrivacy, accommodation, and challenge process\n${privacyDetails}`, monitoringLevel: invitation.monitoringLevel, duration: invitation.assessmentDuration, questionCount: template.questionIds.length, totalPoints: template.totalPoints, maximumAttempts: invitation.maximumAttempts, submittedAttempts, attemptsRemaining: Math.max(0, invitation.maximumAttempts - submittedAttempts), startDeadline: invitation.startDeadline.toISOString(), expiresAt: invitation.expiresAt.toISOString(), serverNow: now.toISOString(), windowState, status: invitation.status };
}

export async function markInvitationOpened(token: string) {
  if (!isAssessmentInvitationToken(token)) throw new AppError("Assessment invitation not found.", 404, "INVITATION_NOT_FOUND");
  await connectToDatabase();
  const tokenHash = hashAssessmentInvitationToken(token);
  const invitation = await AssessmentInvitation.findOneAndUpdate({ $or: [{ tokenHash }, { latestReminderTokenHash: tokenHash }], status: "invited", expiresAt: { $gt: new Date() } }, { $set: { status: "opened", openedAt: new Date() } }, { new: true });
  return { opened: Boolean(invitation) };
}

export async function sendAssessmentReminder(context: AuthorizationContext, invitationId: string, ipAddress?: string) {
  if (!Types.ObjectId.isValid(invitationId)) throw new AppError("Invitation not found.", 404, "INVITATION_NOT_FOUND");
  await connectToDatabase();
  const invitation = await AssessmentInvitation.findOne({ _id: invitationId, organizationId: context.organizationId }).select("+latestReminderTokenHash");
  if (!invitation) throw new AppError("Invitation not found.", 404, "INVITATION_NOT_FOUND");
  if (!invitation.remindersEnabled) throw new AppError("Reminders are disabled for this invitation.", 409, "REMINDERS_DISABLED");
  if (!["invited", "opened"].includes(invitation.status) || invitation.expiresAt <= new Date()) throw new AppError("Only active invitations can receive reminders.", 409, "INVITATION_NOT_ACTIVE");
  const [candidate, template, application, organization] = await Promise.all([
    Candidate.findOne({ _id: invitation.candidateId, organizationId: context.organizationId }),
    AssessmentTemplate.findOne({ _id: invitation.assessmentId, organizationId: context.organizationId }).select("title"),
    Application.findOne({ _id: invitation.applicationId, organizationId: context.organizationId }).select("jobId"),
    Organization.findOne({ _id: context.organizationId }).select("name"),
  ]);
  const job = application ? await Job.findOne({ _id: application.jobId, organizationId: context.organizationId }).select("title") : null;
  if (!candidate || !template || !job || !organization) throw new AppError("Reminder data is incomplete.", 409, "REMINDER_DATA_INCOMPLETE");
  const nextReminder = invitation.reminderCount + 1;
  const previousReminderTokenHash = invitation.latestReminderTokenHash;
  const reminderToken = createAssessmentInvitationToken();
  const assessmentUrl = `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/assessment/${reminderToken.token}`;
  const notification = await Notification.findOneAndUpdate(
    { organizationId: context.organizationId, assessmentInvitationId: invitation._id, type: "assessment_reminder" },
    { $set: { candidateId: candidate._id, applicationId: invitation.applicationId, recipient: candidate.email, status: "pending" }, $setOnInsert: { organizationId: context.organizationId, assessmentInvitationId: invitation._id, channel: "email", type: "assessment_reminder" }, $unset: { failureReason: 1, providerMessageId: 1, sentAt: 1 } },
    { upsert: true, new: true, runValidators: true },
  );
  await AssessmentInvitation.updateOne(
    { _id: invitation._id, organizationId: context.organizationId },
    { $set: { latestReminderTokenHash: reminderToken.tokenHash } },
  );
  await deliverAssessmentReminder(notification.id, { candidateName: candidate.fullName, assessmentTitle: template.title, jobTitle: job.title, organizationName: organization.name, assessmentUrl, availableFrom: invitation.startDeadline.toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" }) + " UTC", expiresAt: invitation.expiresAt.toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" }) + " UTC", email: candidate.email, invitationId: invitation.id, organizationId: context.organizationId, reminderNumber: nextReminder });
  const delivery = await Notification.findOne({ _id: notification._id, organizationId: context.organizationId }).select("status failureReason").lean();
  if (delivery?.status === "sent") {
    await AssessmentInvitation.updateOne({ _id: invitation._id, organizationId: context.organizationId }, { $set: { lastReminderSentAt: new Date() }, $inc: { reminderCount: 1 } });
  } else if (previousReminderTokenHash) {
    await AssessmentInvitation.updateOne(
      { _id: invitation._id, organizationId: context.organizationId },
      { $set: { latestReminderTokenHash: previousReminderTokenHash } },
    );
  } else {
    await AssessmentInvitation.updateOne(
      { _id: invitation._id, organizationId: context.organizationId },
      { $unset: { latestReminderTokenHash: 1 } },
    );
  }
  await AuditLog.create({ organizationId: context.organizationId, actorId: context.userId, action: "assessment.reminder_sent", resourceType: "assessment_invitation", resourceId: invitation._id, metadata: { deliveryStatus: delivery?.status ?? "failed", reminderNumber: nextReminder }, ipAddress });
  return { deliveryStatus: delivery?.status ?? "failed", deliveryError: delivery?.failureReason };
}

export async function removeAssessmentInvitation(
  context: AuthorizationContext,
  invitationId: string,
  ipAddress?: string,
) {
  if (!Types.ObjectId.isValid(invitationId)) {
    throw new AppError("Invitation not found.", 404, "INVITATION_NOT_FOUND");
  }

  await connectToDatabase();
  const existing = await AssessmentInvitation.findOne({
    _id: invitationId,
    organizationId: context.organizationId,
    archivedAt: { $exists: false },
  });
  if (!existing) {
    throw new AppError("Invitation not found.", 404, "INVITATION_NOT_FOUND");
  }
  if (existing.status === "started") {
    throw new AppError(
      "An assessment in progress cannot be removed.",
      409,
      "INVITATION_IN_PROGRESS",
    );
  }

  const removedAt = new Date();
  const cancelsActiveLink = ["invited", "opened"].includes(existing.status);
  const invitation = await AssessmentInvitation.findOneAndUpdate(
    {
      _id: invitationId,
      organizationId: context.organizationId,
      archivedAt: { $exists: false },
    },
    {
      $set: {
        archivedAt: removedAt,
        ...(cancelsActiveLink
          ? { status: "expired", cancelledAt: removedAt }
          : {}),
      },
      $unset: {
        latestReminderTokenHash: 1,
        otpHash: 1,
        otpExpiresAt: 1,
        otpVerifiedAt: 1,
      },
    },
    { new: true },
  );
  if (!invitation) {
    throw new AppError("Invitation not found.", 404, "INVITATION_NOT_FOUND");
  }

  if (["invited", "opened", "expired"].includes(existing.status)) {
    const anotherActiveInvitation = await AssessmentInvitation.exists({
      _id: { $ne: invitation._id },
      organizationId: context.organizationId,
      applicationId: invitation.applicationId,
      archivedAt: { $exists: false },
      status: { $in: ["invited", "opened", "started"] },
    });
    if (!anotherActiveInvitation) {
      await Application.updateOne(
        {
          _id: invitation.applicationId,
          organizationId: context.organizationId,
          stage: "assessment_invited",
        },
        { $set: { stage: "cv_reviewed" } },
      );
    }
  }

  await AuditLog.create({
    organizationId: context.organizationId,
    actorId: context.userId,
    action: "assessment.invitation_removed",
    resourceType: "assessment_invitation",
    resourceId: invitation._id,
    metadata: {
      assessmentId: String(invitation.assessmentId),
      applicationId: String(invitation.applicationId),
      candidateId: String(invitation.candidateId),
      previousStatus: existing.status,
      activeLinkCancelled: cancelsActiveLink,
    },
    ipAddress,
  });

  return {
    id: invitationId,
    removed: true,
    activeLinkCancelled: cancelsActiveLink,
  };
}
