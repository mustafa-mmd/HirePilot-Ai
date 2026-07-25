import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AssessmentTemplateForm } from "@/modules/assessments/template-form";
import { listQuestions } from "@/modules/assessments/question-service";
import { requireOrganizationContext } from "@/modules/authorization/service";

export default async function NewAssessmentPage() { const context = await requireOrganizationContext("assessments:manage"); const questions = await listQuestions(context); return <div className="mx-auto max-w-5xl space-y-6"><div><p className="font-mono text-xs uppercase tracking-[.2em] text-muted-foreground">Assessment builder</p><h1 className="mt-2 text-3xl font-semibold">New assessment</h1></div><Card><CardHeader><CardTitle>Template settings</CardTitle><CardDescription>Question timers are enforced against server timestamps when attempts are implemented in Phase 5.</CardDescription></CardHeader><CardContent><AssessmentTemplateForm questions={questions} /></CardContent></Card></div>; }
