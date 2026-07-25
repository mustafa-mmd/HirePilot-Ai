import "server-only";

import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/database";
import { AppError, isDuplicateKeyError } from "@/lib/errors";
import { Application } from "@/models/application.model";
import { AuditLog } from "@/models/audit-log.model";
import { Job, type IJob } from "@/models/job.model";
import { Organization } from "@/models/organization.model";
import type { AuthorizationContext } from "@/modules/authorization/service";
import { jobIdSchema, jobInputSchema, jobUpdateSchema, type JobInput } from "@/modules/jobs/schemas";
import { enforcePlanLimit } from "@/modules/subscriptions/service";

type JobSource = IJob & { _id: Types.ObjectId };
export type SerializedJob = Omit<IJob, "organizationId" | "createdBy" | "applicationDeadline" | "publishedAt" | "requirementsExtractedAt" | "createdAt" | "updatedAt"> & { id: string; organizationId: string; createdBy: string; applicationDeadline?: string; publishedAt?: string; requirementsExtractedAt?: string; createdAt: string; updatedAt: string };

function serializeJob(job: JobSource): SerializedJob {
  return { id: String(job._id), organizationId: String(job.organizationId), createdBy: String(job.createdBy), title: job.title, slug: job.slug, description: job.description, department: job.department, location: job.location, workplaceType: job.workplaceType, employmentType: job.employmentType, experienceLevel: job.experienceLevel, requiredSkills: job.requiredSkills, preferredSkills: job.preferredSkills, educationRequirements: job.educationRequirements, scoringWeights: job.scoringWeights, structuredRequirements: job.structuredRequirements, requirementsExtractedAt: job.requirementsExtractedAt?.toISOString(), requirementsPromptVersion: job.requirementsPromptVersion, status: job.status, applicationDeadline: job.applicationDeadline?.toISOString(), publishedAt: job.publishedAt?.toISOString(), createdAt: job.createdAt.toISOString(), updatedAt: job.updatedAt.toISOString() };
}

