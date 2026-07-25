import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

import { Brand } from "@/components/brand";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const principles = [
  {
    icon: Sparkles,
    title: "Evidence, not black boxes",
    description: "Every AI-assisted score must be backed by visible evidence and confidence.",
  },
  {
    icon: ShieldCheck,
    title: "Tenant-safe by design",
    description: "Organization context and role permissions are enforced on the server.",
  },
  {
    icon: CheckCircle2,
    title: "Humans make decisions",
    description: "HirePilot assists reviewers; it never auto-rejects or makes the final call.",
  },
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Brand />
          <nav className="flex items-center gap-2" aria-label="Account">
            <Link href="/login" className={buttonVariants({ variant: "ghost" })}>Sign in</Link>
            <Link href="/register" className={buttonVariants()}>Create workspace</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-6 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-12">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Recruitment intelligence with accountable AI
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
            See the evidence behind every candidate signal.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Build structured hiring workflows, assess consistently, and keep recruiters in control of every decision.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>Start building <ArrowRight className="size-4" /></Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>Open dashboard</Link>
          </div>
        </div>

        <Card className="border-border/70 bg-card/70 shadow-2xl shadow-black/20">
          <CardContent className="grid gap-4 p-6">
            {principles.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-4 rounded-xl border border-border/70 bg-background/50 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-medium">{title}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
