import { InvitationManager } from "@/modules/assessments/invitation-manager";
import { listInvitationManagerData } from "@/modules/assessments/invitation-service";
import { requireOrganizationContext } from "@/modules/authorization/service";

export default async function AssessmentInvitationsPage() { const context = await requireOrganizationContext("assessments:manage"); const data = await listInvitationManagerData(context); return <div className="space-y-6"><div><p className="font-mono text-xs uppercase tracking-[.2em] text-muted-foreground">Candidate invitations</p><h1 className="mt-2 text-3xl font-semibold">Assessment invitations</h1><p className="mt-2 text-muted-foreground">Send a secure, expiring assessment link to candidates whose CV review is complete.</p></div><InvitationManager data={data} /></div>; }
