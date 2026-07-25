"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function JobActions({ jobId, status }: { jobId: string; status: string }) {
  const router = useRouter(); const [error, setError] = useState<string>(); const [busy, setBusy] = useState(false);
  async function update(nextStatus: string) { setBusy(true); setError(undefined); const response = await fetch(`/api/jobs/${jobId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: nextStatus }) }); const result = await response.json(); if (!response.ok) setError(result.error?.message ?? "Could not update the job."); else router.refresh(); setBusy(false); }
  async function remove() { setBusy(true); const response = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" }); const result = await response.json(); if (!response.ok) { setError(result.error?.message ?? "Could not delete the job."); setBusy(false); } else router.push("/dashboard/jobs"); }
  return <div>{error ? <Alert className="mb-3" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}<div className="flex flex-wrap gap-2">{status === "draft" ? <><Button disabled={busy} onClick={() => update("published")}>Publish job</Button><AlertDialog><AlertDialogTrigger asChild><Button disabled={busy} variant="destructive">Delete draft</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this draft?</AlertDialogTitle><AlertDialogDescription>This permanently removes the draft. Jobs with applications cannot be deleted.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove}>Delete draft</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></> : null}{status === "published" ? <Button disabled={busy} variant="outline" onClick={() => update("closed")}>Close applications</Button> : null}{status === "closed" ? <Button disabled={busy} variant="outline" onClick={() => update("published")}>Reopen</Button> : null}</div></div>;
}
