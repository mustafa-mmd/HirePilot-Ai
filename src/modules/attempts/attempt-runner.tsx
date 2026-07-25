"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Cloud, ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CodingEditor } from "@/modules/coding/coding-editor";
import { ResponseRecorder } from "@/modules/media/response-recorder";
import { IntegrityMonitor } from "@/modules/media/integrity-monitor";
import type { AssessmentMediaAsset, AssessmentMediaKind } from "@/modules/media/types";
import type { MonitoringLevel, QuestionType } from "@/modules/assessments/constants";

type Question = { id: string; type: QuestionType; title: string; description: string; category: string; difficulty: string; points: number; preparationTime: number; timeLimit: number; required: boolean; options: Array<{ id: string; label: string }>; codingConfig: { language: string; allowedLanguages: string[]; starterCode: string; exampleTests: Array<{ input: string; expectedOutput: string }>; runtimeLimitMs: number; memoryLimitKb: number }; startedAt: string; preparationEndsAt: string; expiresAt: string };
type Session = { state: "ready" | "in_progress" | "completed" | "expired"; attemptId?: string; serverNow?: string; attemptExpiresAt?: string; monitoringLevel?: MonitoringLevel; progress?: { current: number; total: number }; question?: Question; answer?: { selectedOptions: string[]; text: string; coding?: { language?: string; sourceCode?: string }; media?: { url?: string }; status: string }; totalScore?: number; maximumScore?: number };
type Envelope = { success: boolean; data?: Session; error?: { message?: string } };

function storageKey(token: string) { return `hirepilot-assessment-session:${token.slice(0, 16)}`; }
function formatTime(seconds: number) { const safe = Math.max(0, seconds); return `${Math.floor(safe / 60).toString().padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`; }

