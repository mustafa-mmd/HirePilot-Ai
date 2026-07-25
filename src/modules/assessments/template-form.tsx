"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MONITORING_LEVELS, type MonitoringLevel } from "@/modules/assessments/constants";
import type { SerializedQuestion } from "@/modules/assessments/question-service";
import type { SerializedAssessmentTemplate } from "@/modules/assessments/template-service";

export function AssessmentTemplateForm({ questions, template }: { questions: SerializedQuestion[]; template?: SerializedAssessmentTemplate }) {
  const router = useRouter();
  const [title, setTitle] = useState(template?.title ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [instructions, setInstructions] = useState(template?.instructions ?? "Read every question carefully. Use only your own work and submit before the timer expires.");
  const [monitoringLevel, setMonitoringLevel] = useState<MonitoringLevel>(template?.monitoringLevel ?? "standard");
  const [totalDuration, setTotalDuration] = useState(template?.totalDuration ?? 30);
  const [selected, setSelected] = useState<string[]>(template?.questionIds ?? []);
  const [randomizeQuestionOrder, setRandomizeQuestionOrder] = useState(template?.randomizationSettings.randomizeQuestionOrder ?? false);
  const [questionLimit, setQuestionLimit] = useState<number | null>(template?.randomizationSettings.questionLimit ?? null);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string>();
  const totals = useMemo(() => questions.filter((question) => selected.includes(question.id)).reduce((result, question) => ({ points: result.points + question.points, seconds: result.seconds + question.timeLimit }), { points: 0, seconds: 0 }), [questions, selected]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setServerError(undefined);
    try {
      const response = await fetch(template ? `/api/assessment-templates/${template.id}` : "/api/assessment-templates", { method: template ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, description, instructions, monitoringLevel, totalDuration, questionIds: selected, randomizationSettings: { randomizeQuestionOrder, questionLimit: randomizeQuestionOrder ? questionLimit : null } }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error?.message ?? "The assessment could not be saved.");
      router.push(`/dashboard/assessments/${result.data.id}`); router.refresh();
    } catch (error) { setServerError(error instanceof Error ? error.message : "The assessment could not be saved."); }
    finally { setPending(false); }
  }

  return <form className="space-y-8" onSubmit={submit}>{serverError ? <Alert variant="destructive"><AlertDescription>{serverError}</AlertDescription></Alert> : null}<div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label htmlFor="assessment-title">Title</Label><Input id="assessment-title" value={title} onChange={(event) => setTitle(event.target.value)} required /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="assessment-description">Description</Label><Textarea id="assessment-description" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} required /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="assessment-instructions">Candidate instructions</Label><Textarea id="assessment-instructions" rows={7} value={instructions} onChange={(event) => setInstructions(event.target.value)} required /></div><div className="space-y-2"><Label>Monitoring level</Label><Select value={monitoringLevel} onValueChange={(value) => setMonitoringLevel(value as MonitoringLevel)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MONITORING_LEVELS.map((value) => <SelectItem className="capitalize" key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="assessment-duration">Total duration (minutes)</Label><Input id="assessment-duration" type="number" min={5} max={480} value={totalDuration} onChange={(event) => setTotalDuration(Number(event.target.value))} /></div></div>
    <fieldset className="space-y-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><legend className="font-medium">Selected questions</legend><p className="text-sm text-muted-foreground">{selected.length} questions · {totals.points} points · {Math.ceil(totals.seconds / 60)} timed minutes</p></div><Badge variant="outline">Template duration {totalDuration} min</Badge></div>{questions.length ? <div className="divide-y rounded-lg border">{questions.map((question) => <label className="flex cursor-pointer items-start gap-3 p-4 hover:bg-muted/30" key={question.id}><Checkbox checked={selected.includes(question.id)} onCheckedChange={(checked) => setSelected((current) => checked === true ? [...current, question.id] : current.filter((id) => id !== question.id))} /><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{question.title}</span><span className="mt-1 block text-xs text-muted-foreground">{question.typeLabel} · {question.category} · {question.points} points · {Math.ceil(question.timeLimit / 60)} min</span></span></label>)}</div> : <Alert><AlertDescription>Create at least one question in the question bank before building an assessment.</AlertDescription></Alert>}</fieldset>
    <div className="space-y-4"><label className="flex items-center gap-3 text-sm"><Checkbox checked={randomizeQuestionOrder} onCheckedChange={(checked) => setRandomizeQuestionOrder(checked === true)} />Randomize question order for each attempt</label>{randomizeQuestionOrder ? <div className="max-w-xs space-y-2"><Label htmlFor="question-limit">Random question limit</Label><Input id="question-limit" type="number" min={1} max={selected.length || 1} value={questionLimit ?? ""} onChange={(event) => setQuestionLimit(event.target.value ? Number(event.target.value) : null)} placeholder="Use every selected question" /></div> : null}</div>
    <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button><Button disabled={pending || !questions.length}>{pending ? "Saving…" : template ? "Save assessment" : "Create draft"}</Button></div></form>;
}
