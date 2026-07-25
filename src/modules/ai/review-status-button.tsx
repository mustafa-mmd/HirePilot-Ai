"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ReviewStatusButton({ applicationId, reviewed }: { applicationId: string; reviewed: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function markReviewed() {
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/applications/${applicationId}/review`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "The review status could not be saved.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The review status could not be saved.");
    } finally {
      setPending(false);
    }
  }

  return <div className="space-y-2">{error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}<Button variant="outline" onClick={markReviewed} disabled={pending || reviewed}>{pending ? <LoaderCircle className="animate-spin" /> : <Check />}{reviewed ? "Human reviewed" : "Mark reviewed"}</Button></div>;
}
