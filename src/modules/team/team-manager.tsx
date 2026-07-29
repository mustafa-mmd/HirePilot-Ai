"use client";

import { UserMinus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type TeamMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  joinedAt: string;
};

type TeamInvitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
};

type TeamData = {
  members: TeamMember[];
  invitations: TeamInvitation[];
};

type Notice = {
  kind: "success" | "error";
  text: string;
};

const ROLE_DETAILS = [
  {
    name: "Owner",
    summary: "Full workspace control, including billing and every team action.",
  },
  {
    name: "Admin",
    summary: "Manages the team, settings, jobs, candidates, and assessments; no billing.",
  },
  {
    name: "Recruiter",
    summary: "Creates jobs, reviews candidates, and manages assessments; team access is read-only.",
  },
  {
    name: "Reviewer",
    summary: "Reviews candidates and assessment evidence without changing jobs or team settings.",
  },
] as const;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export function TeamManager({
  data,
  canManage,
  currentUserId,
}: {
  data: TeamData;
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("recruiter");
  const [busyAction, setBusyAction] = useState("");
  const [notice, setNotice] = useState<Notice>();
  const busy = Boolean(busyAction);

  async function request(url: string, method: string, body?: unknown) {
    const response = await fetch(url, {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error?.message ?? "The team action failed.");
    }
    return result;
  }

  async function runAction(
    actionId: string,
    action: () => Promise<void>,
    successMessage: string,
  ) {
    setBusyAction(actionId);
    setNotice(undefined);
    try {
      await action();
      setNotice({ kind: "success", text: successMessage });
      router.refresh();
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "The team action failed.",
      });
    } finally {
      setBusyAction("");
    }
  }

  async function invite() {
    setBusyAction("invite");
    setNotice(undefined);
    try {
      const result = await request("/api/team", "POST", { email, role });
      setEmail("");
      setNotice({
        kind: result.data?.deliveryStatus === "sent" ? "success" : "error",
        text:
          result.data?.deliveryStatus === "sent"
            ? "Invitation sent."
            : `Invitation saved, but email delivery failed: ${result.data?.deliveryError ?? "unknown error"}`,
      });
      router.refresh();
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "Invitation failed.",
      });
    } finally {
      setBusyAction("");
    }
  }

  function updateMember(id: string, body: unknown) {
    return runAction(
      `member:${id}`,
      async () => {
        await request(`/api/team/${id}`, "PATCH", body);
      },
      "Member access updated.",
    );
  }

  function removeMember(member: TeamMember) {
    return runAction(
      `member:${member.id}`,
      async () => {
        await request(`/api/team/${member.id}`, "DELETE");
      },
      `${member.name} was removed from this workspace.`,
    );
  }

  function cancelInvitation(invitation: TeamInvitation) {
    return runAction(
      `invitation:${invitation.id}`,
      async () => {
        await request(`/api/team/invitations/${invitation.id}`, "DELETE");
      },
      `Invitation for ${invitation.email} was cancelled.`,
    );
  }

  return (
    <div className="space-y-6">
      {notice ? (
        <Alert variant={notice.kind === "error" ? "destructive" : "default"}>
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Workspace roles</CardTitle>
          <CardDescription>
            Roles control real server-side permissions, not only what appears in
            the interface.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {ROLE_DETAILS.map((item) => (
            <div className="rounded-lg border p-4" key={item.name}>
              <p className="font-medium">{item.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite team member</CardTitle>
            <CardDescription>
              Invitations are bound to the recipient email, securely hashed,
              and expire after seven days. The Owner role cannot be invited.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-[1fr_180px_auto]">
            <div className="space-y-2">
              <Label htmlFor="team-email">Email</Label>
              <Input
                id="team-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="team-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="recruiter">Recruiter</SelectItem>
                  <SelectItem value="reviewer">Reviewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="self-end"
              disabled={busy || !email}
              onClick={() => void invite()}
            >
              {busyAction === "invite" ? "Sending..." : "Send invitation"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Removing a member revokes workspace access without deleting their
            HirePilot account or audit history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.members.map((member) => {
                const isOwner = member.role === "owner";
                const isCurrentUser = member.userId === currentUserId;
                const canEditMember = canManage && !isOwner && !isCurrentUser;

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                        {isCurrentUser ? <Badge variant="secondary">You</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {canEditMember ? (
                        <Select
                          value={member.role}
                          disabled={busy}
                          onValueChange={(value) =>
                            void updateMember(member.id, { role: value })
                          }
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="recruiter">Recruiter</SelectItem>
                            <SelectItem value="reviewer">Reviewer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className="capitalize" variant="outline">
                          {member.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {canEditMember ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() =>
                            void updateMember(member.id, {
                              status:
                                member.status === "active" ? "suspended" : "active",
                            })
                          }
                        >
                          {member.status === "active" ? "Suspend" : "Reactivate"}
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="capitalize">
                          {member.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {dateFormatter.format(new Date(member.joinedAt))}
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        {canEditMember ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={busy}
                              >
                                <UserMinus aria-hidden="true" />
                                Remove
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Remove {member.name}?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  They will immediately lose access to this
                                  workspace. Their account, authored records, and
                                  audit history will be preserved.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep member</AlertDialogCancel>
                                <AlertDialogAction
                                  variant="destructive"
                                  onClick={() => void removeMember(member)}
                                >
                                  Remove member
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {isOwner ? "Protected" : "Current account"}
                          </span>
                        )}
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invitation history</CardTitle>
          <CardDescription>
            Pending invitations can be cancelled. Completed and cancelled
            records remain visible for security auditing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.invitations.length ? (
            <div className="space-y-3">
              {data.invitations.map((invitation) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 text-sm"
                  key={invitation.id}
                >
                  <div>
                    <p>{invitation.email}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {invitation.role} · expires{" "}
                      {dateFormatter.format(new Date(invitation.expiresAt))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {invitation.status}
                    </Badge>
                    {canManage && invitation.status === "pending" ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" disabled={busy}>
                            <X aria-hidden="true" />
                            Cancel
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Cancel this invitation?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              The link sent to {invitation.email} will stop
                              working immediately. You can send a new invitation
                              later.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep invitation</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => void cancelInvitation(invitation)}
                            >
                              Cancel invitation
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No invitations have been sent.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
