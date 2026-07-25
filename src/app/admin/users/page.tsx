import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getPaginatedUsers } from "@/modules/admin/service";
import { requirePlatformAdmin } from "@/modules/authorization/service";
import { RoleSelector } from "@/modules/admin/role-selector";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { Search } from "lucide-react";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; role?: string }>;
}) {
  const admin = await requirePlatformAdmin();
  const { search, role } = await searchParams;
  const list = await getPaginatedUsers(search, role);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[.2em] text-blue-400">
          Operations Console
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">User Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View users, associated organization memberships, and promote/demote administrator rights
        </p>
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
                placeholder="Search users by name or email..."
                className="pl-9 h-9"
              />
            </div>

            <div className="w-44">
              <Select name="role" defaultValue={role ?? "all"}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Global Roles</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="platform_admin">Platform Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" size="sm" variant="secondary" className="h-9">
              Filter
            </Button>

            {(search || role) && (
              <Button asChild size="sm" variant="ghost" className="h-9">
                <Link href="/admin/users">Clear</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-border/60 bg-card/45">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Account</TableHead>
                  <TableHead>Global Role</TableHead>
                  <TableHead>Workspace Memberships</TableHead>
                  <TableHead>Registration Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/30">
                    <TableCell className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {user.name ? user.name.slice(0, 2).toUpperCase() : "US"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleSelector userId={user.id} role={user.globalRole} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5 max-w-sm">
                        {user.memberships.map((m: any) => (
                          <Badge
                            key={m.orgSlug}
                            variant="outline"
                            className="bg-card/85 text-[10px] px-2 py-0.5 capitalize border-border"
                          >
                            {m.orgName} ({m.role})
                          </Badge>
                        ))}
                        {user.memberships.length === 0 && (
                          <span className="text-xs text-muted-foreground">No active workspaces</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))}

                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      No user accounts found matching filters.
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
