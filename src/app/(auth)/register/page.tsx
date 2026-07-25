import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/modules/auth/register-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader><CardTitle>Create your account</CardTitle><CardDescription>Set up your secure recruiter identity.</CardDescription></CardHeader>
      <CardContent>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">Already have an account? <Link className="text-foreground underline underline-offset-4" href="/login">Sign in</Link></p>
      </CardContent>
    </Card>
  );
}
