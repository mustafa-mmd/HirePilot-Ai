"use client";

import { ClipboardX, MoreHorizontal, UserRoundX } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RemovalScope = "assessment" | "candidate";

export function CandidateRemovalActions({
  candidate,
}: {
  candidate: {
    id: string;
    fullName: string;
    email: string;
    assessmentCount: number;
  };
}) {
  const router = useRouter();
  const [scope, setScope] = useState<RemovalScope | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");

  async function removeCandidateData() {
    if (!scope) return;
    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/candidates/${candidate.id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error?.message ?? "The candidate data could not be removed.",
        );
      }
      setScope(null);
      setConfirmation("");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The candidate data could not be removed.",
      );
    } finally {
      setPending(false);
    }
  }

  const removingCandidate = scope === "candidate";

  return (
    <div className="space-y-1 text-right">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={pending}
            aria-label={`Manage ${candidate.fullName}`}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            variant="destructive"
            disabled={candidate.assessmentCount === 0}
            onSelect={() => setScope("assessment")}
          >
            <ClipboardX aria-hidden="true" />
            Remove assessment only
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setScope("candidate")}
          >
            <UserRoundX aria-hidden="true" />
            Delete candidate and data
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={scope !== null}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setScope(null);
            setError("");
            setConfirmation("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {removingCandidate
                ? `Delete ${candidate.fullName}?`
                : `Remove ${candidate.fullName}'s assessment data?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {removingCandidate
                ? "This permanently deletes the candidate profile, applications, CV files, assessment invitations, answers, recordings, scores, evaluations, and notifications. Security audit entries are retained."
                : "This permanently deletes all assessment invitations, attempts, answers, recordings, scores, and assessment evaluations for this candidate. Their profile, CV, and applications remain, and assessment-stage applications return to CV reviewed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {removingCandidate ? (
            <div className="space-y-2">
              <Label htmlFor={`confirm-candidate-${candidate.id}`}>
                Type {candidate.email} to confirm
              </Label>
              <Input
                id={`confirm-candidate-${candidate.id}`}
                type="email"
                autoComplete="off"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              Keep candidate
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={
                pending ||
                (removingCandidate &&
                  confirmation.trim().toLowerCase() !==
                    candidate.email.toLowerCase())
              }
              onClick={(event) => {
                event.preventDefault();
                void removeCandidateData();
              }}
            >
              {pending
                ? "Removing..."
                : removingCandidate
                  ? "Delete candidate permanently"
                  : "Remove assessment data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
