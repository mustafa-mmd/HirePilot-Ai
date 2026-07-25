import { ArrowRight, BriefcaseBusiness, MapPin } from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { listPublicJobs } from "@/modules/jobs/service";

export const dynamic = "force-dynamic";

export default async function PublicJobsPage() {
  const jobs = await listPublicJobs();
  return <main className="min-h-screen"><header className="border-b"><div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6"><Brand /><Link className="text-sm text-muted-foreground hover:text-foreground" href="/login">Recruiter sign in</Link></div></header><div className="mx-auto max-w-5xl px-6 py-16"><p className="font-mono text-xs uppercase tracking-[.2em] text-muted-foreground">Open opportunities</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Find your next role</h1><p className="mt-3 max-w-xl text-muted-foreground">Apply directly to organizations using structured, human-led recruiting workflows.</p><div className="mt-10 space-y-3">{jobs.length === 0 ? <Card><CardContent className="grid place-items-center p-16 text-center"><BriefcaseBusiness className="mb-4 size-8 text-muted-foreground" /><h2 className="font-medium">No open roles right now</h2><p className="mt-2 text-sm text-muted-foreground">Check back soon for new opportunities.</p></CardContent></Card> : jobs.map((job) => <Link key={job.id} href={`/jobs/${job.organization.slug}/${job.slug}`} className="flex items-center gap-4 rounded-xl border bg-card p-5 transition-colors hover:bg-accent"><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">{job.organization.name}</p><h2 className="mt-1 truncate font-medium">{job.title}</h2><p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{job.location} · {job.department}</p></div><Badge variant="secondary" className="capitalize">{job.workplaceType}</Badge><ArrowRight className="size-4 text-muted-foreground" /></Link>)}</div></div></main>;
}
