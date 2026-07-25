import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { JobForm } from "@/modules/jobs/job-form";

export default async function NewJobPage() {
  await requireOrganizationContext("jobs:manage");
  return <div className="mx-auto max-w-4xl space-y-6"><div><p className="font-mono text-xs uppercase tracking-[.2em] text-muted-foreground">New requisition</p><h1 className="mt-2 text-3xl font-semibold">Create a job</h1></div><Card><CardHeader><CardTitle>Role details</CardTitle><CardDescription>The job begins as a private draft. Publish it when the details are ready.</CardDescription></CardHeader><CardContent><JobForm /></CardContent></Card></div>;
}
