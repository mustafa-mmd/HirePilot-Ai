import { Badge } from "@/components/ui/badge";
import { getPublicAssessmentInstructions } from "@/modules/assessments/invitation-service";
import { SystemCheck } from "@/modules/attempts/system-check";

export default async function AssessmentSetupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getPublicAssessmentInstructions(token);
  return <main className="min-h-screen bg-muted/20 px-4 py-10"><div className="mx-auto max-w-3xl space-y-7"><div><div className="flex flex-wrap items-center gap-3"><Badge className="capitalize">{data.monitoringLevel}</Badge><span className="font-mono text-sm text-muted-foreground">{data.duration} minutes</span></div><h1 className="mt-3 text-3xl font-semibold">System check and consent</h1><p className="mt-2 text-muted-foreground">Complete these checks before the server starts your assessment timer.</p></div><SystemCheck token={token} monitoringLevel={data.monitoringLevel} availableFrom={data.startDeadline} expiresAt={data.expiresAt} serverNow={data.serverNow} /></div></main>;
}
