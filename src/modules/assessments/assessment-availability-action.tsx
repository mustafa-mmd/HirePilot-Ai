"use client";

import { CalendarClock, Clock3 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getAssessmentInvitationWindowState } from "@/modules/assessments/invitation-window";

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function AssessmentAvailabilityAction({
  token,
  status,
  availableFrom,
  expiresAt,
  serverNow,
  submittedAttempts,
  maximumAttempts,
}: {
  token: string;
  status: string;
  availableFrom: string;
  expiresAt: string;
  serverNow: string;
  submittedAttempts: number;
  maximumAttempts: number;
}) {
  const [now, setNow] = useState(() => Date.parse(serverNow));
  const localized = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const formatDate = (value: string) => localized
    ? new Date(value).toLocaleString()
    : `${new Date(value).toISOString().replace("T", " ").replace(".000Z", " UTC")}`;

  if (status === "completed") {
    return (
      <Alert>
        <CalendarClock />
        <AlertTitle>Attempt limit reached</AlertTitle>
        <AlertDescription>
          You have submitted all {maximumAttempts} allowed attempts. Opening,
          refreshing, or cancelling an attempt does not affect this count.
        </AlertDescription>
      </Alert>
    );
  }

  const windowState = getAssessmentInvitationWindowState(
    availableFrom,
    expiresAt,
    now,
  );

  if (status === "expired" || windowState === "expired") {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <CalendarClock />
          <AlertTitle>Assessment window closed</AlertTitle>
          <AlertDescription>
            This secure link expired at{" "}
            {formatDate(expiresAt)}. Contact the recruiting team
            if you need another invitation.
          </AlertDescription>
        </Alert>
        <Button className="w-full" disabled>
          Invitation expired
        </Button>
      </div>
    );
  }

  if (windowState === "scheduled") {
    return (
      <div className="space-y-4">
        <Alert>
          <Clock3 />
          <AlertTitle>Assessment not open yet</AlertTitle>
          <AlertDescription>
            You can begin at {formatDate(availableFrom)}. Opens
            in {formatRemaining(Date.parse(availableFrom) - now)}.
          </AlertDescription>
        </Alert>
        <Button className="w-full" disabled>
          Waiting for start time
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Clock3 />
        <AlertTitle>Assessment window is open</AlertTitle>
        <AlertDescription>
          Complete and submit before {formatDate(expiresAt)}.
          Time remaining: {formatRemaining(Date.parse(expiresAt) - now)}.
        </AlertDescription>
      </Alert>
      <Button className="w-full" asChild>
        <Link href={`/assessment/${token}/verify`}>
          {submittedAttempts > 0 ? `Continue · ${maximumAttempts - submittedAttempts} attempts remaining` : "Verify email and continue"}
        </Link>
      </Button>
    </div>
  );
}
