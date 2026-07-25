import { notFound } from "next/navigation";

import { Brand } from "@/components/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppError } from "@/lib/errors";
import { ApplicationForm } from "@/modules/applications/application-form";
import { getPublishedJobById } from "@/modules/jobs/service";

export default async function ApplyPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params; let job;
  try { job = await getPublishedJobById(jobId); } catch (error) { if (error instanceof AppError && error.statusCode === 404) notFound(); throw error; }
  return <main className="min-h-screen"><header className="border-b"><div className="mx-auto flex h-16 max-w-2xl items-center px-6"><Brand /></div></header><div className="mx-auto max-w-2xl px-6 py-12"><p className="text-sm text-muted-foreground">Application</p><h1 className="mt-2 text-3xl font-semibold">{job.title}</h1><Card className="mt-8"><CardHeader><CardTitle>Your information</CardTitle><CardDescription>Complete the form and attach your CV. Final hiring decisions remain with the recruiting team.</CardDescription></CardHeader><CardContent><ApplicationForm jobId={jobId} /></CardContent></Card></div></main>;
}
