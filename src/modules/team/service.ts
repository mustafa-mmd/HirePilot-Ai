import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/database";
import { AppError } from "@/lib/errors";
import { AuditLog } from "@/models/audit-log.model";
import { Invitation } from "@/models/invitation.model";
import { Membership } from "@/models/membership.model";
import { Notification } from "@/models/notification.model";
import { Organization } from "@/models/organization.model";
import { User } from "@/models/user.model";
import type { AuthorizationContext } from "@/modules/authorization/service";
import { deliverTeamInvitation } from "@/modules/notifications/service";
import { enforcePlanLimit } from "@/modules/subscriptions/service";

function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }

function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "the invited email address";
  const visibleLength = Math.min(2, localPart.length);
  return `${localPart.slice(0, visibleLength)}${"*".repeat(Math.max(3, localPart.length - visibleLength))}@${domain}`;
}

export type TeamInvitationPreview = {
  status: "pending" | "accepted" | "expired" | "revoked" | "invalid";
  organizationName?: string;
  role?: "admin" | "recruiter" | "reviewer";
  invitedEmailHint?: string;
  emailMatches: boolean;
};

export async function getTeamInvitationPreview(
  token: string,
  authenticatedEmail?: string | null,
): Promise<TeamInvitationPreview> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return { status: "invalid", emailMatches: false };
  }

  await connectToDatabase();
  const invitation = await Invitation.findOne({ tokenHash: hashToken(token) })
    .select("organizationId email role status expiresAt")
    .lean();

  if (!invitation) return { status: "invalid", emailMatches: false };

  const organization = await Organization.findById(invitation.organizationId)
    .select("name")
    .lean();
  if (!organization) return { status: "invalid", emailMatches: false };

  const status =
    invitation.status === "pending" && invitation.expiresAt <= new Date()
      ? "expired"
      : invitation.status;

  return {
    status,
    organizationName: organization.name,
    role: invitation.role,
    invitedEmailHint: maskEmail(invitation.email),
    emailMatches:
      Boolean(authenticatedEmail) &&
      authenticatedEmail?.toLowerCase() === invitation.email.toLowerCase(),
  };
}

export async function listTeam(context: AuthorizationContext) {
  await connectToDatabase();
  await Invitation.updateMany({ organizationId: context.organizationId, status: "pending", expiresAt: { $lte: new Date() } }, { $set: { status: "expired" } });
  const [memberships, invitations] = await Promise.all([
    Membership.find({ organizationId: context.organizationId }).sort({ joinedAt: 1 }).lean(),
    Invitation.find({ organizationId: context.organizationId }).sort({ createdAt: -1 }).lean(),
  ]);
  const users = await User.find({ _id: { $in: memberships.map((membership) => membership.userId) } }).select("name email image").lean();
  const userById = new Map(users.map((user) => [String(user._id), user]));
  return { members: memberships.flatMap((membership) => { const user = userById.get(String(membership.userId)); return user ? [{ id: String(membership._id), userId: String(user._id), name: user.name, email: user.email, image: user.image, role: membership.role, status: membership.status, joinedAt: membership.joinedAt.toISOString() }] : []; }), invitations: invitations.map((invitation) => ({ id: String(invitation._id), email: invitation.email, role: invitation.role, status: invitation.status, expiresAt: invitation.expiresAt.toISOString(), createdAt: invitation.createdAt.toISOString() })) };
}

