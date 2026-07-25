"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AUTO_GRADABLE_QUESTION_TYPES, QUESTION_DIFFICULTIES, QUESTION_TYPES, QUESTION_TYPE_LABELS, type QuestionType } from "@/modules/assessments/constants";
import type { SerializedQuestion } from "@/modules/assessments/question-service";

type OptionEditor = { id: string; label: string };

function newOption(index: number): OptionEditor {
  return { id: `option_${Date.now()}_${index}`, label: "" };
}

export function QuestionForm({ question }: { question?: SerializedQuestion }) {
  const router = useRouter();
  const [type, setType] = useState<QuestionType>(question?.type ?? "single_choice");
  const [title, setTitle] = useState(question?.title ?? "");
  const [description, setDescription] = useState(question?.description ?? "");
  const [category, setCategory] = useState(question?.category ?? "");
  const [difficulty, setDifficulty] = useState(question?.difficulty ?? "medium");
  const [options, setOptions] = useState<OptionEditor[]>(() => question?.options ?? [newOption(1), newOption(2)]);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>(question?.correctAnswers ?? []);
  const [explanation, setExplanation] = useState(question?.explanation ?? "");
  const [points, setPoints] = useState(question?.points ?? 10);
  const [timeLimit, setTimeLimit] = useState(question?.timeLimit ?? 300);
  const [preparationTime, setPreparationTime] = useState(question?.preparationTime ?? 0);
  const [randomizeAnswers, setRandomizeAnswers] = useState(question?.randomizeAnswers ?? false);
  const [criteria, setCriteria] = useState(question?.rubric.criteria.join("\n") ?? "");
  const [guidance, setGuidance] = useState(question?.rubric.guidance ?? "");
  const [required, setRequired] = useState(question?.required ?? true);
  const [manualReviewRequired, setManualReviewRequired] = useState(question?.manualReviewRequired ?? !AUTO_GRADABLE_QUESTION_TYPES.has(type));
  const [language, setLanguage] = useState(question?.codingConfig.language ?? "");
  const [starterCode, setStarterCode] = useState(question?.codingConfig.starterCode ?? "");
  const [allowedLanguages, setAllowedLanguages] = useState(question?.codingConfig.allowedLanguages?.join(", ") ?? "JavaScript, TypeScript, Python");
  const [exampleTests, setExampleTests] = useState(question?.codingConfig.exampleTests?.map((test) => `${test.input} ||| ${test.expectedOutput}`).join("\n") ?? "");
  const [hiddenTests, setHiddenTests] = useState(question?.codingConfig.hiddenTests?.map((test) => `${test.input} ||| ${test.expectedOutput}`).join("\n") ?? "");
  const [runtimeLimitMs, setRuntimeLimitMs] = useState(question?.codingConfig.runtimeLimitMs ?? 3000);
  const [memoryLimitKb, setMemoryLimitKb] = useState(question?.codingConfig.memoryLimitKb ?? 128000);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string>();

  const isChoice = type === "single_choice" || type === "multiple_choice";
  const isTrueFalse = type === "true_false";

  function changeType(nextType: QuestionType) {
    setType(nextType);
    if (nextType === "single_choice" || nextType === "multiple_choice") {
      if (options.length < 2) setOptions([newOption(1), newOption(2)]);
      setCorrectAnswers([]);
    } else if (nextType === "true_false") {
      setOptions([]);
      setCorrectAnswers(["true"]);
    } else {
      setOptions([]);
      setCorrectAnswers([]);
    }
    setManualReviewRequired(!AUTO_GRADABLE_QUESTION_TYPES.has(nextType));
  }

  function toggleCorrect(optionId: string) {
    if (type === "single_choice") setCorrectAnswers([optionId]);
    else setCorrectAnswers((current) => current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setServerError(undefined);
    const parseTests = (value: string) => value.split("\n").map((line) => line.split("|||", 2).map((part) => part.trim())).filter((parts) => parts.length === 2).map(([input, expectedOutput]) => ({ input, expectedOutput }));
    const body = { type, title, description, category, difficulty, options: isChoice ? options : [], correctAnswers, explanation, points, timeLimit, preparationTime, randomizeAnswers: isChoice && randomizeAnswers, rubric: { criteria: criteria.split("\n").map((item) => item.trim()).filter(Boolean), guidance }, required, manualReviewRequired, codingConfig: { language: type === "coding" ? language : "", allowedLanguages: type === "coding" ? allowedLanguages.split(",").map((item) => item.trim()).filter(Boolean) : [], starterCode: type === "coding" ? starterCode : "", exampleTests: type === "coding" ? parseTests(exampleTests) : [], hiddenTests: type === "coding" ? parseTests(hiddenTests) : [], runtimeLimitMs, memoryLimitKb } };
    try {
      const response = await fetch(question ? `/api/questions/${question.id}` : "/api/questions", { method: question ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "The question could not be saved.");
      router.push("/dashboard/assessments/questions");
      router.refresh();
    } catch (error) { setServerError(error instanceof Error ? error.message : "The question could not be saved."); }
    finally { setPending(false); }
  }

  return <form className="space-y-8" onSubmit={submit}>
    {serverError ? <Alert variant="destructive"><AlertDescription>{serverError}</AlertDescription></Alert> : null}
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2"><Label>Question type</Label><Select value={type} onValueChange={(value) => changeType(value as QuestionType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{QUESTION_TYPES.map((value) => <SelectItem key={value} value={value}>{QUESTION_TYPE_LABELS[value]}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Difficulty</Label><Select value={difficulty} onValueChange={(value) => setDifficulty(value as typeof difficulty)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{QUESTION_DIFFICULTIES.map((value) => <SelectItem className="capitalize" key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="question-title">Internal title</Label><Input id="question-title" value={title} onChange={(event) => setTitle(event.target.value)} required /></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="question-description">Candidate prompt</Label><Textarea id="question-description" rows={7} value={description} onChange={(event) => setDescription(event.target.value)} required /></div>
      <div className="space-y-2"><Label htmlFor="question-category">Category</Label><Input id="question-category" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Frontend engineering" required /></div>
      <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="question-points">Points</Label><Input id="question-points" type="number" min={1} max={1000} value={points} onChange={(event) => setPoints(Number(event.target.value))} /></div><div className="space-y-2"><Label htmlFor="question-time">Time (seconds)</Label><Input id="question-time" type="number" min={30} max={7200} value={timeLimit} onChange={(event) => setTimeLimit(Number(event.target.value))} /></div></div>
      <div className="space-y-2"><Label htmlFor="preparation-time">Preparation time (seconds)</Label><Input id="preparation-time" type="number" min={0} max={1800} value={preparationTime} onChange={(event) => setPreparationTime(Number(event.target.value))} /></div>
    </div>

    {isChoice ? <fieldset className="space-y-4"><div className="flex items-center justify-between"><div><legend className="font-medium">Answer options</legend><p className="text-sm text-muted-foreground">Check the correct answer or answers.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setOptions((current) => [...current, newOption(current.length + 1)])}><Plus />Add option</Button></div>{options.map((option, index) => <div className="flex items-center gap-3" key={option.id}><Checkbox checked={correctAnswers.includes(option.id)} onCheckedChange={() => toggleCorrect(option.id)} aria-label={`Mark option ${index + 1} correct`} /><Input value={option.label} onChange={(event) => setOptions((current) => current.map((item) => item.id === option.id ? { ...item, label: event.target.value } : item))} placeholder={`Option ${index + 1}`} /><Button type="button" variant="ghost" size="icon" onClick={() => { setOptions((current) => current.filter((item) => item.id !== option.id)); setCorrectAnswers((current) => current.filter((id) => id !== option.id)); }} aria-label={`Remove option ${index + 1}`}><Trash2 /></Button></div>)}<label className="flex items-center gap-3 text-sm"><Checkbox checked={randomizeAnswers} onCheckedChange={(checked) => setRandomizeAnswers(checked === true)} />Randomize answer order for each attempt</label></fieldset> : null}

    {isTrueFalse ? <div className="max-w-sm space-y-2"><Label>Correct answer</Label><Select value={correctAnswers[0] ?? "true"} onValueChange={(value) => setCorrectAnswers([value])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">True</SelectItem><SelectItem value="false">False</SelectItem></SelectContent></Select></div> : null}

    {type === "coding" ? <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="coding-language">Default language</Label><Input id="coding-language" value={language} onChange={(event) => setLanguage(event.target.value)} placeholder="TypeScript" /></div><div className="space-y-2"><Label htmlFor="allowed-languages">Allowed languages</Label><Input id="allowed-languages" value={allowedLanguages} onChange={(event) => setAllowedLanguages(event.target.value)} placeholder="JavaScript, TypeScript, Python" /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="starter-code">Starter code</Label><Textarea className="font-mono" id="starter-code" rows={10} value={starterCode} onChange={(event) => setStarterCode(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="example-tests">Example tests</Label><Textarea className="font-mono" id="example-tests" rows={5} value={exampleTests} onChange={(event) => setExampleTests(event.target.value)} placeholder="input ||| expected output" /></div><div className="space-y-2"><Label htmlFor="hidden-tests">Hidden tests</Label><Textarea className="font-mono" id="hidden-tests" rows={5} value={hiddenTests} onChange={(event) => setHiddenTests(event.target.value)} placeholder="input ||| expected output" /></div><div className="space-y-2"><Label htmlFor="runtime-limit">Runtime limit (ms)</Label><Input id="runtime-limit" type="number" min={250} max={15000} value={runtimeLimitMs} onChange={(event) => setRuntimeLimitMs(Number(event.target.value))} /></div><div className="space-y-2"><Label htmlFor="memory-limit">Memory limit (KB)</Label><Input id="memory-limit" type="number" min={16000} max={512000} value={memoryLimitKb} onChange={(event) => setMemoryLimitKb(Number(event.target.value))} /></div></div> : null}

    <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="rubric-criteria">Rubric criteria</Label><Textarea id="rubric-criteria" rows={6} value={criteria} onChange={(event) => setCriteria(event.target.value)} placeholder="One criterion per line" /></div><div className="space-y-2"><Label htmlFor="rubric-guidance">Evaluation guidance</Label><Textarea id="rubric-guidance" rows={6} value={guidance} onChange={(event) => setGuidance(event.target.value)} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="answer-explanation">Correct-answer explanation</Label><Textarea id="answer-explanation" rows={4} value={explanation} onChange={(event) => setExplanation(event.target.value)} /></div></div>
    <div className="flex flex-wrap gap-6"><label className="flex items-center gap-3 text-sm"><Checkbox checked={required} onCheckedChange={(checked) => setRequired(checked === true)} />Required question</label><label className="flex items-center gap-3 text-sm"><Checkbox checked={manualReviewRequired} onCheckedChange={(checked) => setManualReviewRequired(checked === true)} />Manual review required</label></div>
    <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button><Button disabled={pending}>{pending ? "Saving…" : question ? "Save question" : "Create question"}</Button></div>
  </form>;
}
