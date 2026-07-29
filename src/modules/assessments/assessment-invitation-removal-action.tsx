"use client";

import { Trash2, X } from "lucide-react";
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

export function AssessmentInvitationRemovalAction({
  invitationId,
  candidateName,
  status,
  disabled,
}: {
  invitationId: string;
  candidateName: string;
  status: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const isActive = ["invited", "opened"].includes(status);

  async function removeInvitation() {
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
          result.error?.message ?? "The invitation could not be removed.",
        );
      }
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The invitation could not be removed.",
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
            {isActive ? (
              <X aria-hidden="true" />
            ) : (
              <Trash2 aria-hidden="true" />
            )}
            {pending ? "Removing..." : isActive ? "Cancel" : "Remove"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isActive ? "Cancel" : "Remove"} {candidateName}&apos;s
              invitation?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isActive
                ? "The secure assessment link will stop working immediately and the invitation will disappear from this page."
                : status === "completed"
                  ? "The invitation will disappear from this page. The completed assessment, results, and security audit history will be preserved."
                  : "The expired invitation will disappear from this page. Use Edit & reissue instead if you want to send the candidate a new secure link."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep invitation</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void removeInvitation()}
            >
              {isActive ? "Cancel invitation" : "Remove from list"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error ? (
        <p className="max-w-56 text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
