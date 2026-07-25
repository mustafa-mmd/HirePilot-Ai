import { Card, CardContent } from "@/components/ui/card";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { CandidateTable } from "@/modules/candidates/candidate-table";
import { listCandidates } from "@/modules/candidates/service";

export default async function CandidatesPage() {
  const context = await requireOrganizationContext("candidates:read");
  const candidates = await listCandidates(context);
  return <div className="mx-auto max-w-6xl space-y-6"><div><p className="font-mono text-xs uppercase tracking-[.2em] text-muted-foreground">Talent network</p><h1 className="mt-2 text-3xl font-semibold">Candidates</h1><p className="mt-2 text-muted-foreground">People who have applied to roles in {context.organizationName}.</p></div><Card><CardContent className="p-5"><CandidateTable data={candidates} /></CardContent></Card></div>;
}
