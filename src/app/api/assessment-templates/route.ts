import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { assessmentTemplateInputSchema } from "@/modules/assessments/schemas";
import { createAssessmentTemplate, listAssessmentTemplates } from "@/modules/assessments/template-service";

export async function GET() { try { const context = await requireOrganizationContext("assessments:read"); return apiSuccess(await listAssessmentTemplates(context)); } catch (error) { return apiError(error); } }
export async function POST(request: Request) { try { assertSameOrigin(request); const context = await requireOrganizationContext("assessments:manage"); return apiSuccess(await createAssessmentTemplate(context, assessmentTemplateInputSchema.parse(await request.json()), getRequestIp(request)), { status: 201 }); } catch (error) { return apiError(error); } }
