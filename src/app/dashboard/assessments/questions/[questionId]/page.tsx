import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuestionForm } from "@/modules/assessments/question-form";
import { QuestionActions } from "@/modules/assessments/question-actions";
import { getQuestion } from "@/modules/assessments/question-service";
import { requireOrganizationContext } from "@/modules/authorization/service";

export default async function QuestionDetailPage({ params }: { params: Promise<{ questionId: string }> }) { const context = await requireOrganizationContext("assessments:manage"); const question = await getQuestion(context, (await params).questionId); return <div className="mx-auto max-w-5xl space-y-6"><div className="flex items-end justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-[.2em] text-muted-foreground">Question bank</p><h1 className="mt-2 text-3xl font-semibold">Edit question</h1></div><QuestionActions questionId={question.id} /></div><Card><CardHeader><CardTitle>{question.title}</CardTitle><CardDescription>Editing is blocked once this question belongs to a published assessment.</CardDescription></CardHeader><CardContent><QuestionForm question={question} /></CardContent></Card></div>; }
