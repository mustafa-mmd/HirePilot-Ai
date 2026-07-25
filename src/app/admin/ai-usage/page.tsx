import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDetailedAIUsage } from "@/modules/admin/service";
import { requirePlatformAdmin } from "@/modules/authorization/service";
import { Sparkles, Cpu, Layers } from "lucide-react";

export default async function AdminAIUsagePage() {
  await requirePlatformAdmin();
  const usageData = await getDetailedAIUsage();

  const totalTokens = usageData.byOrg.reduce((acc, item) => acc + item.tokens, 0);
  const totalCost = usageData.byOrg.reduce((acc, item) => acc + item.cost, 0);
  const totalRequests = usageData.byOrg.reduce((acc, item) => acc + item.requests, 0);

  const maxOrgCost = Math.max(...usageData.byOrg.map((o) => o.cost), 1);

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-[.2em] text-blue-400">
          Operations Console
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">AI Billing & Usage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Detailed metrics, token counts, and estimated cost aggregates from Gemini integrations
        </p>
      </div>

      {/* Aggregate Metrics Panel */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/60 bg-card/45">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total API Requests
            </p>
            <p className="mt-2 text-3xl font-semibold font-mono tracking-tight text-blue-400">
              {totalRequests.toLocaleString()}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">Cumulative AI prompt cycles</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/45">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Tokens Used
            </p>
            <p className="mt-2 text-3xl font-semibold font-mono tracking-tight text-purple-400">
              {totalTokens.toLocaleString()}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">Input, cache, and output tokens</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/45">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Estimated Total Expenses
            </p>
            <p className="mt-2 text-3xl font-semibold font-mono tracking-tight text-rose-400">
              ${totalCost.toFixed(2)}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">Computed using standard provider rates</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Workspace Breakdown */}
        <Card className="border-border/60 bg-card/45 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="size-4 text-blue-400" />
              Usage by Workspace
            </CardTitle>
            <CardDescription>Estimated cost breakdown per organization</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>API Requests</TableHead>
                  <TableHead>Tokens Used</TableHead>
                  <TableHead>Estimated Cost</TableHead>
                  <TableHead className="w-[30%]">Cost Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageData.byOrg.map((org) => {
                  const share = (org.cost / maxOrgCost) * 100;
                  return (
                    <TableRow key={org.orgId} className="hover:bg-muted/30">
                      <TableCell>
                        <p className="font-semibold text-sm">{org.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">/{org.slug}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{org.requests.toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs">{org.tokens.toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs font-medium text-rose-400">
                        ${org.cost.toFixed(4)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-rose-500 rounded-full"
                              style={{ width: `${Math.max(1, share)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-muted-foreground w-12 text-right">
                            {share.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {usageData.byOrg.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No workspace AI usage records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Model Breakdown */}
        <Card className="border-border/60 bg-card/45">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Cpu className="size-4 text-purple-400" />
              Usage by Gemini Model
            </CardTitle>
            <CardDescription>Tokens and costs aggregated by model tag</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model Name</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead className="text-right">Estimated Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageData.byModel.map((item) => (
                  <TableRow key={item.model} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold">{item.model}</TableCell>
                    <TableCell className="font-mono text-xs">{item.requests.toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs">{item.tokens.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-medium text-rose-400">
                      ${item.cost.toFixed(4)}
                    </TableCell>
                  </TableRow>
                ))}
                {usageData.byModel.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      No model records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Operation Breakdown */}
        <Card className="border-border/60 bg-card/45">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="size-4 text-emerald-400" />
              Usage by Operation Type
            </CardTitle>
            <CardDescription>Breaks down consumption by operations</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operation</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead className="text-right">Estimated Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageData.byOp.map((item) => (
                  <TableRow key={item.operation} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold uppercase">{item.operation}</TableCell>
                    <TableCell className="font-mono text-xs">{item.requests.toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs">{item.tokens.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-medium text-rose-400">
                      ${item.cost.toFixed(4)}
                    </TableCell>
                  </TableRow>
                ))}
                {usageData.byOp.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      No operation breakdown records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
