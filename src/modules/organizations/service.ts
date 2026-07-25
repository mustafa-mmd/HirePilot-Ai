import "server-only";

import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/database";
import { AppError, isDuplicateKeyError } from "@/lib/errors";
import { AuditLog } from "@/models/audit-log.model";
import { Membership } from "@/models/membership.model";
import { Organization } from "@/models/organization.model";
import { Subscription } from "@/models/subscription.model";
import { currentBillingPeriod, PLAN_LIMITS } from "@/modules/subscriptions/plans";
import { organizationSchema, organizationSettingsSchema, type OrganizationInput } from "@/modules/organizations/schemas";
import type { AuthorizationContext } from "@/modules/authorization/service";

export async function createOrganization(
  userId: string,
  input: OrganizationInput,
  ipAddress?: string,
) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError("Invalid authenticated user.", 401, "INVALID_USER");
  }

  const data = organizationSchema.parse(input);
  const mongoose = await connectToDatabase();
  const databaseSession = await mongoose.startSession();

  try {
    let createdOrganization: InstanceType<typeof Organization> | undefined;

    await databaseSession.withTransaction(async () => {
      const [organization] = await Organization.create(
        [
          {
            name: data.name,
            slug: data.slug,
            ownerId: userId,
            branding: { primaryColor: "#7c3aed", secondaryColor: "#18181b" },
          },
        ],
        { session: databaseSession },
      );

      await Membership.create(
        [
          {
            organizationId: organization._id,
            userId,
            role: "owner",
            status: "active",
            joinedAt: new Date(),
          },
        ],
        { session: databaseSession },
      );

      const period = currentBillingPeriod();
      const [subscription] = await Subscription.create([{ organizationId: organization._id, plan: "starter", status: "trialing", periodStart: period.start, periodEnd: period.end, limits: PLAN_LIMITS.starter }], { session: databaseSession });
      organization.subscriptionId = subscription._id;
      await organization.save({ session: databaseSession });

      await AuditLog.create(
        [
          {
            organizationId: organization._id,
            actorId: userId,
            action: "organization.created",
            resourceType: "organization",
            resourceId: organization._id,
            metadata: { name: organization.name, slug: organization.slug },
            ipAddress,
          },
        ],
        { session: databaseSession },
      );

      createdOrganization = organization;
    });

    if (!createdOrganization) {
      throw new AppError("Organization creation did not complete.", 500);
    }

    return {
      id: createdOrganization.id,
      name: createdOrganization.name,
      slug: createdOrganization.slug,
      role: "owner" as const,
    };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        "That organization URL is already in use.",
        409,
        "ORGANIZATION_SLUG_TAKEN",
      );
    }
    throw error;
  } finally {
    await databaseSession.endSession();
  }
}

export async function listOrganizationsForUser(userId: string) {
  if (!Types.ObjectId.isValid(userId)) return [];
  await connectToDatabase();

  const memberships = await Membership.find({ userId, status: "active" })
    .select("organizationId role")
    .lean();

  const organizationIds = memberships.map((membership) => membership.organizationId);
  const organizations = await Organization.find({ _id: { $in: organizationIds } })
    .select("name slug")
    .lean();
  const byId = new Map(organizations.map((organization) => [String(organization._id), organization]));

  return memberships.flatMap((membership) => {
    const organization = byId.get(String(membership.organizationId));
    return organization
      ? [
          {
            id: String(organization._id),
            name: organization.name,
            slug: organization.slug,
            role: membership.role,
          },
        ]
      : [];
  });
}

export async function verifyActiveMembership(userId: string, organizationId: string) {
  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(organizationId)) {
    throw new AppError("Invalid organization.", 422, "INVALID_ORGANIZATION");
  }

  await connectToDatabase();
  const membership = await Membership.exists({
    organizationId,
    userId,
    status: "active",
  });

  if (!membership) {
    throw new AppError("Organization membership not found.", 403, "FORBIDDEN");
  }
}

export async function getOrganizationSettings(context: AuthorizationContext) {
  await connectToDatabase();
  const organization = await Organization.findById(context.organizationId).lean();
  if (!organization) throw new AppError("Organization not found.", 404, "ORGANIZATION_NOT_FOUND");
  return { name: organization.name, slug: organization.slug, website: organization.website ?? "", industry: organization.industry ?? "", size: organization.size ?? "", logo: organization.logo ?? "", primaryColor: organization.branding.primaryColor, secondaryColor: organization.branding.secondaryColor, privacyContactEmail: organization.privacyContactEmail ?? "", retentionDays: organization.retentionDays ?? 365, assessmentSupportMessage: organization.branding.assessmentSupportMessage ?? "Contact the recruiting team if you need an accommodation or want to challenge an AI-assisted result." };
}

export async function updateOrganizationSettings(context: AuthorizationContext, input: unknown, ipAddress?: string) {
  const data = organizationSettingsSchema.parse(input);
  const organization = await Organization.findOneAndUpdate({ _id: context.organizationId }, { $set: { name: data.name, website: data.website || undefined, industry: data.industry || undefined, size: data.size || undefined, logo: data.logo || undefined, privacyContactEmail: data.privacyContactEmail || undefined, retentionDays: data.retentionDays, "branding.primaryColor": data.primaryColor, "branding.secondaryColor": data.secondaryColor, "branding.assessmentSupportMessage": data.assessmentSupportMessage } }, { new: true, runValidators: true });
  if (!organization) throw new AppError("Organization not found.", 404, "ORGANIZATION_NOT_FOUND");
  await AuditLog.create({ organizationId: context.organizationId, actorId: context.userId, action: "organization.settings_updated", resourceType: "organization", resourceId: organization._id, metadata: { retentionDays: data.retentionDays }, ipAddress });
  return getOrganizationSettings(context);
}
