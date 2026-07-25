import "server-only";
import { Types } from "mongoose";
import { AppError } from "@/lib/errors";
import { connectToDatabase } from "@/lib/database";
import { AIUsage } from "@/models/ai-usage.model";
import { Application } from "@/models/application.model";
import { AssessmentAttempt } from "@/models/assessment-attempt.model";
import { AuditLog } from "@/models/audit-log.model";
import { Membership } from "@/models/membership.model";
import { Organization } from "@/models/organization.model";
import { Subscription, type SubscriptionPlan } from "@/models/subscription.model";
import { User } from "@/models/user.model";
import { changeSubscriptionPlan, getOrCreateSubscription } from "@/modules/subscriptions/service";
import { createOrganization } from "@/modules/organizations/service";

export async function getPlatformOverview() {
  await connectToDatabase();
  const [organizations, users, applications, attempts, usage] = await Promise.all([
    Organization.find().sort({ createdAt: -1 }).limit(500).lean(),
    User.countDocuments(),
    Application.countDocuments(),
    AssessmentAttempt.countDocuments(),
    AIUsage.aggregate<{ tokens: number; cost: number }>([
      { $group: { _id: null, tokens: { $sum: "$totalTokens" }, cost: { $sum: "$estimatedCostUsd" } } }
    ])
  ]);
  const subscriptions = await Subscription.find({ organizationId: { $in: organizations.map((organization) => organization._id) } }).lean();
  const members = await Membership.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { organizationId: { $in: organizations.map((organization) => organization._id) }, status: "active" } },
    { $group: { _id: "$organizationId", count: { $sum: 1 } } }
  ]);
  const subscriptionByOrg = new Map(subscriptions.map((subscription) => [String(subscription.organizationId), subscription]));
  const memberByOrg = new Map(members.map((item) => [String(item._id), item.count]));
  return {
    summary: {
      organizations: organizations.length,
      users,
      applications,
      attempts,
      aiTokens: usage[0]?.tokens ?? 0,
      estimatedAiCost: usage[0]?.cost ?? 0
    },
    organizations: organizations.map((organization) => ({
      id: String(organization._id),
      name: organization.name,
      slug: organization.slug,
      ownerId: String(organization.ownerId),
      plan: subscriptionByOrg.get(String(organization._id))?.plan ?? "starter",
      status: subscriptionByOrg.get(String(organization._id))?.status ?? "trialing",
      members: memberByOrg.get(String(organization._id)) ?? 0,
      createdAt: organization.createdAt.toISOString()
    }))
  };
}

export async function getPaginatedOrganizations(search?: string, plan?: string) {
  await connectToDatabase();
  const query: any = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { slug: { $regex: search, $options: "i" } },
    ];
  }
  const organizations = await Organization.find(query).sort({ createdAt: -1 }).lean();
  const orgIds = organizations.map((o) => o._id);
  const subscriptions = await Subscription.find({ organizationId: { $in: orgIds } }).lean();
  const members = await Membership.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { organizationId: { $in: orgIds }, status: "active" } },
    { $group: { _id: "$organizationId", count: { $sum: 1 } } }
  ]);

  const subscriptionMap = new Map(subscriptions.map((s) => [String(s.organizationId), s]));
  const memberMap = new Map(members.map((m) => [String(m._id), m.count]));

  let list = organizations.map((o) => {
    const sub = subscriptionMap.get(String(o._id));
    return {
      id: String(o._id),
      name: o.name,
      slug: o.slug,
      ownerId: String(o.ownerId),
      plan: sub?.plan ?? "starter",
      status: sub?.status ?? "trialing",
      members: memberMap.get(String(o._id)) ?? 0,
      createdAt: o.createdAt.toISOString(),
    };
  });

  if (plan) {
    list = list.filter((item) => item.plan === plan);
  }

  return list;
}

export async function adminRegisterOrganization(
  adminUserId: string,
  name: string,
  slug: string,
  ownerEmail: string,
  ipAddress?: string
) {
  await connectToDatabase();
  let user = await User.findOne({ email: ownerEmail.toLowerCase().trim() });
  if (!user) {
    user = await User.create({
      name: ownerEmail.split("@")[0],
      email: ownerEmail.toLowerCase().trim(),
      globalRole: "user",
    });
  }

  const result = await createOrganization(user.id, { name, slug }, ipAddress);
  return result;
}

export async function updateOrganizationStatus(
  adminUserId: string,
  organizationId: string,
  status: "active" | "canceled" | "past_due" | "trialing",
  ipAddress?: string
) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(organizationId)) {
    throw new AppError("Organization not found.", 404, "ORGANIZATION_NOT_FOUND");
  }
  const sub = await Subscription.findOneAndUpdate(
    { organizationId: new Types.ObjectId(organizationId) },
    { $set: { status } },
    { new: true, upsert: true }
  );

  await AuditLog.create({
    organizationId: new Types.ObjectId(organizationId),
    actorId: new Types.ObjectId(adminUserId),
    action: "platform.subscription_status_changed",
    resourceType: "subscription",
    resourceId: sub._id,
    metadata: { status },
    ipAddress,
  });

  return { organizationId, status: sub.status };
}

