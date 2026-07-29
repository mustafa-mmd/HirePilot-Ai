"use client";

import { Loader2, LogOut } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type InvitationAuthState = "signed-out" | "wrong-account" | "ready";

type AcceptInvitationProps = {
  token: string;
  organizationName: string;
  invitedEmailHint: string;
  currentEmail?: string;
  authState: InvitationAuthState;
  alreadyAccepted: boolean;
};

export function AcceptInvitation({
  token,
  organizationName,
  invitedEmailHint,
  currentEmail,
  authState,
  alreadyAccepted,
}: AcceptInvitationProps) {
  const [busy, setBusy] = useState(authState === "ready");
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [error, setError] = useState("");
  const acceptanceStarted = useRef(false);
  const callbackPath = `/team/join/${encodeURIComponent(token)}`;
  const loginUrl = `/login?callbackUrl=${encodeURIComponent(callbackPath)}`;
  const registerUrl = `/register?callbackUrl=${encodeURIComponent(callbackPath)}`;

  const accept = useCallback(async () => {
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/team/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();

      if (response.status === 401) {
        window.location.assign(loginUrl);
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.error?.message ?? "Invitation could not be accepted.",
        );
      }

      // A full navigation guarantees the active-workspace cookie from the
      // acceptance response is present on the first dashboard render.
      window.location.assign("/dashboard");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Invitation could not be accepted.",
      );
      setBusy(false);
    }
  }, [loginUrl, token]);

  useEffect(() => {
    if (authState !== "ready" || acceptanceStarted.current) return;
    acceptanceStarted.current = true;
    void accept();
  }, [accept, authState]);

  async function switchAccount() {
    setSwitchingAccount(true);
    await signOut({ redirectTo: loginUrl });
  }

  if (authState === "signed-out") {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            Sign in with {invitedEmailHint}. You will return here automatically
            to accept the invitation.
          </AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <Link href={loginUrl}>Sign in to continue</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href={registerUrl}>Create an account</Link>
        </Button>
      </div>
    );
  }

  if (authState === "wrong-account") {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>
            You are signed in as {currentEmail}, but this invitation was sent
            to {invitedEmailHint}.
          </AlertDescription>
        </Alert>
        <Button
          className="w-full"
          disabled={switchingAccount}
          onClick={() => void switchAccount()}
        >
          {switchingAccount ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <LogOut aria-hidden="true" />
          )}
          {switchingAccount ? "Signing out..." : "Use the invited account"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          Signed in as {currentEmail}.{" "}
          {alreadyAccepted
            ? "Your membership is already active."
            : "Accept to activate your membership."}
        </AlertDescription>
      </Alert>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button className="w-full" disabled={busy} onClick={() => void accept()}>
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {busy
          ? "Opening workspace..."
          : alreadyAccepted
            ? `Open ${organizationName}`
            : `Join ${organizationName}`}
      </Button>
    </div>
  );
}
