import {
  CheckCircle2,
  Clock3,
  Eye,
  FileQuestion,
  ShieldCheck,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AssessmentAvailabilityAction } from "@/modules/assessments/assessment-availability-action";
import { InstructionOpenedTracker } from "@/modules/assessments/instruction-opened-tracker";
import { getPublicAssessmentInstructions } from "@/modules/assessments/invitation-service";

export default async function AssessmentInstructionsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getPublicAssessmentInstructions(token);
  const displayStatus =
    data.windowState === "scheduled" ? "scheduled" : data.status;

  return (
    <main className="min-h-screen bg-muted/20 px-4 py-10 sm:py-16">
      <InstructionOpenedTracker token={token} />
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-[.2em] text-primary">
            {data.organizationName}
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
            {data.assessmentTitle}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {data.jobTitle} · Prepared for {data.candidateName}
          </p>
        </div>

        <Alert>
          <ShieldCheck />
          <AlertTitle>Review before starting</AlertTitle>
          <AlertDescription>
            Opening this page does not start the timer. The server only permits
            a new attempt during the configured assessment window.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <Clock3 className="size-5 text-primary" />
              <p className="mt-3 font-mono text-2xl">{data.duration}</p>
              <p className="text-xs text-muted-foreground">Minutes total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <FileQuestion className="size-5 text-primary" />
              <p className="mt-3 font-mono text-2xl">{data.questionCount}</p>
              <p className="text-xs text-muted-foreground">Questions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Eye className="size-5 text-primary" />
              <p className="mt-3 text-lg font-medium capitalize">
                {data.monitoringLevel}
              </p>
              <p className="text-xs text-muted-foreground">
                Monitoring level
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Candidate instructions</CardTitle>
              <Badge className="capitalize" variant="outline">
                {displayStatus}
              </Badge>
            </div>
            <CardDescription>{data.assessmentDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {data.instructions}
            </div>
            <div className="grid gap-3 border-t pt-5 text-sm sm:grid-cols-3">
              <p>
                <span className="block text-xs text-muted-foreground">
                  Available from
                </span>
                <span className="font-mono">
                  {new Date(data.startDeadline).toLocaleString()}
                </span>
              </p>
              <p>
                <span className="block text-xs text-muted-foreground">
                  Available until
                </span>
                <span className="font-mono">
                  {new Date(data.expiresAt).toLocaleString()}
                </span>
              </p>
              <p>
                <span className="block text-xs text-muted-foreground">
                  Maximum attempts
                </span>
                <span className="font-mono">{data.submittedAttempts} of {data.maximumAttempts} submitted</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Before you begin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                "Use a stable internet connection and a supported desktop browser.",
                "Begin only after the opening time and submit before the closing time.",
                "Review the monitoring and privacy notice before granting permissions.",
                "Complete the work independently and do not share this secure link.",
              ].map((item) => (
                <li className="flex gap-3" key={item}>
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <AssessmentAvailabilityAction
              token={token}
              status={data.status}
              availableFrom={data.startDeadline}
              expiresAt={data.expiresAt}
              serverNow={data.serverNow}
              submittedAttempts={data.submittedAttempts}
              maximumAttempts={data.maximumAttempts}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
