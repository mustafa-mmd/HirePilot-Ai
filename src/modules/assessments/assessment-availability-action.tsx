"use client";

import { CalendarClock, Clock3 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

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
}: {
  token: string;
  status: string;
  availableFrom: string;
  expiresAt: string;
  serverNow: string;
}) {
  const [now, setNow] = useState(() => Date.parse(serverNow));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  if (status === "completed") {
    return (
      <Alert>
        <CalendarClock />
        <AlertTitle>Assessment already completed</AlertTitle>
        <AlertDescription>
          This invitation has already been used to complete the assessment.
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
            {new Date(expiresAt).toLocaleString()}. Contact the recruiting team
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
            You can begin at {new Date(availableFrom).toLocaleString()}. Opens
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
          Complete and submit before {new Date(expiresAt).toLocaleString()}.
          Time remaining: {formatRemaining(Date.parse(expiresAt) - now)}.
        </AlertDescription>
      </Alert>
      <Button className="w-full" asChild>
        <Link href={`/assessment/${token}/verify`}>
          Verify email and continue
        </Link>
      </Button>
    </div>
  );
}
