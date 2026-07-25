import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { deleteDraftAssessmentTemplate, getAssessmentTemplate, updateAssessmentTemplate } from "@/modules/assessments/template-service";

type RouteContext = { params: Promise<{ templateId: string }> };
export async function GET(_request: Request, { params }: RouteContext) { try { const context = await requireOrganizationContext("assessments:read"); return apiSuccess(await getAssessmentTemplate(context, (await params).templateId)); } catch (error) { return apiError(error); } }
export async function PATCH(request: Request, { params }: RouteContext) { try { assertSameOrigin(request); const context = await requireOrganizationContext("assessments:manage"); return apiSuccess(await updateAssessmentTemplate(context, (await params).templateId, await request.json(), getRequestIp(request))); } catch (error) { return apiError(error); } }
export async function DELETE(request: Request, { params }: RouteContext) { try { assertSameOrigin(request); const context = await requireOrganizationContext("assessments:manage"); await deleteDraftAssessmentTemplate(context, (await params).templateId, getRequestIp(request)); return apiSuccess({ deleted: true }); } catch (error) { return apiError(error); } }
