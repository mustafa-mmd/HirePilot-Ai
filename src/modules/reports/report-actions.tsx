"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

async function mutate(url: string, method: string, body?: unknown) {
  const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json() as { success: boolean; error?: { message?: string } };
  if (!response.ok || !result.success) throw new Error(result.error?.message ?? "The action could not be completed.");
}

export function EvaluateAssessmentButton({ attemptId, status }: { attemptId: string; status: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <div>{error && <Alert className="mb-3" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}<Button disabled={busy} onClick={() => { setBusy(true); setError(""); void mutate(`/api/assessment-attempts/${attemptId}/evaluate`, "POST").then(() => router.refresh()).catch((caught) => setError(caught instanceof Error ? caught.message : "Evaluation failed.")).finally(() => setBusy(false)); }}>{busy ? "Evaluating evidence..." : status === "completed" ? "Re-evaluate assessment" : "Evaluate assessment"}</Button></div>;
}

export function ScoreOverrideForm({ answerId, maximumScore, currentScore }: { answerId: string; maximumScore: number; currentScore: number }) {
  const router = useRouter(); const [score, setScore] = useState(currentScore); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function save() { setBusy(true); setError(""); try { await mutate(`/api/answers/${answerId}/override`, "PATCH", { score, reason }); setReason(""); router.refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Override failed."); } finally { setBusy(false); } }
  const reasonLength = reason.trim().length;
  return <div className="space-y-3 rounded-lg border bg-muted/20 p-4">{error && <p className="text-sm text-destructive">{error}</p>}<div className="grid gap-3 sm:grid-cols-[140px_1fr_auto]"><div className="space-y-1"><Label htmlFor={`score-${answerId}`}>Human score</Label><Input id={`score-${answerId}`} type="number" min={0} max={maximumScore} step="0.01" value={score} onChange={(event) => setScore(Number(event.target.value))} /></div><div className="space-y-1"><Label htmlFor={`reason-${answerId}`}>Required explanation</Label><Input id={`reason-${answerId}`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain the evidence behind this override" />{reasonLength > 0 && reasonLength < 10 && <p className="text-xs text-muted-foreground">{10 - reasonLength} more characters needed</p>}</div><Button className="self-end" variant="outline" disabled={busy || reasonLength < 10} onClick={() => void save()}>{busy ? "Saving..." : "Override"}</Button></div></div>;
}

export function RecruiterDecisionPanel({ applicationId }: { applicationId: string }) {
  const router = useRouter(); const [note, setNote] = useState(""); const [decision, setDecision] = useState<"shortlisted" | "interview" | "offer" | "hired" | "rejected">("shortlisted"); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function saveNote() { setBusy(true); setError(""); try { await mutate(`/api/applications/${applicationId}/notes`, "POST", { text: note }); setNote(""); router.refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Note could not be saved."); } finally { setBusy(false); } }
  async function saveDecision() { setBusy(true); setError(""); try { await mutate(`/api/applications/${applicationId}/decision`, "PATCH", { decision, reason }); setReason(""); router.refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Decision could not be saved."); } finally { setBusy(false); } }
  const reasonLength = reason.trim().length;
  return <div className="space-y-6">{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}<div className="space-y-2"><Label htmlFor="recruiter-note">Add recruiter note</Label><Textarea id="recruiter-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Record job-related observations for the hiring team" /><Button variant="outline" disabled={busy || note.trim().length < 2} onClick={() => void saveNote()}>Save note</Button></div><div className="space-y-3 border-t pt-5"><div className="grid gap-3 sm:grid-cols-[180px_1fr]"><div className="space-y-2"><Label>Human decision</Label><Select value={decision} onValueChange={(value) => setDecision(value as typeof decision)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["shortlisted", "interview", "offer", "hired", "rejected"].map((value) => <SelectItem className="capitalize" key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="decision-reason">Decision rationale</Label><Textarea id="decision-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain the consistent, job-related basis for this human decision" />{reasonLength > 0 && reasonLength < 10 && <p className="text-xs text-muted-foreground">{10 - reasonLength} more characters needed</p>}</div></div><Button disabled={busy || reasonLength < 10} onClick={() => void saveDecision()}>Record human decision</Button></div></div>;
}