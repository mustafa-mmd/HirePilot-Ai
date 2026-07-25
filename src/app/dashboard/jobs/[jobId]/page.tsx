import { ExternalLink, Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { JobActions } from "@/modules/jobs/job-actions";
import { JobForm } from "@/modules/jobs/job-form";
import { getTenantJob } from "@/modules/jobs/service";

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const context = await requireOrganizationContext("jobs:read");
  const job = await getTenantJob(context, (await params).jobId);
  const editable = { id: job.id, title: job.title, slug: job.slug, description: job.description, department: job.department, location: job.location, workplaceType: job.workplaceType, employmentType: job.employmentType, experienceLevel: job.experienceLevel, requiredSkills: job.requiredSkills.join(", "), preferredSkills: job.preferredSkills.join(", "), educationRequirements: job.educationRequirements.join(", "), scoringWeights: job.scoringWeights, applicationDeadline: job.applicationDeadline?.slice(0, 10) ?? "" };
  return <div className="mx-auto max-w-5xl space-y-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="mb-3 flex items-center gap-2"><Badge className="capitalize" variant={job.status === "published" ? "default" : "secondary"}>{job.status}</Badge><span className="font-mono text-xs text-muted-foreground">/{job.slug}</span></div><h1 className="text-3xl font-semibold">{job.title}</h1><p className="mt-2 text-muted-foreground">{job.department} · {job.location}</p></div><div className="flex flex-wrap gap-2"><Link className={buttonVariants({ variant: "outline" })} href={`/dashboard/jobs/${job.id}/applications`}><Users /> Pipeline</Link>{job.status === "published" ? <Link target="_blank" className={buttonVariants({ variant: "outline" })} href={`/jobs/${context.organizationSlug}/${job.slug}`}><ExternalLink /> Public page</Link> : null}</div></div><Card><CardHeader><CardTitle>Publishing</CardTitle><CardDescription>Publishing makes the role discoverable and opens applications.</CardDescription></CardHeader><CardContent><JobActions jobId={job.id} status={job.status} /></CardContent></Card><Card><CardHeader><CardTitle>Role details</CardTitle><CardDescription>Changes are validated and scoped to {context.organizationName}.</CardDescription></CardHeader><CardContent><JobForm job={editable} /></CardContent></Card></div>;
}
