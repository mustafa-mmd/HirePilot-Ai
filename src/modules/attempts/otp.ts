import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import { connectToDatabase } from "@/lib/database";
import { AppError } from "@/lib/errors";
import { AssessmentInvitation } from "@/models/assessment-invitation.model";
import { AssessmentTemplate } from "@/models/assessment-template.model";
import { Candidate } from "@/models/candidate.model";
import { Notification } from "@/models/notification.model";
import { Organization } from "@/models/organization.model";
import { hashAssessmentInvitationToken, isAssessmentInvitationToken } from "@/modules/assessments/invitation-token";
import { deliverAssessmentOtp } from "@/modules/notifications/service";

const OTP_TTL_MS = 10 * 60_000;
const MAX_OTP_ATTEMPTS = 5;

function otpSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new AppError("Assessment verification is not configured.", 503, "OTP_UNAVAILABLE");
  return secret;
}

export function hashOtp(invitationId: string, code: string) {
  return createHmac("sha256", otpSecret()).update(`${invitationId}:${code}`).digest("hex");
}

function matchesHash(value: string, expected: string) {
  const left = Buffer.from(value, "hex");
  const right = Buffer.from(expected, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

async function invitationFromToken(token: string, withOtp = false) {
  if (!isAssessmentInvitationToken(token)) throw new AppError("Assessment invitation not found.", 404, "INVITATION_NOT_FOUND");
  await connectToDatabase();
  const tokenHash = hashAssessmentInvitationToken(token);
  const query = AssessmentInvitation.findOne({
    $or: [{ tokenHash }, { latestReminderTokenHash: tokenHash }],
  });
  if (withOtp) query.select("+otpHash");
  const invitation = await query;
  if (!invitation) throw new AppError("Assessment invitation not found.", 404, "INVITATION_NOT_FOUND");
  const now = new Date();
  if (invitation.expiresAt <= now) {
    invitation.status = "expired";
    await invitation.save();
    throw new AppError("This assessment invitation has expired.", 410, "INVITATION_EXPIRED");
  }
  if (["completed", "expired"].includes(invitation.status)) throw new AppError("This assessment invitation is no longer active.", 409, "INVITATION_NOT_ACTIVE");
  return invitation;
}

export async function requestAssessmentOtp(token: string, email: string) {
  const invitation = await invitationFromToken(token);
  const [candidate, template, organization] = await Promise.all([
    Candidate.findOne({ _id: invitation.candidateId, organizationId: invitation.organizationId }).select("fullName email"),
    AssessmentTemplate.findOne({ _id: invitation.assessmentId, organizationId: invitation.organizationId }).select("title"),
    Organization.findOne({ _id: invitation.organizationId }).select("name"),
  ]);
  if (!candidate || !template || !organization || candidate.email.toLowerCase() !== email.toLowerCase()) throw new AppError("The email does not match this invitation.", 422, "EMAIL_MISMATCH");
  if (invitation.otpVerifiedAt) return { alreadyVerified: true, deliveryStatus: "verified" as const };
  if (invitation.otpRequestCount >= 10) throw new AppError("Too many verification codes requested. Contact the recruiting team.", 429, "OTP_REQUEST_LIMIT");

  const code = randomInt(100_000, 1_000_000).toString();
  const requestNumber = invitation.otpRequestCount + 1;
  invitation.otpHash = hashOtp(invitation.id, code);
  invitation.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  invitation.otpAttempts = 0;
  invitation.otpRequestCount = requestNumber;
  await invitation.save();

  const notification = await Notification.findOneAndUpdate(
    { organizationId: invitation.organizationId, assessmentInvitationId: invitation._id, type: "assessment_otp" },
    { $set: { candidateId: candidate._id, applicationId: invitation.applicationId, recipient: candidate.email, channel: "email", status: "pending" }, $setOnInsert: { organizationId: invitation.organizationId, assessmentInvitationId: invitation._id, type: "assessment_otp" }, $unset: { failureReason: 1, providerMessageId: 1, sentAt: 1 } },
    { upsert: true, new: true, runValidators: true },
  );
  await deliverAssessmentOtp(notification.id, { candidateName: candidate.fullName, organizationName: organization.name, assessmentTitle: template.title, code, email: candidate.email, invitationId: invitation.id, organizationId: String(invitation.organizationId), requestNumber });
  const delivery = await Notification.findById(notification._id).select("status failureReason").lean();
  return { alreadyVerified: false, deliveryStatus: delivery?.status ?? "failed", deliveryError: delivery?.failureReason };
}

export async function verifyAssessmentOtp(token: string, code: string) {
  const invitation = await invitationFromToken(token, true);
  if (invitation.otpVerifiedAt) return { verified: true };
  if (!invitation.otpHash || !invitation.otpExpiresAt || invitation.otpExpiresAt <= new Date()) throw new AppError("The verification code has expired. Request a new code.", 410, "OTP_EXPIRED");
  if (invitation.otpAttempts >= MAX_OTP_ATTEMPTS) throw new AppError("Too many incorrect codes. Request a new code.", 429, "OTP_ATTEMPTS_EXCEEDED");
  if (!matchesHash(hashOtp(invitation.id, code), invitation.otpHash)) {
    invitation.otpAttempts += 1;
    await invitation.save();
    throw new AppError("The verification code is incorrect.", 422, "OTP_INCORRECT", { remainingAttempts: Math.max(0, MAX_OTP_ATTEMPTS - invitation.otpAttempts) });
  }
  invitation.otpVerifiedAt = new Date();
  invitation.otpAttempts = 0;
  invitation.otpHash = undefined;
  invitation.otpExpiresAt = undefined;
  await invitation.save();
  return { verified: true };
}

export async function requireVerifiedInvitation(token: string) {
  const invitation = await invitationFromToken(token);
  if (!invitation.otpVerifiedAt) throw new AppError("Verify your email before continuing.", 403, "EMAIL_NOT_VERIFIED");
  return invitation;
}
