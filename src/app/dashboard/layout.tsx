import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand } from "@/components/brand";
import { DashboardNav } from "@/components/dashboard-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AppError } from "@/lib/errors";
import { logoutAction } from "@/modules/auth/actions";
import { requireOrganizationContext } from "@/modules/authorization/service";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let context;
  try {
    context = await requireOrganizationContext("organization:read");
  } catch (error) {
    if (error instanceof AppError && [401, 412].includes(error.statusCode)) redirect(error.statusCode === 401 ? "/login" : "/onboarding");
    throw error;
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card/50 p-5 lg:flex lg:flex-col">
        <Brand />
        <div className="mt-8 rounded-lg border bg-background/60 p-3 flex items-center gap-3">
          {context.organizationLogo ? (
            <img src={context.organizationLogo} alt={context.organizationName} className="size-9 rounded-md object-cover border" />
          ) : (
            <div className="flex size-9 items-center justify-center rounded-md bg-muted text-xs font-semibold uppercase text-muted-foreground border">
              {context.organizationName.slice(0, 2)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{context.organizationName}</p>
            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{context.organizationSlug}</p>
          </div>
        </div>
        <DashboardNav />
        <div className="mt-auto"><Separator className="mb-4" /><Link href="/onboarding" className="text-xs text-muted-foreground hover:text-foreground">Switch workspace</Link></div>
      </aside>

      <div className="lg:pl-64">
        <header className="flex h-16 items-center justify-between border-b bg-background/80 px-6 backdrop-blur lg:px-8">
          <div className="lg:hidden"><Brand /></div>
          <div className="ml-auto flex items-center gap-3">
            <Badge variant="outline" className="capitalize">{context.role}</Badge>
            <Avatar className="size-8">
              {context.organizationLogo && (
                <AvatarImage src={context.organizationLogo} alt={context.organizationName} />
              )}
              <AvatarFallback>{context.organizationName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <form action={logoutAction}><Button type="submit" variant="ghost" size="sm">Sign out</Button></form>
          </div>
        </header>
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
