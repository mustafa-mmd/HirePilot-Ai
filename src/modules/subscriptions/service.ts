import "server-only";

import { connectToDatabase } from "@/lib/database";
import { AppError } from "@/lib/errors";
import { AIUsage } from "@/models/ai-usage.model";
import { AssessmentAttempt } from "@/models/assessment-attempt.model";
import { Job } from "@/models/job.model";
import { Membership } from "@/models/membership.model";
import { Subscription, type SubscriptionPlan } from "@/models/subscription.model";
import { currentBillingPeriod, PLAN_LIMITS } from "@/modules/subscriptions/plans";

export async function getOrCreateSubscription(organizationId: string) {
  await connectToDatabase();
  const period = currentBillingPeriod();
  return Subscription.findOneAndUpdate({ organizationId }, { $setOnInsert: { plan: "starter", status: "trialing", periodStart: period.start, periodEnd: period.end, limits: PLAN_LIMITS.starter } }, { upsert: true, returnDocument: "after", runValidators: true });
}

export async function getSubscriptionUsage(organizationId: string) {
  const subscription = await getOrCreateSubscription(organizationId);
  const now = new Date();
  const period = subscription.periodEnd <= now ? currentBillingPeriod(now) : { start: subscription.periodStart, end: subscription.periodEnd };
  if (subscription.periodEnd <= now) { subscription.periodStart = period.start; subscription.periodEnd = period.end; await subscription.save(); }
  const [members, activeJobs, monthlyAssessments, ai] = await Promise.all([
    Membership.countDocuments({ organizationId, status: "active" }),
    Job.countDocuments({ organizationId, status: { $in: ["draft", "published"] } }),
    AssessmentAttempt.countDocuments({ organizationId, createdAt: { $gte: period.start, $lt: period.end } }),
    AIUsage.aggregate<{ total: number }>([{ $match: { organizationId: subscription.organizationId, createdAt: { $gte: period.start, $lt: period.end } } }, { $group: { _id: null, total: { $sum: "$totalTokens" } } }]),
  ]);
  return { subscription, usage: { members, activeJobs, monthlyAssessments, monthlyAiTokens: ai[0]?.total ?? 0 } };
}

export async function enforcePlanLimit(organizationId: string, resource: "members" | "activeJobs" | "monthlyAssessments" | "monthlyAiTokens") {
  const { subscription, usage } = await getSubscriptionUsage(organizationId);
  if (["past_due", "canceled"].includes(subscription.status)) throw new AppError("The workspace subscription is not active.", 402, "SUBSCRIPTION_INACTIVE");
  if (usage[resource] >= subscription.limits[resource]) throw new AppError(`The ${subscription.plan} plan limit for ${resource} has been reached.`, 402, "PLAN_LIMIT_REACHED", { resource, limit: subscription.limits[resource], usage: usage[resource] });
}

export async function changeSubscriptionPlan(organizationId: string, plan: SubscriptionPlan) {
  const period = currentBillingPeriod();
  const subscription = await Subscription.findOneAndUpdate({ organizationId }, { $set: { plan, status: "active", limits: PLAN_LIMITS[plan] }, $setOnInsert: { periodStart: period.start, periodEnd: period.end } }, { upsert: true, returnDocument: "after", runValidators: true });
  return subscription;
}