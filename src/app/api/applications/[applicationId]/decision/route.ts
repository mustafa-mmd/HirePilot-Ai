import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { recordHumanDecision } from "@/modules/reports/report-service";
import { humanDecisionSchema } from "@/modules/reports/schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  try { assertSameOrigin(request); const context = await requireOrganizationContext("candidates:review"); const input = humanDecisionSchema.parse(await request.json()); return apiSuccess(await recordHumanDecision(context, (await params).applicationId, input.decision, input.reason, getRequestIp(request))); }
  catch (error) { return apiError(error); }
}
