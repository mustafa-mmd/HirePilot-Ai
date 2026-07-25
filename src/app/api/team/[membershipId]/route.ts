import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { membershipUpdateSchema } from "@/modules/team/schemas";
import { updateMembership } from "@/modules/team/service";

export async function PATCH(request: Request, { params }: { params: Promise<{ membershipId: string }> }) { try { assertSameOrigin(request); const context = await requireOrganizationContext("members:manage"); return apiSuccess(await updateMembership(context, (await params).membershipId, membershipUpdateSchema.parse(await request.json()), getRequestIp(request))); } catch (error) { return apiError(error); } }
