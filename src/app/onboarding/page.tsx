import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Brand } from "@/components/brand";
import { OnboardingClient } from "@/modules/organizations/onboarding-client";
import { listOrganizationsForUser } from "@/modules/organizations/service";

export const metadata: Metadata = { title: "Choose workspace" };

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const organizations = await listOrganizationsForUser(session.user.id);

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <Brand />
        <div className="mb-10 mt-16 max-w-2xl"><p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Workspace setup</p><h1 className="text-4xl font-semibold tracking-tight">Where are you hiring?</h1><p className="mt-3 text-muted-foreground">Create a new tenant or enter an existing one. Every protected query is scoped to this choice.</p></div>
        <OnboardingClient organizations={organizations} />
      </div>
    </main>
  );
}
