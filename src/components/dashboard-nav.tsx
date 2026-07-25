"use client";

import { BarChart3, BriefcaseBusiness, ClipboardList, LayoutDashboard, Settings, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navigation: Array<{ label: string; href: string; icon: LucideIcon; exact?: boolean }> = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Jobs", href: "/dashboard/jobs", icon: BriefcaseBusiness },
  { label: "Candidates", href: "/dashboard/candidates", icon: Users },
  { label: "Assessments", href: "/dashboard/assessments", icon: ClipboardList },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="mt-6 space-y-1" aria-label="Dashboard">
      {navigation.map(({ label, href, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return <Link key={label} href={href} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent", active && "bg-accent font-medium")}><Icon className="size-4" />{label}</Link>;
      })}
    </nav>
  );
}
