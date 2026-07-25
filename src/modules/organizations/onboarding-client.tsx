"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Building2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { organizationSchema, slugifyOrganizationName, type OrganizationInput } from "@/modules/organizations/schemas";

type OrganizationOption = { id: string; name: string; slug: string; role: string };

export function OnboardingClient({ organizations }: { organizations: OrganizationOption[] }) {
  const [activationError, setActivationError] = useState<string>();
  const [activatingId, setActivatingId] = useState<string>();
  const form = useForm<OrganizationInput>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: "", slug: "" },
  });
  const nameField = form.register("name");

  async function activate(organizationId: string) {
    setActivationError(undefined);
    setActivatingId(organizationId);
    const response = await fetch("/api/organizations/active", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizationId }),
    });
    if (response.ok) window.location.assign("/dashboard");
    else {
      const result = await response.json();
      setActivationError(result.error?.message ?? "Could not enter this workspace.");
      setActivatingId(undefined);
    }
  }

  async function onSubmit(values: OrganizationInput) {
    form.clearErrors("root");
    const response = await fetch("/api/organizations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json();
    if (!response.ok) {
      form.setError("root", { message: result.error?.message ?? "Workspace creation failed." });
      return;
    }
    window.location.assign("/dashboard");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Create a workspace</CardTitle><CardDescription>Workspaces isolate company data, roles, and audit history.</CardDescription></CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            {form.formState.errors.root ? <Alert variant="destructive"><AlertDescription>{form.formState.errors.root.message}</AlertDescription></Alert> : null}
            <div className="space-y-2">
              <Label htmlFor="name">Company name</Label>
              <Input
                id="name"
                placeholder="Acme, Inc."
                {...nameField}
                onChange={(event) => {
                  nameField.onChange(event);
                  if (!form.getFieldState("slug").isDirty) {
                    form.setValue("slug", slugifyOrganizationName(event.target.value));
                  }
                }}
              />
              {form.formState.errors.name ? <p className="text-xs text-destructive">{form.formState.errors.name.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Workspace URL</Label>
              <div className="flex rounded-md border bg-muted/30 focus-within:ring-2 focus-within:ring-ring">
                <span className="flex items-center border-r px-3 text-xs text-muted-foreground">hirepilot.ai/</span>
                <Input id="slug" className="border-0 bg-transparent shadow-none focus-visible:ring-0" {...form.register("slug")} />
              </div>
              {form.formState.errors.slug ? <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p> : null}
            </div>
            <Button className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Building2 />} Create workspace
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Your workspaces</CardTitle><CardDescription>Continue in an organization where you already have active membership.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {activationError ? <Alert variant="destructive"><AlertDescription>{activationError}</AlertDescription></Alert> : null}
          {organizations.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No existing memberships yet.</div>
          ) : organizations.map((organization) => (
            <button key={organization.id} type="button" disabled={Boolean(activatingId)} onClick={() => activate(organization.id)} className="flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent disabled:cursor-wait disabled:opacity-60">
              <span className="flex size-9 items-center justify-center rounded-md bg-muted"><Building2 className="size-4" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{organization.name}</span><span className="block truncate font-mono text-xs text-muted-foreground">{organization.slug}</span></span>
              <Badge variant="secondary">{organization.role}</Badge>{activatingId === organization.id ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : <ArrowRight className="size-4 text-muted-foreground" />}
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
