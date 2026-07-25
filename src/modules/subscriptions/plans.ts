import type { SubscriptionPlan } from "@/models/subscription.model";

export const PLAN_LIMITS: Record<SubscriptionPlan, { members: number; activeJobs: number; monthlyAssessments: number; monthlyAiTokens: number }> = {
  starter: { members: 3, activeJobs: 3, monthlyAssessments: 25, monthlyAiTokens: 250_000 },
  growth: { members: 15, activeJobs: 25, monthlyAssessments: 500, monthlyAiTokens: 5_000_000 },
  business: { members: 250, activeJobs: 500, monthlyAssessments: 20_000, monthlyAiTokens: 100_000_000 },
};

export function currentBillingPeriod(now = new Date()) {
  return { start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)) };
}
