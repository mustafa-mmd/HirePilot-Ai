import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { teamInvitationSchema } from "@/modules/team/schemas";
import { inviteTeamMember, listTeam } from "@/modules/team/service";

export async function GET() { try { const context = await requireOrganizationContext("members:read"); return apiSuccess(await listTeam(context)); } catch (error) { return apiError(error); } }
export async function POST(request: Request) { try { assertSameOrigin(request); const context = await requireOrganizationContext("members:manage"); const input = teamInvitationSchema.parse(await request.json()); return apiSuccess(await inviteTeamMember(context, input.email, input.role, getRequestIp(request)), { status: 201 }); } catch (error) { return apiError(error); } }
