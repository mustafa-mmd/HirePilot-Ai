import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPaginatedOrganizations } from "@/modules/admin/service";
import { requirePlatformAdmin } from "@/modules/authorization/service";
import { PlanSelector } from "@/modules/admin/plan-selector";
import { StatusToggle } from "@/modules/admin/status-toggle";
import { RegisterOrgModal } from "@/modules/admin/register-org-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { Search } from "lucide-react";

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; plan?: string }>;
}) {
  const admin = await requirePlatformAdmin();
  const { search, plan } = await searchParams;
  const list = await getPaginatedOrganizations(search, plan);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[.2em] text-blue-400">
            Operations Console
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Workspaces</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage company organizations, subscription tiers, and active status
          </p>
        </div>
        <div>
          <RegisterOrgModal />
        </div>
      </div>

      {/* Filters Card */}
      <Card className="border-border/60 bg-card/45">
        <CardContent className="py-4">
          <form method="GET" className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                name="search"
                defaultValue={search ?? ""}
                placeholder="Search by workspace name or slug..."
                className="pl-9 h-9"
              />
            </div>

            <div className="w-40">
              <Select name="plan" defaultValue={plan ?? "all"}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" size="sm" variant="secondary" className="h-9">
              Filter
            </Button>

            {(search || plan) && (
              <Button asChild size="sm" variant="ghost" className="h-9">
                <Link href="/admin/organizations">Clear</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Organizations Table */}
      <Card className="border-border/60 bg-card/45">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Active Members</TableHead>
                  <TableHead>Subscription Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((org) => {
                  const isActive = org.status === "active" || org.status === "trialing";
                  return (
                    <TableRow key={org.id} className="hover:bg-muted/30">
                      <TableCell>
                        <p className="font-semibold text-sm">{org.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          slug: {org.slug}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {org.members} active
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <PlanSelector organizationId={org.id} plan={org.plan} />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isActive ? "default" : "destructive"}
                          className={`capitalize font-semibold text-[10px] ${
                            isActive
                              ? org.status === "trialing"
                                ? "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                                : "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                              : "bg-rose-600/20 text-rose-400 hover:bg-rose-600/30"
                          }`}
                        >
                          {org.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {new Date(org.createdAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <StatusToggle organizationId={org.id} status={org.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}

                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No workspaces found matching filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
