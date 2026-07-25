"use client";

import { Archive, LoaderCircle, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { TemplateStatus } from "@/modules/assessments/constants";

export function AssessmentTemplateActions({ templateId, status }: { templateId: string; status: TemplateStatus }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState<string>();
  async function mutate(method: "PATCH" | "DELETE", nextStatus?: TemplateStatus) { setPending(true); setError(undefined); try { const response = await fetch(`/api/assessment-templates/${templateId}`, { method, headers: nextStatus ? { "content-type": "application/json" } : undefined, body: nextStatus ? JSON.stringify({ status: nextStatus }) : undefined }); const result = await response.json(); if (!response.ok) throw new Error(result.error?.message ?? "The assessment could not be updated."); if (method === "DELETE") router.push("/dashboard/assessments"); router.refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "The assessment could not be updated."); } finally { setPending(false); } }
  return <div className="space-y-3">{error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}<div className="flex flex-wrap gap-2">{status === "draft" ? <Button disabled={pending} onClick={() => mutate("PATCH", "published")}>{pending ? <LoaderCircle className="animate-spin" /> : <Send />}Publish assessment</Button> : null}{status === "published" ? <Button variant="outline" disabled={pending} onClick={() => mutate("PATCH", "archived")}><Archive />Archive</Button> : null}{status === "draft" ? <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" disabled={pending}><Trash2 />Delete draft</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this assessment?</AlertDialogTitle><AlertDialogDescription>This cannot be undone. Questions in the bank are not deleted.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => mutate("DELETE")}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog> : null}</div></div>;
}
