"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ShieldCheck } from "lucide-react";

export function StatusToggle({
  organizationId,
  status,
}: {
  organizationId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const isActive = status === "active" || status === "trialing";

  async function toggle() {
    setBusy(true);
    try {
      const nextStatus = isActive ? "canceled" : "active";
      const response = await fetch(`/api/admin/organizations/${organizationId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error();
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant={isActive ? "outline" : "destructive"}
      size="sm"
      disabled={busy}
      onClick={() => void toggle()}
      className="h-8 gap-1 px-3 text-xs"
    >
      {isActive ? (
        <>
          <ShieldAlert className="size-3 text-amber-500" />
          Suspend
        </>
      ) : (
        <>
          <ShieldCheck className="size-3 text-emerald-300" />
          Activate
        </>
      )}
    </Button>
  );
}
