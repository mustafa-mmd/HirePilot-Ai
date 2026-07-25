import { BriefcaseBusiness, Clock3, MapPin } from "lucide-react";
import { notFound } from "next/navigation";

import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppError } from "@/lib/errors";
import { ApplicationForm } from "@/modules/applications/application-form";
import { getPublicJob } from "@/modules/jobs/service";

export default async function PublicJobPage({ params }: { params: Promise<{ organizationSlug: string; jobSlug: string }> }) {
  const route = await params; let job;
  try { job = await getPublicJob(route.organizationSlug, route.jobSlug); } catch (error) { if (error instanceof AppError && error.statusCode === 404) notFound(); throw error; }
  return <main className="min-h-screen"><header className="border-b"><div className="mx-auto flex h-16 max-w-6xl items-center px-6"><Brand /></div></header><div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1fr_420px]"><article><p className="text-sm text-muted-foreground">{job.organization.name}</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">{job.title}</h1><div className="mt-5 flex flex-wrap gap-3 text-sm text-muted-foreground"><span className="flex items-center gap-1.5"><MapPin className="size-4" />{job.location}</span><span className="flex items-center gap-1.5"><BriefcaseBusiness className="size-4" />{job.department}</span><span className="flex items-center gap-1.5 capitalize"><Clock3 className="size-4" />{job.employmentType.replace("_", " ")}</span></div><div className="mt-6 flex flex-wrap gap-2"><Badge className="capitalize">{job.workplaceType}</Badge><Badge variant="secondary" className="capitalize">{job.experienceLevel}</Badge>{job.requiredSkills.map((skill) => <Badge variant="outline" key={skill}>{skill}</Badge>)}</div><div className="mt-10 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{job.description}</div></article><aside><Card className="sticky top-6"><CardHeader><CardTitle>Apply for this role</CardTitle><CardDescription>Your CV is uploaded securely and visible only to authorized members of {job.organization.name}.</CardDescription></CardHeader><CardContent><ApplicationForm jobId={job.id} /></CardContent></Card></aside></div></main>;
}
