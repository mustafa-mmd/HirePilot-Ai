"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
export function AcceptInvitation({ token }: { token: string }) { const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); async function accept() { setBusy(true); setError(""); try { const response = await fetch("/api/team/accept", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error?.message ?? "Invitation could not be accepted."); router.push("/dashboard"); router.refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Invitation could not be accepted."); } finally { setBusy(false); } } return <div className="space-y-4">{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}<Button className="w-full" disabled={busy} onClick={() => void accept()}>{busy ? "Joining..." : "Accept invitation"}</Button></div>; }
