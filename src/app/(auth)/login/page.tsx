import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/modules/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; registered?: string }> }) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl?.startsWith("/") && !params.callbackUrl.startsWith("//")
    ? params.callbackUrl
    : "/onboarding";
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>{params.registered ? "Your account is ready. Sign in to create a workspace." : "Sign in to your recruiting workspace."}</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm callbackUrl={callbackUrl} googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)} />
        <p className="mt-6 text-center text-sm text-muted-foreground">New to HirePilot? <Link className="text-foreground underline underline-offset-4" href="/register">Create an account</Link></p>
      </CardContent>
    </Card>
  );
}
