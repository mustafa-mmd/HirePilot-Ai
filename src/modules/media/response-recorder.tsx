"use client";

import { useEffect, useRef, useState } from "react";
import { CircleStop, FileUp, Mic, Video } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AssessmentMediaAsset, AssessmentMediaKind } from "@/modules/media/types";

type Signature = { cloudName: string; apiKey: string; timestamp: number; folder: string; publicId: string; signature: string; resourceType: "image" | "video" | "raw" };
type UploadedMedia = { kind: AssessmentMediaKind; asset: AssessmentMediaAsset };

export function ResponseRecorder({ type, token, sessionId, questionId, disabled, existingUrl, onUploaded }: { type: "video" | "audio" | "file_upload"; token: string; sessionId: string; questionId: string; disabled: boolean; existingUrl?: string; onUploaded: (media: UploadedMedia) => void }) {
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState(existingUrl ?? "");
  const [error, setError] = useState("");
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  async function upload(file: Blob & { name?: string }, kind: AssessmentMediaKind) {
    setUploading(true); setError("");
    try {
      const signatureResponse = await fetch("/api/candidate-assessment/media/signature", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, sessionId, questionId, kind }) });
      const signatureEnvelope = await signatureResponse.json() as { success: boolean; data?: Signature; error?: { message?: string } };
      if (!signatureResponse.ok || !signatureEnvelope.success || !signatureEnvelope.data) throw new Error(signatureEnvelope.error?.message ?? "Upload authorization failed.");
      const signature = signatureEnvelope.data;
      const body = new FormData(); body.append("file", file); body.append("api_key", signature.apiKey); body.append("timestamp", String(signature.timestamp)); body.append("folder", signature.folder); body.append("public_id", signature.publicId); body.append("signature", signature.signature);
      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/${signature.resourceType}/upload`, { method: "POST", body });
      const uploaded = await uploadResponse.json() as { secure_url?: string; public_id?: string; resource_type?: "image" | "video" | "raw"; format?: string; bytes?: number; duration?: number; error?: { message?: string } };
      if (!uploadResponse.ok || !uploaded.secure_url || !uploaded.public_id || !uploaded.resource_type || !uploaded.bytes) throw new Error(uploaded.error?.message ?? "Cloud upload failed.");
      const fallbackFormat = file.name?.split(".").pop()?.toLowerCase() ?? (type === "file_upload" ? "" : "webm");
      const media = { kind, asset: { url: uploaded.secure_url, publicId: uploaded.public_id, resourceType: uploaded.resource_type, format: uploaded.format ?? fallbackFormat, bytes: uploaded.bytes, ...(uploaded.duration === undefined ? {} : { duration: uploaded.duration }) } };
      setUrl(uploaded.secure_url); onUploaded(media);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Upload failed."); }
    finally { setUploading(false); }
  }

  async function startRecording() {
    setError("");
    try {
      const video = type === "video";
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
      streamRef.current = stream; chunksRef.current = [];
      const preferredMime = video ? (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm") : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: preferredMime });
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => { const blob = new Blob(chunksRef.current, { type: video ? "video/webm" : "audio/webm" }); stream.getTracks().forEach((track) => track.stop()); streamRef.current = null; void upload(blob, video ? "video_answer" : "audio_answer"); };
      recorder.start(1_000); setRecording(true);
    } catch { setError("Camera or microphone access was not available."); }
  }

  function stopRecording() { recorderRef.current?.stop(); setRecording(false); }

  if (type === "file_upload") return <div className="space-y-3"><Label htmlFor={`file-${questionId}`}>Upload your response file</Label><Input id={`file-${questionId}`} type="file" disabled={disabled || uploading} accept=".pdf,.doc,.docx,.txt,.csv,.zip,.png,.jpg,.jpeg" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, "file_answer"); }} />{uploading && <p className="text-sm text-muted-foreground">Uploading and verifying...</p>}{url && <a className="text-sm text-primary underline" href={url} target="_blank" rel="noreferrer"><FileUp className="mr-1 inline size-4" />Uploaded file</a>}{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}</div>;

  return <div className="space-y-4"><div className="flex gap-3">{recording ? <Button type="button" variant="destructive" onClick={stopRecording}><CircleStop />Stop recording</Button> : <Button type="button" variant="outline" disabled={disabled || uploading} onClick={() => void startRecording()}>{type === "video" ? <Video /> : <Mic />}{url ? "Record again" : `Record ${type}`}</Button>}<span className="self-center text-sm text-muted-foreground">{uploading ? "Uploading securely..." : recording ? "Recording in progress" : url ? "Recording uploaded" : "Not recorded"}</span></div>{url && (type === "video" ? <video className="max-h-80 w-full rounded-lg bg-black" controls src={url} /> : <audio className="w-full" controls src={url} />)}{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}</div>;
}