function regexEscape(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listTenantJobs(context: AuthorizationContext, search = "") {
  await connectToDatabase();
  const filter: Record<string, unknown> = { organizationId: context.organizationId };
  if (search.trim()) filter.title = { $regex: regexEscape(search.trim()), $options: "i" };
  const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  return jobs.map((job) => serializeJob(job as unknown as JobSource));
}

export async function getTenantJob(context: AuthorizationContext, jobId: string) {
  jobIdSchema.parse(jobId);
  await connectToDatabase();
  const job = await Job.findOne({ _id: jobId, organizationId: context.organizationId }).lean();
  if (!job) throw new AppError("Job not found.", 404, "JOB_NOT_FOUND");
  return serializeJob(job as unknown as JobSource);
}

export async function createJob(context: AuthorizationContext, input: JobInput, ipAddress?: string) {
  const data = jobInputSchema.parse(input);
  await connectToDatabase();
  await enforcePlanLimit(context.organizationId, "activeJobs");
  try {
    const job = await Job.create({
      ...data,
      applicationDeadline: data.applicationDeadline ? new Date(data.applicationDeadline) : undefined,
      organizationId: context.organizationId,
      createdBy: context.userId,
      status: "draft",
    });
    await AuditLog.create({ organizationId: context.organizationId, actorId: context.userId, action: "job.created", resourceType: "job", resourceId: job._id, metadata: { title: job.title }, ipAddress });
    return serializeJob(job.toObject() as unknown as JobSource);
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new AppError("That job URL is already in use.", 409, "JOB_SLUG_TAKEN");
    throw error;
  }
}

export async function updateJob(context: AuthorizationContext, jobId: string, input: unknown, ipAddress?: string) {
  jobIdSchema.parse(jobId);
  const data = jobUpdateSchema.parse(input);
  await connectToDatabase();

  const current = await Job.findOne({ _id: jobId, organizationId: context.organizationId });
  if (!current) throw new AppError("Job not found.", 404, "JOB_NOT_FOUND");
  const effectiveDeadline = data.applicationDeadline === null ? undefined : data.applicationDeadline ? new Date(data.applicationDeadline) : current.applicationDeadline;
  if (data.status === "published" && effectiveDeadline && effectiveDeadline <= new Date()) {
    throw new AppError("The application deadline must be in the future.", 422, "INVALID_DEADLINE");
  }

  Object.assign(current, { ...data, applicationDeadline: data.applicationDeadline === null ? undefined : data.applicationDeadline ? new Date(data.applicationDeadline) : current.applicationDeadline });
  if (["title", "description", "requiredSkills", "preferredSkills", "educationRequirements", "experienceLevel"].some((field) => field in data)) {
    current.set("structuredRequirements", undefined);
    current.set("requirementsExtractedAt", undefined);
    current.set("requirementsPromptVersion", undefined);
  }
  if (data.status === "published" && !current.publishedAt) current.publishedAt = new Date();
  try { await current.save(); }
  catch (error) { if (isDuplicateKeyError(error)) throw new AppError("That job URL is already in use.", 409, "JOB_SLUG_TAKEN"); throw error; }
  await AuditLog.create({ organizationId: context.organizationId, actorId: context.userId, action: data.status ? `job.${data.status}` : "job.updated", resourceType: "job", resourceId: current._id, metadata: { fields: Object.keys(data) }, ipAddress });
  return serializeJob(current.toObject() as unknown as JobSource);
}

export async function deleteDraftJob(context: AuthorizationContext, jobId: string, ipAddress?: string) {
  jobIdSchema.parse(jobId);
  await connectToDatabase();
  const job = await Job.findOne({ _id: jobId, organizationId: context.organizationId });
  if (!job) throw new AppError("Job not found.", 404, "JOB_NOT_FOUND");
  if (job.status !== "draft") throw new AppError("Only draft jobs can be deleted.", 409, "JOB_NOT_DRAFT");
  const hasApplications = await Application.exists({ organizationId: context.organizationId, jobId });
  if (hasApplications) throw new AppError("A job with applications cannot be deleted.", 409, "JOB_HAS_APPLICATIONS");
  await job.deleteOne();
  await AuditLog.create({ organizationId: context.organizationId, actorId: context.userId, action: "job.deleted", resourceType: "job", resourceId: job._id, metadata: { title: job.title }, ipAddress });
}

export async function listPublicJobs() {
  await connectToDatabase();
  const now = new Date();
  const jobs = await Job.find({ status: "published", $or: [{ applicationDeadline: null }, { applicationDeadline: { $gt: now } }] }).sort({ publishedAt: -1 }).limit(100).lean();
  const organizationIds = [...new Set(jobs.map((job) => String(job.organizationId)))];
  const organizations = await Organization.find({ _id: { $in: organizationIds } }).select("name slug").lean();
  const byId = new Map(organizations.map((organization) => [String(organization._id), organization]));
  return jobs.flatMap((job) => {
    const organization = byId.get(String(job.organizationId));
    return organization ? [{ id: String(job._id), title: job.title, slug: job.slug, department: job.department, location: job.location, workplaceType: job.workplaceType, employmentType: job.employmentType, experienceLevel: job.experienceLevel, publishedAt: job.publishedAt?.toISOString(), organization: { name: organization.name, slug: organization.slug } }] : [];
  });
}

export async function getPublicJob(organizationSlug: string, jobSlug: string) {
  await connectToDatabase();
  const organization = await Organization.findOne({ slug: organizationSlug }).select("name slug").lean();
  if (!organization) throw new AppError("Job not found.", 404, "JOB_NOT_FOUND");
  const job = await Job.findOne({ organizationId: organization._id, slug: jobSlug, status: "published", $or: [{ applicationDeadline: null }, { applicationDeadline: { $gt: new Date() } }] }).lean();
  if (!job) throw new AppError("Job not found.", 404, "JOB_NOT_FOUND");
  return { ...serializeJob(job as unknown as JobSource), organization: { name: organization.name, slug: organization.slug } };
}

export async function getPublishedJobById(jobId: string) {
  if (!Types.ObjectId.isValid(jobId)) throw new AppError("Job not found.", 404, "JOB_NOT_FOUND");
  await connectToDatabase();
  const job = await Job.findOne({ _id: jobId, status: "published", $or: [{ applicationDeadline: null }, { applicationDeadline: { $gt: new Date() } }] });
  if (!job) throw new AppError("Job not found.", 404, "JOB_NOT_FOUND");
  return job;
}
