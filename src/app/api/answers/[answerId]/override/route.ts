import { apiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { requireOrganizationContext } from "@/modules/authorization/service";
import { overrideAnswerScore } from "@/modules/reports/evaluation-service";
import { scoreOverrideSchema } from "@/modules/reports/schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ answerId: string }> }) {
  try { assertSameOrigin(request); const context = await requireOrganizationContext("candidates:review"); const input = scoreOverrideSchema.parse(await request.json()); return apiSuccess(await overrideAnswerScore(context, (await params).answerId, input.score, input.reason, getRequestIp(request))); }
  catch (error) { return apiError(error); }
}
