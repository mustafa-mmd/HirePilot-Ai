import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { listJobApplications } from "@/modules/applications/service";
import { PipelineBoard } from "@/modules/applications/pipeline-board";

export default async function JobApplicationsPage({ params }: { params: Promise<{ jobId: string }> }) {
  const context = await requireOrganizationContext("candidates:read"); const data = await listJobApplications(context, (await params).jobId);
  return <div className="space-y-6"><div className="flex items-end justify-between"><div><p className="font-mono text-xs uppercase tracking-[.2em] text-muted-foreground">Application pipeline</p><h1 className="mt-2 text-3xl font-semibold">{data.job.title}</h1><p className="mt-2 text-muted-foreground">Drag a card one stage forward or backward. Every move is validated and audited on the server.</p></div><Link href={`/dashboard/jobs/${data.job.id}`} className={buttonVariants({ variant: "outline" })}>Job details</Link></div>{data.applications.length === 0 ? <div className="rounded-xl border border-dashed p-16 text-center"><h2 className="font-medium">No applications yet</h2><p className="mt-2 text-sm text-muted-foreground">Share the public job page to start receiving candidates.</p></div> : <PipelineBoard initialApplications={data.applications} />}</div>;
}
