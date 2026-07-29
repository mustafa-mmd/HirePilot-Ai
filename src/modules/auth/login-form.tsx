"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { credentialsSchema } from "@/modules/auth/schemas";

type LoginInput = z.infer<typeof credentialsSchema>;

export function LoginForm({ callbackUrl, googleEnabled }: { callbackUrl: string; googleEnabled: boolean }) {
  const [error, setError] = useState<string>();
  const [googleLoading, setGoogleLoading] = useState(false);
  const form = useForm<LoginInput>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setError(undefined);
    const result = await signIn("credentials", { ...values, redirect: false });
    if (result?.error) {
      setError("Email or password is incorrect.");
      return;
    }
    window.location.assign(callbackUrl || "/onboarding");
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email ? <p className="text-xs text-destructive">{form.formState.errors.email.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
        {form.formState.errors.password ? <p className="text-xs text-destructive">{form.formState.errors.password.message}</p> : null}
      </div>
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : null} Sign in
      </Button>
      {googleEnabled ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={googleLoading}
          onClick={() => {
            setGoogleLoading(true);
            signIn(
              "google",
              { redirectTo: callbackUrl || "/onboarding" },
              { prompt: "select_account" },
            );
          }}
        >
          {googleLoading ? <Loader2 className="animate-spin mr-2" /> : null}
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </Button>
      ) : null}
    </form>
  );
}
