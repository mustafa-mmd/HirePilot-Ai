"use client";

import { Building2, History, LayoutDashboard, Sparkles, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navigation: Array<{ label: string; href: string; icon: LucideIcon; exact?: boolean }> = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Organizations", href: "/admin/organizations", icon: Building2 },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "AI Usage", href: "/admin/ai-usage", icon: Sparkles },
  { label: "Audit Logs", href: "/admin/logs", icon: History },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-1" aria-label="Admin Operations">
      {navigation.map(({ label, href, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={label}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
              active && "bg-accent font-medium text-blue-400"
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
