"use client";

import { AlertTriangle } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return <Card className="mx-auto max-w-xl"><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="size-5 text-destructive" />Unable to load the workspace</CardTitle></CardHeader><CardContent><p className="mb-5 text-sm text-muted-foreground">The server could not verify your workspace context. Check the database connection and try again.</p><Button onClick={reset}>Try again</Button></CardContent></Card>;
}
