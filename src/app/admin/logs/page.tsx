import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPaginatedAuditLogs } from "@/modules/admin/service";
import { requirePlatformAdmin } from "@/modules/authorization/service";
import { Organization } from "@/models/organization.model";
import { connectToDatabase } from "@/lib/database";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; orgId?: string }>;
}) {
  await requirePlatformAdmin();
  const { page, orgId } = await searchParams;
  const currentPage = page ? parseInt(page) : 1;

  await connectToDatabase();
  const organizations = await Organization.find().select("name slug").sort({ name: 1 }).lean();
  const logs = await getPaginatedAuditLogs(currentPage, orgId);

  const nextPageUrl = `/admin/logs?page=${currentPage + 1}${orgId ? `&orgId=${orgId}` : ""}`;
  const prevPageUrl = `/admin/logs?page=${Math.max(1, currentPage - 1)}${
    orgId ? `&orgId=${orgId}` : ""
  }`;

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[.2em] text-blue-400">
          Operations Console
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Audit Trail</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide immutable history of tenant configuration updates, administrative events, and API cycles
        </p>
      </div>

      {/* Filter Card */}
      <Card className="border-border/60 bg-card/45">
        <CardContent className="py-4">
          <form method="GET" className="flex flex-wrap items-center gap-3">
            <div className="w-64">
              <Select name="orgId" defaultValue={orgId ?? "all"}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Workspaces" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workspaces</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={String(org._id)} value={String(org._id)}>
                      {org.name} (/{org.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" size="sm" variant="secondary" className="h-9">
              Filter Logs
            </Button>

            {orgId && (
              <Button asChild size="sm" variant="ghost" className="h-9">
                <Link href="/admin/logs">Clear</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-border/60 bg-card/45">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30 text-xs">
                    <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="font-semibold whitespace-nowrap">
                      {log.organization ? (
                        <div>
                          <p>{log.organization.name}</p>
                          <p className="font-mono text-[9px] text-muted-foreground">
                            /{log.organization.slug}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Platform</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{log.actor.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{log.actor.email}</p>
                    </TableCell>
                    <TableCell>
                      <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] text-blue-300 font-mono">
                        {log.action}
                      </code>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="font-medium text-muted-foreground mr-1">
                        {log.resourceType}:
                      </span>
                      <code className="text-[10px] font-mono">{log.resourceId.slice(-6)}</code>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {log.ipAddress ?? "Unknown"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate font-mono text-[10px] text-muted-foreground">
                      {log.metadata && Object.keys(log.metadata).length > 0 ? (
                        <pre className="max-h-16 overflow-y-auto max-w-[200px] text-[9px] leading-3 p-1 bg-muted/20 border rounded whitespace-pre-wrap">
                          {JSON.stringify(log.metadata)}
                        </pre>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No audit log records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Page {currentPage}</p>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
          >
            <Link href={prevPageUrl} className="flex items-center gap-1">
              <ChevronLeft className="size-4" />
              Previous
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            disabled={logs.length < 50}
            className={logs.length < 50 ? "pointer-events-none opacity-50" : ""}
          >
            <Link href={nextPageUrl} className="flex items-center gap-1">
              Next
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
