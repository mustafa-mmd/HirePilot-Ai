import { ArrowRight, BriefcaseBusiness, Plus, Search } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { listTenantJobs } from "@/modules/jobs/service";

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const context = await requireOrganizationContext("jobs:read");
  const { search = "" } = await searchParams;
  const jobs = await listTenantJobs(context, search);
  return <div className="mx-auto max-w-6xl space-y-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-xs uppercase tracking-[.2em] text-muted-foreground">Recruiting</p><h1 className="mt-2 text-3xl font-semibold">Jobs</h1><p className="mt-2 text-muted-foreground">Create roles, publish career pages, and review each pipeline.</p></div><Link href="/dashboard/jobs/new" className={buttonVariants()}><Plus /> New job</Link></div><form className="relative max-w-sm"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input name="search" defaultValue={search} className="pl-9" placeholder="Search jobs" /></form><Card><CardContent className="p-0">{jobs.length === 0 ? <div className="grid place-items-center p-16 text-center"><BriefcaseBusiness className="mb-4 size-8 text-muted-foreground" /><h2 className="font-medium">No jobs found</h2><p className="mt-2 max-w-sm text-sm text-muted-foreground">Create your first draft or adjust the search query.</p></div> : <Table><TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Workplace</TableHead><TableHead>Updated</TableHead><TableHead /></TableRow></TableHeader><TableBody>{jobs.map((job) => <TableRow key={job.id}><TableCell><p className="font-medium">{job.title}</p><p className="text-xs text-muted-foreground">{job.department} · {job.location}</p></TableCell><TableCell><Badge variant={job.status === "published" ? "default" : "secondary"} className="capitalize">{job.status}</Badge></TableCell><TableCell className="capitalize">{job.workplaceType}</TableCell><TableCell className="font-mono text-xs text-muted-foreground">{new Date(job.updatedAt).toLocaleDateString()}</TableCell><TableCell><Link href={`/dashboard/jobs/${job.id}`} className="inline-flex items-center gap-1 text-sm hover:underline">Open <ArrowRight className="size-3.5" /></Link></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card></div>;
}
