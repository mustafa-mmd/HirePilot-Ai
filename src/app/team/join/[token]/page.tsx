import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { auth } from "@/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AcceptInvitation } from "@/modules/team/accept-invitation";
import { getTeamInvitationPreview } from "@/modules/team/service";

export const metadata: Metadata = { title: "Join team" };

export default async function JoinTeamPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();
  const currentEmail = session?.user?.email?.toLowerCase();
  const invitation = await getTeamInvitationPreview(token, currentEmail);

  const unavailable =
    invitation.status === "invalid" ||
    invitation.status === "expired" ||
    invitation.status === "revoked";

  if (unavailable) {
    const message =
      invitation.status === "expired"
        ? "This invitation has expired. Ask a workspace administrator to send a new one."
        : invitation.status === "revoked"
          ? "This invitation has been revoked. Ask a workspace administrator for a new invitation."
          : "This invitation link is invalid or is no longer available.";

    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation unavailable</CardTitle>
            <CardDescription>This team invitation cannot be used.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Return to HirePilot</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const authState = !currentEmail
    ? "signed-out"
    : invitation.emailMatches
      ? "ready"
      : "wrong-account";

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-muted">
            <Building2 className="size-5" aria-hidden="true" />
          </div>
          <CardTitle>Join {invitation.organizationName}</CardTitle>
          <CardDescription>
            You have been invited as {invitation.role}. Confirm the invited
            identity to join this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcceptInvitation
            token={token}
            organizationName={invitation.organizationName ?? "workspace"}
            invitedEmailHint={invitation.invitedEmailHint ?? "the invited email address"}
            currentEmail={currentEmail}
            authState={authState}
            alreadyAccepted={invitation.status === "accepted"}
          />
        </CardContent>
      </Card>
    </main>
  );
}
