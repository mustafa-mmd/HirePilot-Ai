"use client";

import { LoaderCircle, Pencil, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { AssessmentInvitationRemovalAction } from "@/modules/assessments/assessment-invitation-removal-action";

type InvitationRow = {
  id: string;
  assessmentId: string;
  applicationId: string;
  candidateName: string;
  candidateEmail: string;
  assessmentTitle: string;
  status: string;
  windowState: "scheduled" | "active" | "expired";
  sentAt: string;
  startDeadline: string;
  expiresAt: string;
  maximumAttempts: number;
  candidateInstructions: string;
  remindersEnabled: boolean;
  reminderCount: number;
};

type ManagerData = {
  templates: Array<{
    id: string;
    title: string;
    totalDuration: number;
    monitoringLevel: string;
  }>;
  applications: Array<{
    id: string;
    candidateName: string;
    candidateEmail: string;
    jobTitle: string;
    stage: string;
  }>;
  invitations: InvitationRow[];
};

const DEFAULT_INSTRUCTIONS =
  "Read the assessment rules and privacy notice before starting. Complete the assessment independently in one quiet sitting. Keep this secure invitation link private.";

function futureLocalDate(days: number) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1_000);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function InvitationManager({ data }: { data: ManagerData }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [assessmentId, setAssessmentId] = useState(
    data.templates[0]?.id ?? "",
  );
  const [applicationId, setApplicationId] = useState(
    data.applications[0]?.id ?? "",
  );
  const [startDeadline, setStartDeadline] = useState(futureLocalDate(5));
  const [expiresAt, setExpiresAt] = useState(futureLocalDate(7));
  const [maximumAttempts, setMaximumAttempts] = useState(1);
  const [candidateInstructions, setCandidateInstructions] =
    useState(DEFAULT_INSTRUCTIONS);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [editingInvitationId, setEditingInvitationId] = useState<string>();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  }>();

  const editingInvitation = data.invitations.find(
    (invitation) => invitation.id === editingInvitationId,
  );

  function stopEditing() {
    setEditingInvitationId(undefined);
    setStartDeadline(futureLocalDate(5));
    setExpiresAt(futureLocalDate(7));
  }

  function editExpiredInvitation(invitation: InvitationRow) {
    const applicationExists = data.applications.some(
      (application) => application.id === invitation.applicationId,
    );
    const assessmentExists = data.templates.some(
      (template) => template.id === invitation.assessmentId,
    );
    if (!applicationExists || !assessmentExists) {
      setMessage({
        kind: "error",
        text: "This invitation cannot be reissued because its assessment or candidate application is no longer available.",
      });
      return;
    }

    setAssessmentId(invitation.assessmentId);
    setApplicationId(invitation.applicationId);
    setStartDeadline(futureLocalDate(5));
    setExpiresAt(futureLocalDate(7));
    setMaximumAttempts(invitation.maximumAttempts);
    setCandidateInstructions(invitation.candidateInstructions);
    setRemindersEnabled(invitation.remindersEnabled);
    setEditingInvitationId(invitation.id);
    setMessage(undefined);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function sendInvitation(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);

    try {
      const response = await fetch("/api/assessment-invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assessmentId,
          applicationId,
          startDeadline: new Date(startDeadline).toISOString(),
          expiresAt: new Date(expiresAt).toISOString(),
          maximumAttempts,
          candidateInstructions,
          remindersEnabled,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error?.message ?? "The invitation could not be sent.",
        );
      }

      const action = editingInvitationId ? "reissued" : "sent";
      setMessage({
        kind: result.data.deliveryStatus === "sent" ? "success" : "error",
        text:
          result.data.deliveryStatus === "sent"
            ? `Invitation ${action} successfully.`
            : `Invitation saved, but email delivery failed: ${result.data.deliveryError ?? "Email is not configured."}`,
      });
      setEditingInvitationId(undefined);
      router.refresh();
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "The invitation could not be sent.",
      });
    } finally {
      setPending(false);
    }
  }

  async function sendReminder(invitationId: string) {
    setPending(true);
    setMessage(undefined);
    try {
      const response = await fetch(
        `/api/assessment-invitations/${invitationId}/remind`,
        { method: "POST" },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error?.message ?? "The reminder could not be sent.",
        );
      }
      setMessage({
        kind: result.data.deliveryStatus === "sent" ? "success" : "error",
        text:
          result.data.deliveryStatus === "sent"
            ? "Reminder sent successfully."
            : `Reminder delivery failed: ${result.data.deliveryError ?? "Email is not configured."}`,
      });
      router.refresh();
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "The reminder could not be sent.",
      });
    } finally {
      setPending(false);
    }
  }

  const canInvite =
    data.templates.length > 0 &&
    data.applications.length > 0 &&
    Boolean(assessmentId) &&
    Boolean(applicationId);

  return (
    <div className="space-y-8">
      <form
        ref={formRef}
        className="scroll-mt-6 space-y-6 rounded-xl border bg-card p-6"
        onSubmit={sendInvitation}
      >
        {message ? (
          <Alert variant={message.kind === "error" ? "destructive" : "default"}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        ) : null}
        {editingInvitation ? (
          <Alert>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              <span>
                Editing the expired invitation for{" "}
                <strong>{editingInvitation.candidateName}</strong>. Reissuing
                sends a new email and invalidates its previous links.
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={stopEditing}
              >
                Stop editing
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {!canInvite ? (
          <Alert>
            <AlertDescription>
              You need a published assessment and an application in the CV
              reviewed stage before sending an invitation.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Assessment</Label>
            <Select value={assessmentId} onValueChange={setAssessmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an assessment" />
              </SelectTrigger>
              <SelectContent>
                {data.templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.title} · {template.totalDuration} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Candidate application</Label>
            <Select value={applicationId} onValueChange={setApplicationId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a candidate" />
              </SelectTrigger>
              <SelectContent>
                {data.applications.map((application) => (
                  <SelectItem key={application.id} value={application.id}>
                    {application.candidateName} · {application.jobTitle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="start-deadline">Assessment opens</Label>
            <Input
              id="start-deadline"
              type="datetime-local"
              min={futureLocalDate(0)}
              value={startDeadline}
              onChange={(event) => setStartDeadline(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-expiry">Assessment closes</Label>
            <Input
              id="invite-expiry"
              type="datetime-local"
              min={startDeadline}
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maximum-attempts">Maximum attempts</Label>
            <Input
              id="maximum-attempts"
              type="number"
              min={1}
              max={5}
              value={maximumAttempts}
              onChange={(event) =>
                setMaximumAttempts(Number(event.target.value))
              }
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-3 text-sm">
              <Checkbox
                checked={remindersEnabled}
                onCheckedChange={(checked) =>
                  setRemindersEnabled(checked === true)
                }
              />
              Enable email reminders
            </label>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="candidate-instructions">
              Candidate instructions
            </Label>
            <Textarea
              id="candidate-instructions"
              rows={5}
              value={candidateInstructions}
              onChange={(event) => setCandidateInstructions(event.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button disabled={pending || !canInvite}>
            {pending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Send />
            )}
            {pending
              ? editingInvitationId
                ? "Reissuing…"
                : "Sending…"
              : editingInvitationId
                ? "Reissue invitation"
                : "Send invitation"}
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Assessment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Opens</TableHead>
              <TableHead>Closes</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.invitations.length ? (
              data.invitations.map((invitation) => {
                const isActive = ["invited", "opened"].includes(
                  invitation.status,
                );
                const displayStatus =
                  isActive && invitation.windowState === "scheduled"
                    ? "scheduled"
                    : invitation.status;
                return (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <p className="font-medium">{invitation.candidateName}</p>
                      <p className="text-xs text-muted-foreground">
                        {invitation.candidateEmail}
                      </p>
                    </TableCell>
                    <TableCell>{invitation.assessmentTitle}</TableCell>
                    <TableCell>
                      <Badge
                        className="capitalize"
                        variant={
                          invitation.status === "completed"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {displayStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {new Date(invitation.startDeadline).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {new Date(invitation.expiresAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {new Date(invitation.sentAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {isActive ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pending || !invitation.remindersEnabled}
                            onClick={() => sendReminder(invitation.id)}
                          >
                            Send ({invitation.reminderCount})
                          </Button>
                        ) : null}
                        {invitation.status === "expired" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() => editExpiredInvitation(invitation)}
                          >
                            <Pencil aria-hidden="true" />
                            Edit &amp; reissue
                          </Button>
                        ) : null}
                        {invitation.status !== "started" ? (
                          <AssessmentInvitationRemovalAction
                            invitationId={invitation.id}
                            candidateName={invitation.candidateName}
                            status={invitation.status}
                            disabled={pending}
                          />
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-28 text-center text-muted-foreground"
                >
                  No assessment invitations yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
