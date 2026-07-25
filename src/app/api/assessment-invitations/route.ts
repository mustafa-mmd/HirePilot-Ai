import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { createAssessmentInvitation, listInvitationManagerData } from "@/modules/assessments/invitation-service";
import { assessmentInvitationInputSchema } from "@/modules/assessments/schemas";
import { requireOrganizationContext } from "@/modules/authorization/service";

export async function GET() { try { const context = await requireOrganizationContext("assessments:read"); return apiSuccess(await listInvitationManagerData(context)); } catch (error) { return apiError(error); } }
export async function POST(request: Request) { try { assertSameOrigin(request); const context = await requireOrganizationContext("assessments:manage"); return apiSuccess(await createAssessmentInvitation(context, assessmentInvitationInputSchema.parse(await request.json()), getRequestIp(request)), { status: 201 }); } catch (error) { return apiError(error); } }
