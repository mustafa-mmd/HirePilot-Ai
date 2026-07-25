"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, MonitorUp } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { AssessmentMediaAsset, AssessmentMediaKind } from "@/modules/media/types";
import type { MonitoringLevel } from "@/modules/assessments/constants";

type Signature = { cloudName: string; apiKey: string; timestamp: number; folder: string; publicId: string; signature: string; resourceType: "image" | "video" | "raw" };

export function IntegrityMonitor({ token, sessionId, questionId, monitoringLevel }: { token: string; sessionId: string; questionId: string; monitoringLevel: MonitoringLevel }) {
  const questionRef = useRef(questionId);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeRef = useRef(true);
  const [message, setMessage] = useState("");
  const [screenActive, setScreenActive] = useState(false);
  useEffect(() => { questionRef.current = questionId; }, [questionId]);

  async function log(type: string) {
    await fetch("/api/candidate-assessment/integrity", { method: "POST", headers: { "content-type": "application/json" }, keepalive: true, body: JSON.stringify({ token, sessionId, questionId: questionRef.current, type, clientOccurredAt: new Date().toISOString(), metadata: {} }) }).catch(() => undefined);
  }

  async function upload(blob: Blob, kind: AssessmentMediaKind) {
    const currentQuestion = questionRef.current;
    const signatureResponse = await fetch("/api/candidate-assessment/media/signature", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, sessionId, questionId: currentQuestion, kind }) });
    const envelope = await signatureResponse.json() as { success: boolean; data?: Signature; error?: { message?: string } };
    if (!signatureResponse.ok || !envelope.success || !envelope.data) throw new Error(envelope.error?.message ?? "Monitoring upload could not be authorized.");
    const signature = envelope.data;
    const form = new FormData(); form.append("file", blob); form.append("api_key", signature.apiKey); form.append("timestamp", String(signature.timestamp)); form.append("folder", signature.folder); form.append("public_id", signature.publicId); form.append("signature", signature.signature);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/${signature.resourceType}/upload`, { method: "POST", body: form });
    const result = await response.json() as { secure_url?: string; public_id?: string; resource_type?: "image" | "video" | "raw"; format?: string; bytes?: number; duration?: number; error?: { message?: string } };
    if (!response.ok || !result.secure_url || !result.public_id || !result.resource_type || !result.bytes) throw new Error(result.error?.message ?? "Monitoring media upload failed.");
    const asset: AssessmentMediaAsset = { url: result.secure_url, publicId: result.public_id, resourceType: result.resource_type, format: result.format ?? (kind === "proctor_recording" ? "webm" : "jpg"), bytes: result.bytes, ...(result.duration === undefined ? {} : { duration: result.duration }) };
    await fetch("/api/candidate-assessment/media/complete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, sessionId, questionId: currentQuestion, kind, asset }) });
  }

  async function capture(kind: "identity_photo" | "integrity_snapshot") {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const canvas = document.createElement("canvas"); canvas.width = Math.min(video.videoWidth, 1280); canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.78));
    if (blob) await upload(blob, kind);
  }

  function recordStream(stream: MediaStream, rotate: boolean) {
    const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm" });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => {
      if (chunks.length) void upload(new Blob(chunks, { type: "video/webm" }), "proctor_recording").catch((error) => setMessage(error instanceof Error ? error.message : "Recording upload failed."));
      if (rotate && activeRef.current && stream.active) window.setTimeout(() => recordStream(stream, true), 500);
    };
    recorder.start(1_000);
    if (rotate) window.setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 120_000);
    else stream.getVideoTracks()[0]?.addEventListener("ended", () => { if (recorder.state === "recording") recorder.stop(); setScreenActive(false); }, { once: true });
  }

  useEffect(() => {
    if (monitoringLevel === "standard") return;
    activeRef.current = true;
    let snapshotTimer: number | undefined;
    void navigator.mediaDevices.getUserMedia({ video: true, audio: monitoringLevel === "proctored" }).then(async (stream) => {
      cameraStreamRef.current = stream;
      const video = document.createElement("video"); video.muted = true; video.srcObject = stream; videoRef.current = video; await video.play();
      stream.getVideoTracks().forEach((track) => track.addEventListener("ended", () => void log("camera_disabled")));
      stream.getAudioTracks().forEach((track) => track.addEventListener("ended", () => void log("microphone_disabled")));
      await capture("identity_photo").catch(() => undefined);
      snapshotTimer = window.setInterval(() => void capture("integrity_snapshot").catch(() => undefined), 120_000);
      if (monitoringLevel === "proctored") recordStream(stream, true);
    }).catch(() => { setMessage("Camera monitoring could not start. Keep this page open and restore browser permission."); void log("camera_disabled"); });
    return () => { activeRef.current = false; if (snapshotTimer) window.clearInterval(snapshotTimer); cameraStreamRef.current?.getTracks().forEach((track) => track.stop()); videoRef.current = null; };
  // The active question is read through a ref so monitoring continues across question changes.
  // Monitoring intentionally survives question changes; helpers read the current question from a ref.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitoringLevel, sessionId, token]);

  async function shareScreen() {
    try { const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }); setScreenActive(true); recordStream(stream, false); }
    catch { setMessage("Optional screen sharing was not started."); }
  }

  if (monitoringLevel === "standard") return null;
  return <Alert><Camera /><AlertTitle>{monitoringLevel === "proctored" ? "Proctored recording active" : "Verified camera monitoring active"}</AlertTitle><AlertDescription><div className="flex flex-wrap items-center justify-between gap-3"><span>Authorized reviewers can inspect captured evidence. No automated rejection is performed.</span>{monitoringLevel === "proctored" && <Button type="button" size="sm" variant="outline" disabled={screenActive} onClick={() => void shareScreen()}><MonitorUp />{screenActive ? "Screen sharing active" : "Share screen (optional)"}</Button>}</div>{message && <p className="mt-2 text-destructive">{message}</p>}</AlertDescription></Alert>;
}
