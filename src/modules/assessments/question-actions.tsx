"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function QuestionActions({ questionId }: { questionId: string }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState<string>();
  async function remove() { setPending(true); setError(undefined); try { const response = await fetch(`/api/questions/${questionId}`, { method: "DELETE" }); const result = await response.json(); if (!response.ok) throw new Error(result.error?.message ?? "The question could not be deleted."); router.push("/dashboard/assessments/questions"); router.refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "The question could not be deleted."); } finally { setPending(false); } }
  return <div className="space-y-3">{error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}<AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" disabled={pending}><Trash2 />Delete question</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this question?</AlertDialogTitle><AlertDialogDescription>The question must first be removed from every assessment template.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>;
}
