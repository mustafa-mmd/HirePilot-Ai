import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSafeInternalPath } from "@/lib/safe-redirect";
import { RegisterForm } from "@/modules/auth/register-form";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = getSafeInternalPath(params.callbackUrl, "/onboarding");
  const loginUrl = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <Card>
      <CardHeader><CardTitle>Create your account</CardTitle><CardDescription>Set up your secure recruiter identity.</CardDescription></CardHeader>
      <CardContent>
        <RegisterForm callbackUrl={callbackUrl} />
        <p className="mt-6 text-center text-sm text-muted-foreground">Already have an account? <Link className="text-foreground underline underline-offset-4" href={loginUrl}>Sign in</Link></p>
      </CardContent>
    </Card>
  );
}
