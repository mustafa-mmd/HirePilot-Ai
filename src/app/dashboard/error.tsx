"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="mx-auto max-w-3xl py-12"><Alert variant="destructive"><AlertTriangle /><AlertTitle>We could not load this page</AlertTitle><AlertDescription><p>The data may be temporarily unavailable. Your changes have not been discarded.</p><Button className="mt-4" type="button" variant="outline" onClick={reset}><RefreshCw />Try again</Button></AlertDescription></Alert></div>;
}
