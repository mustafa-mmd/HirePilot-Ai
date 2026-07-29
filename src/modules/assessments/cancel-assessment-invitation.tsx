"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function CancelAssessmentInvitation({
  invitationId,
  candidateName,
  disabled,
}: {
  invitationId: string;
  candidateName: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function cancelInvitation() {
    setPending(true);
    setError("");

    try {
      const response = await fetch(
        `/api/assessment-invitations/${invitationId}`,
        { method: "DELETE" },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error?.message ?? "The invitation could not be cancelled.",
        );
      }
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The invitation could not be cancelled.",
      );
      setPending(false);
    }
  }

  return (
    <div className="space-y-1 text-right">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={disabled || pending}
          >
            <X aria-hidden="true" />
            {pending ? "Cancelling..." : "Cancel"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Cancel {candidateName}&apos;s invitation?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Their assessment link and any verification code will stop working
              immediately. Invitations for assessments already started or
              completed cannot be cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep invitation</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void cancelInvitation()}
            >
              Cancel invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error ? (
        <p className="max-w-48 text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
