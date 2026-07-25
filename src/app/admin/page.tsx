import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPlatformOverview, getPaginatedAuditLogs, getPaginatedUsers } from "@/modules/admin/service";
import { requirePlatformAdmin } from "@/modules/authorization/service";
import { Building2, Users, ClipboardList, FileSpreadsheet, Sparkles, DollarSign } from "lucide-react";
import Link from "next/link";

export default async function PlatformAdminPage() {
  const admin = await requirePlatformAdmin();
  const overview = await getPlatformOverview();
  const recentLogs = await getPaginatedAuditLogs(1);
  const recentUsers = await getPaginatedUsers();

  const metrics = [
    {
      label: "Organizations",
      value: overview.summary.organizations,
      description: "Registered workspaces",
      icon: Building2,
      color: "text-blue-500",
    },
    {
      label: "Total Users",
      value: overview.summary.users,
      description: "Platform accounts",
      icon: Users,
      color: "text-purple-500",
    },
    {
      label: "Applications",
      value: overview.summary.applications,
      description: "Submitted candidate CVs",
      icon: FileSpreadsheet,
      color: "text-emerald-500",
    },
    {
      label: "Attempts",
      value: overview.summary.attempts,
      description: "Assessments completed",
      icon: ClipboardList,
      color: "text-amber-500",
    },
    {
      label: "AI Tokens",
      value: overview.summary.aiTokens.toLocaleString(),
      description: "Gemini token usage",
      icon: Sparkles,
      color: "text-sky-500",
    },
    {
      label: "Estimated AI Cost",
      value: `$${overview.summary.estimatedAiCost.toFixed(2)}`,
      description: "Gemini API expenses",
      icon: DollarSign,
      color: "text-rose-500",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-[.2em] text-blue-400">
          Platform Administration
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">HirePilot Operations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Command center logged in as <span className="font-medium text-foreground">{admin.email}</span>
        </p>
      </div>

      {/* Grid of Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="border-border/60 bg-card/45">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {metric.label}
                  </p>
                  <Icon className={`size-4 ${metric.color}`} />
                </div>
                <p className="mt-2 text-3xl font-semibold font-mono tracking-tight">
                  {metric.value}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">{metric.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Audit Logs */}
        <Card className="border-border/60 bg-card/45">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">System Events</CardTitle>
                <CardDescription>Latest administrative and tenant actions</CardDescription>
              </div>
              <Link
                href="/admin/logs"
                className="text-xs font-medium text-blue-400 hover:underline"
              >
                View all logs
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLogs.slice(0, 7).map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs">
                        <span className="font-medium text-foreground">{log.action}</span>
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate">
                        {log.organization ? (
                          <div>
                            <p className="font-medium text-xs truncate">{log.organization.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              /{log.organization.slug}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">System</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate">
                        <p className="font-medium text-xs truncate">{log.actor.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {log.actor.email}
                        </p>
                      </TableCell>
                      <TableCell className="text-right font-mono text-[10px] text-muted-foreground">
                        {new Date(log.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {recentLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No recent logs found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Registrations */}
        <Card className="border-border/60 bg-card/45">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Registrations</CardTitle>
                <CardDescription>Latest users registered on the platform</CardDescription>
              </div>
              <Link
                href="/admin/users"
                className="text-xs font-medium text-blue-400 hover:underline"
              >
                Manage users
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Global Role</TableHead>
                    <TableHead>Workspaces</TableHead>
                    <TableHead className="text-right">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentUsers.slice(0, 7).map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/30">
                      <TableCell>
                        <p className="font-medium text-xs">{user.name}</p>
                        <p className="text-[10px] text-muted-foreground">{user.email}</p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            user.globalRole === "platform_admin"
                              ? "border-blue-500/30 text-blue-400 text-[10px] font-mono"
                              : "text-muted-foreground text-[10px]"
                          }
                        >
                          {user.globalRole}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {user.memberships.map((m: any) => (
                            <Badge key={m.orgSlug} variant="secondary" className="text-[9px] px-1 py-0 capitalize">
                              {m.orgSlug} ({m.role})
                            </Badge>
                          ))}
                          {user.memberships.length === 0 && (
                            <span className="text-[10px] text-muted-foreground">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-[10px] text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {recentUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No users registered yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
