"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function AnalyzeButton({ applicationId, isProcessing }: { applicationId: string; isProcessing: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function analyze() {
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/applications/${applicationId}/analyze`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "The CV could not be analyzed.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The CV could not be analyzed.");
    } finally {
      setPending(false);
    }
  }

  const busy = pending || isProcessing;
  return <div className="space-y-3">{error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}<Button onClick={analyze} disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <Sparkles />}{isProcessing ? "Analysis running" : pending ? "Analyzing CV…" : "Analyze CV"}</Button></div>;
}
