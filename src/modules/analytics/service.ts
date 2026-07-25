import "server-only";

import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/database";
import { Application } from "@/models/application.model";
import { AssessmentAttempt } from "@/models/assessment-attempt.model";
import { IntegrityEvent } from "@/models/integrity-event.model";
import { Job } from "@/models/job.model";
import type { AuthorizationContext } from "@/modules/authorization/service";

export async function getOrganizationAnalytics(context: AuthorizationContext) {
  await connectToDatabase();
  const organizationId = new Types.ObjectId(context.organizationId);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60_000);
  const [jobs, stages, trend, attempts, integrity] = await Promise.all([
    Job.aggregate<{ _id: string; count: number }>([{ $match: { organizationId } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Application.aggregate<{ _id: string; count: number }>([{ $match: { organizationId } }, { $group: { _id: "$stage", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Application.aggregate<{ _id: string; count: number }>([{ $match: { organizationId, appliedAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$appliedAt" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    AssessmentAttempt.aggregate<{ _id: string; count: number; averagePercentage: number }>([{ $match: { organizationId } }, { $project: { status: 1, percentage: { $cond: [{ $gt: ["$maximumScore", 0] }, { $multiply: [{ $divide: [{ $ifNull: ["$totalScore", 0] }, "$maximumScore"] }, 100] }, 0] } } }, { $group: { _id: "$status", count: { $sum: 1 }, averagePercentage: { $avg: "$percentage" } } }]),
    IntegrityEvent.aggregate<{ _id: string; count: number }>([{ $match: { organizationId, occurredAt: { $gte: since } } }, { $group: { _id: "$type", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 12 }]),
  ]);
  const totalApplications = stages.reduce((sum, item) => sum + item.count, 0);
  const completed = attempts.find((item) => item._id === "completed");
  return { summary: { activeJobs: jobs.filter((item) => ["draft", "published"].includes(item._id)).reduce((sum, item) => sum + item.count, 0), publishedJobs: jobs.find((item) => item._id === "published")?.count ?? 0, totalApplications, completedAssessments: completed?.count ?? 0, averageAssessmentScore: completed?.averagePercentage ?? 0, hires: stages.find((item) => item._id === "hired")?.count ?? 0 }, stages: stages.map((item) => ({ stage: item._id, count: item.count })), trend: trend.map((item) => ({ date: item._id, applications: item.count })), attempts: attempts.map((item) => ({ status: item._id, count: item.count, averageScore: item.averagePercentage })), integrity: integrity.map((item) => ({ type: item._id, count: item.count })) };
}