export async function inviteTeamMember(context: AuthorizationContext, email: string, role: "admin" | "recruiter" | "reviewer", ipAddress?: string) {
  await enforcePlanLimit(context.organizationId, "members");
  await connectToDatabase();
  const existingUser = await User.findOne({ email }).select("_id");
  if (existingUser && await Membership.exists({ organizationId: context.organizationId, userId: existingUser._id, status: "active" })) throw new AppError("This person is already an active team member.", 409, "MEMBER_EXISTS");
  const [organization, inviter] = await Promise.all([Organization.findById(context.organizationId).select("name"), User.findById(context.userId).select("name")]);
  if (!organization || !inviter) throw new AppError("Invitation data is incomplete.", 409, "INVITATION_DATA_INCOMPLETE");
  const rawToken = randomBytes(32).toString("base64url");
  const invitation = await Invitation.findOneAndUpdate(
    { organizationId: context.organizationId, email, status: "pending" },
    { $set: { role, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000), invitedBy: context.userId } },
    { upsert: true, new: true, runValidators: true },
  );
  const notification = await Notification.findOneAndUpdate({ organizationId: context.organizationId, teamInvitationId: invitation._id, type: "team_invitation" }, { $set: { recipient: email, status: "pending", channel: "email" }, $setOnInsert: { organizationId: context.organizationId, teamInvitationId: invitation._id, type: "team_invitation" }, $unset: { failureReason: 1, providerMessageId: 1, sentAt: 1 } }, { upsert: true, new: true, runValidators: true });
  const acceptUrl = `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/team/join/${rawToken}`;
  await deliverTeamInvitation(notification.id, { inviterName: inviter.name, organizationName: organization.name, role, acceptUrl, email, invitationId: invitation.id, organizationId: context.organizationId, deliveryKey: hashToken(rawToken).slice(0, 16) });
  await AuditLog.create({ organizationId: context.organizationId, actorId: context.userId, action: "team.invited", resourceType: "invitation", resourceId: invitation._id, metadata: { email, role }, ipAddress });
  const delivery = await Notification.findById(notification._id).select("status failureReason").lean();
  return { id: invitation.id, deliveryStatus: delivery?.status ?? "failed", deliveryError: delivery?.failureReason };
}

export async function acceptTeamInvitation(token: string, userId: string) {
  if (!Types.ObjectId.isValid(userId)) throw new AppError("Sign in to accept this invitation.", 401, "UNAUTHENTICATED");
  await connectToDatabase();
  const [invitation, user] = await Promise.all([
    Invitation.findOne({ tokenHash: hashToken(token) }).select("+tokenHash"),
    User.findById(userId),
  ]);
  if (
    !invitation ||
    invitation.status === "expired" ||
    invitation.status === "revoked" ||
    (invitation.status === "pending" && invitation.expiresAt <= new Date())
  ) {
    throw new AppError("This team invitation is invalid or expired.", 410, "INVITATION_EXPIRED");
  }
  if (!user || user.email.toLowerCase() !== invitation.email) throw new AppError("Sign in with the email address that received this invitation.", 403, "INVITATION_EMAIL_MISMATCH");
  await Membership.findOneAndUpdate({ organizationId: invitation.organizationId, userId: user._id }, { $set: { role: invitation.role, status: "active", invitedBy: invitation.invitedBy, joinedAt: new Date() } }, { upsert: true, new: true, runValidators: true });
  const acceptedInvitation = await Invitation.findOneAndUpdate(
    { _id: invitation._id, status: "pending" },
    { $set: { status: "accepted", acceptedAt: new Date() } },
    { new: true },
  );
  if (acceptedInvitation) {
    await AuditLog.create({ organizationId: invitation.organizationId, actorId: user._id, action: "team.invitation_accepted", resourceType: "invitation", resourceId: invitation._id, metadata: { role: invitation.role } });
  }
  return {
    organizationId: String(invitation.organizationId),
    alreadyAccepted: invitation.status === "accepted",
  };
}

export async function updateMembership(context: AuthorizationContext, membershipId: string, input: { role?: "admin" | "recruiter" | "reviewer"; status?: "active" | "suspended" }, ipAddress?: string) {
  if (!Types.ObjectId.isValid(membershipId)) throw new AppError("Team member not found.", 404, "MEMBER_NOT_FOUND");
  const membership = await Membership.findOne({ _id: membershipId, organizationId: context.organizationId });
  if (!membership) throw new AppError("Team member not found.", 404, "MEMBER_NOT_FOUND");
  if (membership.role === "owner") throw new AppError("The organization owner cannot be modified here.", 409, "OWNER_IMMUTABLE");
  if (String(membership.userId) === context.userId && input.status === "suspended") throw new AppError("You cannot suspend your own membership.", 409, "CANNOT_SUSPEND_SELF");
  if (input.role) membership.role = input.role;
  if (input.status) membership.status = input.status;
  await membership.save();
  await AuditLog.create({ organizationId: context.organizationId, actorId: context.userId, action: "team.membership_updated", resourceType: "membership", resourceId: membership._id, metadata: input, ipAddress });
  return { id: membership.id, role: membership.role, status: membership.status };
}
