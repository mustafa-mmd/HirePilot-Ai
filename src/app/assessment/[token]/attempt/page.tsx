import { AttemptRunner } from "@/modules/attempts/attempt-runner";

export default async function AssessmentAttemptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <main className="min-h-screen bg-muted/20 px-4 py-6 sm:py-10"><div className="mx-auto max-w-4xl"><AttemptRunner token={token} /></div></main>;
}
