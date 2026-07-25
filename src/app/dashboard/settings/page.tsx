import Link from "next/link";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/modules/authorization/permissions";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { getOrganizationSettings } from "@/modules/organizations/service";
import { OrganizationSettingsForm } from "@/modules/organizations/settings-form";
export default async function SettingsPage() { const context = await requireOrganizationContext("organization:read"); return <div className="mx-auto max-w-5xl space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold">Organization settings</h1><p className="mt-2 text-muted-foreground">Branding, privacy, retention, team, and billing controls.</p></div><div className="flex gap-2"><Button asChild variant="outline"><Link href="/dashboard/settings/team">Team</Link></Button><Button asChild variant="outline"><Link href="/dashboard/settings/billing">Billing</Link></Button></div></div><OrganizationSettingsForm initial={await getOrganizationSettings(context)} canEdit={hasPermission(context.role, "organization:update")} /></div>; }