export async function updateOrganizationPlan(
  adminUserId: string,
  organizationId: string,
  plan: SubscriptionPlan,
  ipAddress?: string
) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(organizationId)) throw new AppError("Organization not found.", 404, "ORGANIZATION_NOT_FOUND");
  const organization = await Organization.findById(organizationId);
  if (!organization) throw new AppError("Organization not found.", 404, "ORGANIZATION_NOT_FOUND");
  await getOrCreateSubscription(organizationId);
  const subscription = await changeSubscriptionPlan(organizationId, plan);
  organization.subscriptionId = subscription._id;
  await organization.save();
  await AuditLog.create({
    organizationId: organization._id,
    actorId: new Types.ObjectId(adminUserId),
    action: "platform.subscription_plan_changed",
    resourceType: "subscription",
    resourceId: subscription._id,
    metadata: { plan },
    ipAddress
  });
  return { organizationId, plan: subscription.plan, status: subscription.status };
}

export async function getPaginatedUsers(search?: string, role?: string) {
  await connectToDatabase();
  const query: any = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }
  if (role) {
    query.globalRole = role;
  }
  const users = await User.find(query).sort({ createdAt: -1 }).lean();
  const userIds = users.map((u) => u._id);
  const memberships = await Membership.find({ userId: { $in: userIds } })
    .populate("organizationId", "name slug")
    .lean();

  const membershipsByUser = new Map<string, any[]>();
  memberships.forEach((m: any) => {
    const key = String(m.userId);
    if (!membershipsByUser.has(key)) membershipsByUser.set(key, []);
    if (m.organizationId) {
      membershipsByUser.get(key)!.push({
        orgName: m.organizationId.name,
        orgSlug: m.organizationId.slug,
        role: m.role,
        status: m.status,
      });
    }
  });

  return users.map((u) => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    image: u.image,
    globalRole: u.globalRole,
    createdAt: u.createdAt.toISOString(),
    memberships: membershipsByUser.get(String(u._id)) ?? [],
  }));
}

export async function updateUserGlobalRole(
  adminUserId: string,
  targetUserId: string,
  role: "user" | "platform_admin",
  ipAddress?: string
) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(targetUserId)) throw new AppError("User not found.", 404, "USER_NOT_FOUND");
  const user = await User.findByIdAndUpdate(targetUserId, { $set: { globalRole: role } }, { new: true });
  if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND");

  const membership = await Membership.findOne({ userId: user._id });
  const organizationId = membership?.organizationId ?? (await Organization.findOne())?._id;

  if (organizationId) {
    await AuditLog.create({
      organizationId,
      actorId: new Types.ObjectId(adminUserId),
      action: "platform.user_role_changed",
      resourceType: "user",
      resourceId: user._id,
      metadata: { email: user.email, globalRole: role },
      ipAddress,
    });
  }

  return { userId: String(user._id), globalRole: user.globalRole };
}

export async function getDetailedAIUsage() {
  await connectToDatabase();
  const [byOrg, byOp, byModel, daily] = await Promise.all([
    AIUsage.aggregate([
      {
        $group: {
          _id: "$organizationId",
          tokens: { $sum: "$totalTokens" },
          cost: { $sum: "$estimatedCostUsd" },
          requests: { $sum: 1 },
        }
      },
      { $sort: { cost: -1 } }
    ]),
    AIUsage.aggregate([
      {
        $group: {
          _id: "$operation",
          tokens: { $sum: "$totalTokens" },
          cost: { $sum: "$estimatedCostUsd" },
          requests: { $sum: 1 },
        }
      },
      { $sort: { cost: -1 } }
    ]),
    AIUsage.aggregate([
      {
        $group: {
          _id: "$model",
          tokens: { $sum: "$totalTokens" },
          cost: { $sum: "$estimatedCostUsd" },
          requests: { $sum: 1 },
        }
      },
      { $sort: { cost: -1 } }
    ]),
    AIUsage.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          tokens: { $sum: "$totalTokens" },
          cost: { $sum: "$estimatedCostUsd" },
          requests: { $sum: 1 },
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ])
  ]);

  const orgIds = byOrg.map((item) => item._id);
  const orgs = await Organization.find({ _id: { $in: orgIds } }).select("name slug").lean();
  const orgMap = new Map(orgs.map((o) => [String(o._id), o]));

  const orgBreakdown = byOrg.map((item) => {
    const org = orgMap.get(String(item._id));
    return {
      orgId: String(item._id),
      name: org?.name ?? "Unknown Organization",
      slug: org?.slug ?? "unknown",
      tokens: item.tokens,
      cost: item.cost,
      requests: item.requests,
    };
  });

  return {
    byOrg: orgBreakdown,
    byOp: byOp.map((item) => ({ operation: item._id, tokens: item.tokens, cost: item.cost, requests: item.requests })),
    byModel: byModel.map((item) => ({ model: item._id, tokens: item.tokens, cost: item.cost, requests: item.requests })),
    daily: daily.map((item) => ({ date: item._id, tokens: item.tokens, cost: item.cost, requests: item.requests })),
  };
}

export async function getPaginatedAuditLogs(page: number = 1, organizationId?: string) {
  await connectToDatabase();
  const query: any = {};
  if (organizationId && Types.ObjectId.isValid(organizationId)) {
    query.organizationId = new Types.ObjectId(organizationId);
  }

  const limit = 50;
  const skip = (page - 1) * limit;

  const logs = await AuditLog.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("actorId", "name email")
    .populate("organizationId", "name slug")
    .lean();

  return logs.map((log: any) => ({
    id: String(log._id),
    organization: log.organizationId ? {
      name: log.organizationId.name,
      slug: log.organizationId.slug,
    } : null,
    actor: log.actorId ? {
      name: log.actorId.name,
      email: log.actorId.email,
    } : { name: "System", email: "system@hirepilot.ai" },
    action: log.action,
    resourceType: log.resourceType,
    resourceId: String(log.resourceId),
    metadata: log.metadata,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt.toISOString(),
  }));
}
