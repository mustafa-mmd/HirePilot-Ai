"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, Mic, Network } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { MonitoringLevel } from "@/modules/assessments/constants";

function sessionStorageKey(token: string) { return `hirepilot-assessment-session:${token.slice(0, 16)}`; }

export function SystemCheck({ token, monitoringLevel }: { token: string; monitoringLevel: MonitoringLevel }) {
  const router = useRouter();
  const needsMedia = monitoringLevel !== "standard";
  const needsRecording = monitoringLevel === "proctored";
  const [checks, setChecks] = useState({ camera: !needsMedia, microphone: !needsMedia, network: true });
  const [privacy, setPrivacy] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [recording, setRecording] = useState(!needsRecording);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function checkMedia() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setChecks({ camera: stream.getVideoTracks().length > 0, microphone: stream.getAudioTracks().length > 0, network: navigator.onLine });
      stream.getTracks().forEach((track) => track.stop());
    } catch { setError("Camera and microphone access was not granted. Check browser permissions and retry."); }
  }

  async function start() {
    setBusy(true); setError("");
    try {
      const key = sessionStorageKey(token);
      const sessionId = localStorage.getItem(key) ?? crypto.randomUUID();
      localStorage.setItem(key, sessionId);
      const response = await fetch("/api/candidate-assessment/attempt", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, sessionId, systemCheck: checks, consent: { privacy, monitoring, mediaRecording: recording } }) });
      const result = await response.json() as { success: boolean; error?: { message?: string } };
      if (!response.ok || !result.success) throw new Error(result.error?.message ?? "The attempt could not be started.");
      if (document.fullscreenEnabled) await document.documentElement.requestFullscreen().catch(() => undefined);
      router.push(`/assessment/${token}/attempt`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The attempt could not be started."); }
    finally { setBusy(false); }
  }

  const ready = checks.camera && checks.microphone && checks.network && privacy && monitoring && recording;
  return <div className="space-y-6">{error && <Alert variant="destructive"><AlertTitle>Setup incomplete</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}<div className="grid gap-4 sm:grid-cols-3">{[[Camera, "Camera", checks.camera], [Mic, "Microphone", checks.microphone], [Network, "Network", checks.network]].map(([Icon, label, passed]) => { const Component = Icon as typeof Camera; return <Card key={String(label)}><CardContent className="flex items-center gap-3 pt-6"><Component className="size-5 text-primary" /><div><p className="font-medium">{String(label)}</p><p className="text-xs text-muted-foreground">{passed ? "Ready" : "Check required"}</p></div>{passed && <CheckCircle2 className="ml-auto size-4 text-primary" />}</CardContent></Card>; })}</div>{needsMedia && <Button variant="outline" className="w-full" onClick={() => void checkMedia()}>Test camera and microphone</Button>}<Card><CardHeader><CardTitle>Privacy and assessment rules</CardTitle><CardDescription>Integrity signals are evidence for human review and never automatically reject you.</CardDescription></CardHeader><CardContent className="space-y-5 text-sm"><label className="flex items-start gap-3"><Checkbox checked={privacy} onCheckedChange={(value) => setPrivacy(value === true)} /><span>I understand what is collected, why it is collected, who may access it, and that I can request accommodation or challenge an AI-assisted result.</span></label><label className="flex items-start gap-3"><Checkbox checked={monitoring} onCheckedChange={(value) => setMonitoring(value === true)} /><span>I consent to {monitoringLevel} integrity monitoring, including timing, focus, clipboard, fullscreen, and connection events.</span></label>{needsRecording && <label className="flex items-start gap-3"><Checkbox checked={recording} onCheckedChange={(value) => setRecording(value === true)} /><span>I consent to camera and microphone recording for authorized human review under the organization&apos;s retention policy.</span></label>}<div><Label>Fairness notice</Label><p className="mt-1 text-muted-foreground">HirePilot does not evaluate age, gender, race, religion, disability, appearance, accent, facial expression, background, emotion, or inferred personality.</p></div><Button className="w-full" disabled={!ready || busy} onClick={() => void start()}>{busy ? "Starting securely..." : "Start timed assessment"}</Button></CardContent></Card></div>;
}
