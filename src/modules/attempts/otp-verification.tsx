"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ApiEnvelope = { success: boolean; error?: { message?: string }; data?: { alreadyVerified?: boolean; deliveryStatus?: string } };

export function OtpVerification({ token, candidateName }: { token: string; candidateName: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function requestCode() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/candidate-assessment/otp/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, email }) });
      const result = await response.json() as ApiEnvelope;
      if (!response.ok || !result.success) throw new Error(result.error?.message ?? "Unable to send a code.");
      if (result.data?.alreadyVerified) { router.push(`/assessment/${token}/setup`); return; }
      if (result.data?.deliveryStatus !== "sent") throw new Error("The verification email could not be delivered. Contact the recruiting team.");
      setSent(true); setMessage("A six-digit code was sent to your email.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to send a code."); }
    finally { setBusy(false); }
  }

  async function verifyCode() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/candidate-assessment/otp/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, code }) });
      const result = await response.json() as ApiEnvelope;
      if (!response.ok || !result.success) throw new Error(result.error?.message ?? "Unable to verify the code.");
      router.push(`/assessment/${token}/setup`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to verify the code."); }
    finally { setBusy(false); }
  }

  return <Card><CardHeader><CardTitle>Verify your email</CardTitle><CardDescription>Hello {candidateName}. Enter the email address that received this invitation.</CardDescription></CardHeader><CardContent className="space-y-5">{message && <Alert><AlertTitle>Verification</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>}{!sent ? <div className="space-y-3"><Label htmlFor="candidate-email">Email address</Label><Input id="candidate-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /><Button className="w-full" disabled={busy || !email} onClick={() => void requestCode()}>{busy ? "Sending..." : "Send verification code"}</Button></div> : <div className="space-y-3"><Label htmlFor="candidate-code">Six-digit code</Label><Input id="candidate-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="text-center font-mono text-2xl tracking-[.5em]" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} /><Button className="w-full" disabled={busy || code.length !== 6} onClick={() => void verifyCode()}>{busy ? "Verifying..." : "Verify and continue"}</Button><Button className="w-full" variant="ghost" disabled={busy} onClick={() => setSent(false)}>Use a different email</Button></div>}</CardContent></Card>;
}
