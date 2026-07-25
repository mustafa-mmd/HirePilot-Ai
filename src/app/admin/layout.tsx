import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, Building2, Users, Sparkles, History, ArrowLeft } from "lucide-react";

import { Brand } from "@/components/brand";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AppError } from "@/lib/errors";
import { logoutAction } from "@/modules/auth/actions";
import { requirePlatformAdmin } from "@/modules/authorization/service";
import { AdminNav } from "@/components/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let admin;
  try {
    admin = await requirePlatformAdmin();
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 401) {
      redirect("/login?callbackUrl=/admin");
    }
    // If not authorized (403), let the error boundary catch it or throw to show error.tsx
    throw error;
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card/50 p-5 lg:flex lg:flex-col">
        <Brand className="mb-2" />
        <div className="rounded-lg border bg-blue-950/20 border-blue-900/30 px-3 py-2 flex items-center gap-2 mb-6">
          <span className="flex size-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-mono text-blue-400 uppercase tracking-wider font-semibold">
            Operations Console
          </span>
        </div>
        <AdminNav />
        <div className="mt-auto">
          <Separator className="mb-4" />
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3" />
            Switch to Workspace
          </Link>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="flex h-16 items-center justify-between border-b bg-background/80 px-6 backdrop-blur lg:px-8">
          <div className="lg:hidden flex items-center gap-2">
            <Brand />
            <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-[10px] uppercase">
              Ops
            </Badge>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Badge variant="outline" className="border-blue-500/30 text-blue-400 font-mono text-xs">
              Platform Admin
            </Badge>
            <Avatar className="size-8">
              <AvatarFallback className="bg-blue-950 text-blue-300">
                {admin.name ? admin.name.slice(0, 2).toUpperCase() : "AD"}
              </AvatarFallback>
            </Avatar>
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </header>
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