export function AttemptRunner({ token }: { token: string }) {
  const router = useRouter();
  const [sessionId] = useState(() => typeof window === "undefined" ? "" : (localStorage.getItem(storageKey(token)) ?? ""));
  const [session, setSession] = useState<Session | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [sourceCode, setSourceCode] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [media, setMedia] = useState<{ kind: AssessmentMediaKind; asset: AssessmentMediaAsset } | undefined>();
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [clockOffset, setClockOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const currentQuestionRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!sessionId) router.replace(`/assessment/${token}/setup`);
  }, [router, sessionId, token]);

  const applySession = useCallback((next: Session) => {
    setSession(next);
    if (next.serverNow) setClockOffset(Date.parse(next.serverNow) - Date.now());
    currentQuestionRef.current = next.question?.id;
    setSelectedOptions(next.answer?.selectedOptions ?? []);
    setText(next.answer?.text ?? "");
    setSourceCode(next.answer?.coding?.sourceCode ?? next.question?.codingConfig.starterCode ?? "");
    setSelectedLanguage(next.answer?.coding?.language ?? next.question?.codingConfig.language ?? "");
    setMedia(undefined);
    setDirty(false);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const controller = new AbortController();
    void fetch(`/api/candidate-assessment/attempt?token=${encodeURIComponent(token)}&sessionId=${encodeURIComponent(sessionId)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { const result = await response.json() as Envelope; if (!response.ok || !result.success || !result.data) throw new Error(result.error?.message ?? "Unable to recover the attempt."); return result.data; })
      .then((data) => { if (data.state === "ready") router.replace(`/assessment/${token}/setup`); else applySession(data); })
      .catch((caught) => { if (caught instanceof Error && caught.name !== "AbortError") setError(caught.message); });
    return () => controller.abort();
  }, [applySession, router, sessionId, token]);

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1_000); return () => window.clearInterval(timer); }, []);

  const record = useCallback((type: string, metadata: Record<string, string | number | boolean | null> = {}) => {
    if (!sessionId || !session || session.state !== "in_progress") return;
    void fetch("/api/candidate-assessment/integrity", { method: "POST", headers: { "content-type": "application/json" }, keepalive: true, body: JSON.stringify({ token, sessionId, type, questionId: currentQuestionRef.current, clientOccurredAt: new Date().toISOString(), metadata }) });
  }, [session, sessionId, token]);

  useEffect(() => {
    const copy = () => record("copy_attempted");
    const paste = () => record("paste_attempted");
    const visibility = () => { if (document.hidden) record("tab_hidden"); };
    const fullscreen = () => { if (!document.fullscreenElement) record("fullscreen_exited"); };
    const offline = () => record("connection_lost");
    const online = () => record("connection_restored");
    document.addEventListener("copy", copy); document.addEventListener("paste", paste); document.addEventListener("visibilitychange", visibility); document.addEventListener("fullscreenchange", fullscreen);
    window.addEventListener("offline", offline); window.addEventListener("online", online);
    return () => { document.removeEventListener("copy", copy); document.removeEventListener("paste", paste); document.removeEventListener("visibilitychange", visibility); document.removeEventListener("fullscreenchange", fullscreen); window.removeEventListener("offline", offline); window.removeEventListener("online", online); };
  }, [record]);

  const persist = useCallback(async (submit: boolean) => {
    if (!sessionId || !session?.question || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/candidate-assessment/answer", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, sessionId, questionId: session.question.id, selectedOptions, text, coding: session.question.type === "coding" ? { language: selectedLanguage, sourceCode } : undefined, media, submit }) });
      const result = await response.json() as Envelope;
      if (!response.ok || !result.success || !result.data) throw new Error(result.error?.message ?? "Your answer could not be saved.");
      applySession(result.data);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Your answer could not be saved."); }
    finally { setBusy(false); }
  }, [applySession, busy, media, selectedLanguage, selectedOptions, session, sessionId, sourceCode, text, token]);

  useEffect(() => { if (!dirty || busy) return; const timer = window.setTimeout(() => void persist(false), 1_200); return () => window.clearTimeout(timer); }, [busy, dirty, persist]);

  const adjustedNow = now + clockOffset;
  const preparationRemaining = session?.question ? Math.max(0, Math.ceil((Date.parse(session.question.preparationEndsAt) - adjustedNow) / 1_000)) : 0;
  const questionRemaining = session?.question ? Math.max(0, Math.ceil((Date.parse(session.question.expiresAt) - adjustedNow) / 1_000)) : 0;
  const attemptRemaining = session?.attemptExpiresAt ? Math.max(0, Math.ceil((Date.parse(session.attemptExpiresAt) - adjustedNow) / 1_000)) : 0;
  useEffect(() => { if (session?.state !== "in_progress" || !session.question || questionRemaining !== 0 || busy) return; const timer = window.setTimeout(() => void persist(true), 0); return () => window.clearTimeout(timer); }, [busy, persist, questionRemaining, session]);

  if (error && !session) return <Alert variant="destructive"><ShieldAlert /><AlertTitle>Assessment unavailable</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  if (!session) return <Card><CardContent className="flex items-center gap-3 py-10 text-muted-foreground"><Cloud className="size-5 animate-pulse" />Recovering your secure attempt...</CardContent></Card>;
  if (session.state === "completed") return <Card><CardHeader><CheckCircle2 className="size-10 text-primary" /><CardTitle>Assessment submitted</CardTitle><CardDescription>Your responses are ready for human review. The recruiting team will contact you about next steps.</CardDescription></CardHeader></Card>;
  if (session.state === "expired") return <Alert variant="destructive"><Clock3 /><AlertTitle>Attempt expired</AlertTitle><AlertDescription>The server closed this attempt when its allotted time ended. Contact the recruiting team if you experienced an exceptional issue.</AlertDescription></Alert>;
  if (!session.question || !session.progress) return null;

  const question = session.question;
  const toggle = (id: string) => { setDirty(true); setSelectedOptions((current) => question.type === "multiple_choice" ? (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]) : [id]); };
  const answerControl = ["single_choice", "multiple_choice", "true_false"].includes(question.type)
    ? <div className="space-y-3">{question.options.map((option) => question.type === "multiple_choice" ? <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 hover:bg-accent"><Checkbox checked={selectedOptions.includes(option.id)} onCheckedChange={() => toggle(option.id)} disabled={preparationRemaining > 0 || busy} /><span>{option.label}</span></label> : <Button key={option.id} type="button" variant={selectedOptions.includes(option.id) ? "default" : "outline"} className="h-auto w-full justify-start whitespace-normal p-4 text-left" disabled={preparationRemaining > 0 || busy} onClick={() => toggle(option.id)}>{option.label}</Button>)}</div>
    : question.type === "coding"
      ? <CodingEditor token={token} sessionId={sessionId} questionId={question.id} languages={question.codingConfig.allowedLanguages.length ? question.codingConfig.allowedLanguages : [question.codingConfig.language]} language={selectedLanguage || question.codingConfig.language} sourceCode={sourceCode} disabled={preparationRemaining > 0 || busy} exampleTests={question.codingConfig.exampleTests} onLanguageChange={(value) => { setSelectedLanguage(value); setDirty(true); }} onSourceChange={(value) => { setSourceCode(value); setDirty(true); }} />
      : ["video", "audio", "file_upload"].includes(question.type)
        ? <ResponseRecorder type={question.type as "video" | "audio" | "file_upload"} token={token} sessionId={sessionId} questionId={question.id} disabled={preparationRemaining > 0 || busy} existingUrl={session.answer?.media?.url} onUploaded={(value) => { setMedia(value); setDirty(true); }} />
      : <div className="space-y-2"><Label htmlFor="written-answer">Your response</Label><Textarea id="written-answer" className="min-h-56" value={text} disabled={preparationRemaining > 0 || busy} onChange={(event) => { setText(event.target.value); setDirty(true); }} /></div>;
  const responseControl = <><IntegrityMonitor token={token} sessionId={sessionId} questionId={question.id} monitoringLevel={session.monitoringLevel ?? "standard"} />{answerControl}</>;

  return <div className="space-y-6">{error && <Alert variant="destructive"><AlertTitle>Save problem</AlertTitle><AlertDescription>{error} Your answer remains in this browser; retry before the timer ends.</AlertDescription></Alert>}<div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-muted-foreground">Question {session.progress.current} of {session.progress.total}</p><progress className="mt-2 h-2 w-64 accent-primary" value={session.progress.current} max={session.progress.total} /></div><div className="flex gap-3"><Badge variant={questionRemaining < 60 ? "destructive" : "outline"} className="font-mono">Question {formatTime(questionRemaining)}</Badge><Badge variant="outline" className="font-mono">Total {formatTime(attemptRemaining)}</Badge></div></div>{preparationRemaining > 0 && <Alert><Clock3 /><AlertTitle>Preparation time: {formatTime(preparationRemaining)}</AlertTitle><AlertDescription>Review the prompt. Response controls unlock when preparation time ends.</AlertDescription></Alert>}<Card><CardHeader><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{question.category}</Badge><Badge variant="outline" className="capitalize">{question.difficulty}</Badge><Badge variant="outline">{question.points} points</Badge>{question.required && <Badge>Required</Badge>}</div><CardTitle className="pt-3">{question.title}</CardTitle><CardDescription className="whitespace-pre-wrap text-sm leading-6">{question.description}</CardDescription></CardHeader><CardContent className={cn("space-y-6", preparationRemaining > 0 && "opacity-70")}>{responseControl}<div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">{busy ? "Saving securely..." : dirty ? "Unsaved changes" : "Saved"}</p><Button disabled={busy || preparationRemaining > 0} onClick={() => void persist(true)}>{session.progress.current === session.progress.total ? "Submit final answer" : "Submit and continue"}</Button></div></CardContent></Card></div>;
}
