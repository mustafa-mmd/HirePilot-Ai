import "server-only";

import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/database";
import { Application } from "@/models/application.model";
import { Candidate } from "@/models/candidate.model";
import type { AuthorizationContext } from "@/modules/authorization/service";

function regexEscape(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

export async function listCandidates(context: AuthorizationContext, search = "") {
  await connectToDatabase();
  const filter: Record<string, unknown> = { organizationId: context.organizationId };
  if (search.trim()) {
    const expression = { $regex: regexEscape(search.trim()), $options: "i" };
    filter.$or = [{ fullName: expression }, { email: expression }];
  }
  const candidates = await Candidate.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  const ids = candidates.map((candidate) => candidate._id);
  const applications = await Application.aggregate<{ _id: Types.ObjectId; count: number; latestStage: string }>([
    { $match: { organizationId: new Types.ObjectId(context.organizationId), candidateId: { $in: ids } } },
    { $sort: { appliedAt: -1 } },
    { $group: { _id: "$candidateId", count: { $sum: 1 }, latestStage: { $first: "$stage" } } },
  ]);
  const byId = new Map(applications.map((entry) => [String(entry._id), entry]));
  return candidates.map((candidate) => ({ id: String(candidate._id), fullName: candidate.fullName, email: candidate.email, location: candidate.location ?? "—", createdAt: candidate.createdAt.toISOString(), applicationCount: byId.get(String(candidate._id))?.count ?? 0, latestStage: byId.get(String(candidate._id))?.latestStage ?? "—" }));
}
