"use client";

import { useEffect } from "react";

export function InstructionOpenedTracker({ token }: { token: string }) {
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/assessment-invitations/open", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }), signal: controller.signal }).catch(() => undefined);
    return () => controller.abort();
  }, [token]);
  return null;
}
