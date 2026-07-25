import { AlertTriangle, ExternalLink, FileText, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AnalyzeButton } from "@/modules/ai/analyze-button";
import { getApplicationReport } from "@/modules/ai/report-service";
import { ReviewStatusButton } from "@/modules/ai/review-status-button";
import { requireOrganizationContext } from "@/modules/authorization/service";

function percentage(value: number) {
  return `${Math.round(value * 100)}%`;
}

function ListSection({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <section><h3 className="text-sm font-medium">{title}</h3>{items.length ? <ul className="mt-3 space-y-2 text-sm text-muted-foreground">{items.map((item) => <li className="flex gap-2" key={item}><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />{item}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">{empty}</p>}</section>;
}

export default async function ApplicationReportPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const context = await requireOrganizationContext("candidates:read");
  const report = await getApplicationReport(context, (await params).applicationId);
  const { application, candidate, job, profile, evaluation, usage } = report;

  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="flex justify-end"><Link href={`/dashboard/applications/${application.id}/report`} className={buttonVariants()}>Open complete assessment report</Link></div>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-mono text-xs uppercase tracking-[.2em] text-muted-foreground">Candidate report</p><h1 className="mt-2 text-3xl font-semibold">{candidate.fullName}</h1><p className="mt-2 text-muted-foreground">{job.title} · {candidate.email}</p></div><div className="flex flex-wrap gap-2"><Link href={`/dashboard/jobs/${job.id}/applications`} className={buttonVariants({ variant: "outline" })}>Pipeline</Link><a href={application.cvUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}><FileText />View CV<ExternalLink className="size-3" /></a></div></div>

    <Alert><ShieldCheck /><AlertTitle>Decision support only</AlertTitle><AlertDescription>This report excludes protected characteristics and cannot make the hiring decision. Verify evidence in the original CV and apply consistent human review.</AlertDescription></Alert>

    {!evaluation ? <Card><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="size-5" />AI CV analysis</CardTitle><CardDescription>Extract a structured profile, compare it with this role’s requirements, and produce an evidence-linked report.</CardDescription></CardHeader><CardContent className="space-y-4">{application.processingError ? <Alert variant="destructive"><AlertTriangle /><AlertTitle>Previous analysis failed</AlertTitle><AlertDescription>{application.processingError}</AlertDescription></Alert> : null}<AnalyzeButton applicationId={application.id} isProcessing={application.processingIsActive} /></CardContent></Card> : null}

    {evaluation ? <>
      <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]"><Card><CardHeader><CardDescription>Evidence-based match</CardDescription><CardTitle className="font-mono text-5xl">{evaluation.score}<span className="text-xl text-muted-foreground">/100</span></CardTitle></CardHeader><CardContent className="space-y-4"><div><div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>Confidence</span><span className="font-mono">{percentage(evaluation.confidence)}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: percentage(evaluation.confidence) }} /></div></div><div className="flex flex-wrap gap-2"><Badge variant={evaluation.manualReviewRequired ? "destructive" : "secondary"}>{evaluation.manualReviewRequired ? "Manual review required" : "Standard review"}</Badge><Badge variant="outline">{evaluation.humanReviewStatus}</Badge></div><Separator /><p className="text-xs text-muted-foreground">Evaluated {new Date(evaluation.evaluatedAt).toLocaleString()} · <span className="font-mono">{evaluation.model}</span></p><div className="flex flex-wrap gap-2"><AnalyzeButton applicationId={application.id} isProcessing={application.processingIsActive} /><ReviewStatusButton applicationId={application.id} reviewed={evaluation.humanReviewStatus === "reviewed"} /></div></CardContent></Card><Card><CardHeader><CardTitle>Assessment summary</CardTitle><CardDescription>Generated from job-related CV evidence.</CardDescription></CardHeader><CardContent><p className="leading-7 text-muted-foreground">{evaluation.summary}</p></CardContent></Card></div>

      <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Strengths</CardTitle></CardHeader><CardContent><ListSection title="Supported strengths" items={evaluation.strengths} empty="No strengths were supported by enough evidence." /></CardContent></Card><Card><CardHeader><CardTitle>Missing or unclear</CardTitle></CardHeader><CardContent><ListSection title="Points to verify" items={evaluation.missingPoints} empty="No material gaps were identified." /></CardContent></Card></div>

      <Card><CardHeader><CardTitle>Scoring rubric</CardTitle><CardDescription>Categories with no verifiable CV quote receive zero points.</CardDescription></CardHeader><CardContent className="space-y-6">{evaluation.rubricBreakdown.map((item) => <section key={item.category}><div className="flex items-center justify-between"><div><h3 className="font-medium capitalize">{item.category === "roleFit" ? "Role fit" : item.category}</h3><p className="text-xs text-muted-foreground">Weight {item.weight}%</p></div><span className="font-mono text-lg">{item.score}/{item.maxScore}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: item.maxScore ? `${Math.min(100, (item.score / item.maxScore) * 100)}%` : "0%" }} /></div>{item.evidence.length ? <div className="mt-3 space-y-2">{item.evidence.map((evidence) => <blockquote className="border-l-2 pl-3 text-sm text-muted-foreground" key={`${evidence.criterion}:${evidence.sourceQuote}`}><span className="font-medium text-foreground">{evidence.criterion}:</span> “{evidence.sourceQuote}”</blockquote>)}</div> : <p className="mt-3 text-sm text-muted-foreground">No verifiable evidence; zero points awarded.</p>}</section>)}</CardContent></Card>

      <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Structured profile</CardTitle><CardDescription>{profile?.headline || "Extracted from the CV"}</CardDescription></CardHeader><CardContent className="space-y-5">{profile ? <><p className="text-sm leading-6 text-muted-foreground">{profile.summary}</p><div><h3 className="text-sm font-medium">Skills</h3><div className="mt-3 flex flex-wrap gap-2">{profile.skills.map((skill) => <Badge variant="secondary" key={skill.name}>{skill.name}</Badge>)}</div></div><p className="text-xs text-muted-foreground">Estimated relevant experience: <span className="font-mono text-foreground">{profile.totalExperienceYears} years</span> · Source quality: {profile.sourceQuality}</p></> : <p className="text-sm text-muted-foreground">No structured profile is available.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Recruiter follow-up</CardTitle><CardDescription>Questions target missing or ambiguous job-related evidence.</CardDescription></CardHeader><CardContent><ol className="space-y-3 text-sm text-muted-foreground">{evaluation.suggestedFollowUpQuestions.map((question, index) => <li className="flex gap-3" key={question}><span className="font-mono text-foreground">{index + 1}.</span>{question}</li>)}</ol></CardContent></Card></div>

      <Card><CardHeader><CardTitle>AI usage trace</CardTitle><CardDescription>Stored for cost control and auditability.</CardDescription></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-4"><div><p className="text-xs text-muted-foreground">Input tokens</p><p className="mt-1 font-mono">{usage.inputTokens.toLocaleString()}</p></div><div><p className="text-xs text-muted-foreground">Output tokens</p><p className="mt-1 font-mono">{usage.outputTokens.toLocaleString()}</p></div><div><p className="text-xs text-muted-foreground">Total tokens</p><p className="mt-1 font-mono">{usage.totalTokens.toLocaleString()}</p></div><div><p className="text-xs text-muted-foreground">Estimated cost</p><p className="mt-1 font-mono">${usage.estimatedCostUsd.toFixed(4)}</p></div></div><p className="mt-4 text-xs text-muted-foreground">Prompt <span className="font-mono">{evaluation.promptVersion}</span> · Operations: {usage.operations.join(", ")}</p></CardContent></Card>
    </> : null}
  </div>;
}
