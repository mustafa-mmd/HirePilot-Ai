import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuestionForm } from "@/modules/assessments/question-form";
import { requireOrganizationContext } from "@/modules/authorization/service";

export default async function NewQuestionPage() { await requireOrganizationContext("assessments:manage"); return <div className="mx-auto max-w-5xl space-y-6"><div><p className="font-mono text-xs uppercase tracking-[.2em] text-muted-foreground">Question bank</p><h1 className="mt-2 text-3xl font-semibold">New question</h1></div><Card><CardHeader><CardTitle>Question settings</CardTitle><CardDescription>Correct answers remain recruiter-only and are never exposed in candidate instructions.</CardDescription></CardHeader><CardContent><QuestionForm /></CardContent></Card></div>; }
