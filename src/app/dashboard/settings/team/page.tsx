import { hasPermission } from "@/modules/authorization/permissions";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { TeamManager } from "@/modules/team/team-manager";
import { listTeam } from "@/modules/team/service";

export default async function TeamSettingsPage() { const context = await requireOrganizationContext("members:read"); return <div className="mx-auto max-w-6xl space-y-6"><div><h1 className="text-3xl font-semibold">Team management</h1><p className="mt-2 text-muted-foreground">Invite members and manage server-enforced workspace roles.</p></div><TeamManager data={await listTeam(context)} canManage={hasPermission(context.role, "members:manage")} currentUserId={context.userId} /></div>; }
