import { Card, CardContent } from "@/components/ui/card";
import { getPublicAssessmentInstructions } from "@/modules/assessments/invitation-service";
import { OtpVerification } from "@/modules/attempts/otp-verification";

export default async function AssessmentVerificationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getPublicAssessmentInstructions(token);
  return <main className="min-h-screen bg-muted/20 px-4 py-12"><div className="mx-auto max-w-lg space-y-6"><Card><CardContent className="pt-6 text-center"><p className="font-mono text-xs uppercase tracking-[.2em] text-primary">{data.organizationName}</p><h1 className="mt-2 text-2xl font-semibold">{data.assessmentTitle}</h1><p className="mt-2 text-sm text-muted-foreground">Secure candidate verification</p></CardContent></Card><OtpVerification token={token} candidateName={data.candidateName} /></div></main>;
}
